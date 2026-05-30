/**
 * Live compliance probing.
 *
 * For every currently-certified badge, re-tests the endpoints declared in its
 * `checks` block to confirm the vendor still offers the certified feature for
 * free. Results are written as dated evidence; a per-badge consecutive-failure
 * counter is persisted so a vendor is only flagged for revocation after several
 * failures in a row (guarding against transient outages).
 *
 * Network access is injectable so the orchestration can be unit-tested without
 * real I/O.
 */
import { connect } from "node:net";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { effectiveStatus, type Badge } from "@openauthcert/core";
import { walkRegistry } from "./registry.js";

export const DEFAULT_REVOKE_THRESHOLD = 3;

export interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

export interface BadgeProbeResult {
  slug: string;
  vendor: string;
  application: string;
  version: string;
  timestamp: string;
  checks: CheckResult[];
  /** pass = all defined checks ok; fail = at least one failed; skip = none declared. */
  result: "pass" | "fail" | "skip";
}

export interface ProbeStateEntry {
  consecutiveFailures: number;
  lastResult: string;
  lastChecked: string;
}

export type ProbeState = Record<string, ProbeStateEntry>;

export interface FetchResult {
  status: number;
  text: string;
}
export type Fetcher = (url: string) => Promise<FetchResult>;
export type TcpProbe = (host: string, port: number) => Promise<boolean>;

export interface ProbeDeps {
  fetcher?: Fetcher;
  tcp?: TcpProbe;
}

const REQUEST_TIMEOUT_MS = 10_000;
const TCP_TIMEOUT_MS = 8_000;

/** Language that suggests a previously-free feature moved behind a paywall. */
const PAYWALL_RE =
  /(upgrade to|enterprise plan|contact sales|paid plan|premium plan|behind a paywall|paid add-?on)/i;

export const defaultFetcher: Fetcher = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    const text = await res.text().catch(() => "");
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
};

export const defaultTcpProbe: TcpProbe = (host, port) =>
  new Promise((resolve) => {
    const socket = connect({ host, port });
    const finish = (ok: boolean): void => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(TCP_TIMEOUT_MS);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });

/** Run every declared check for one badge and aggregate a pass/fail/skip result. */
export async function probeBadge(
  badge: Badge,
  deps: ProbeDeps = {},
): Promise<BadgeProbeResult> {
  const fetcher = deps.fetcher ?? defaultFetcher;
  const tcp = deps.tcp ?? defaultTcpProbe;
  const checks: CheckResult[] = [];
  const c = badge.checks ?? {};

  if (c.oidc_discovery) {
    checks.push(
      await guard("oidc", async () => {
        const { status, text } = await fetcher(c.oidc_discovery!);
        const ok =
          status === 200 &&
          /"issuer"/.test(text) &&
          /"authorization_endpoint"/.test(text);
        return { ok, detail: ok ? "discovery document reachable" : `status ${status}` };
      }),
    );
  }
  if (c.saml_metadata) {
    checks.push(
      await guard("saml", async () => {
        const { status, text } = await fetcher(c.saml_metadata!);
        const ok = status === 200 && /EntityDescriptor/.test(text);
        return { ok, detail: ok ? "metadata reachable" : `status ${status}` };
      }),
    );
  }
  if (c.ldap) {
    const [host, portStr] = c.ldap.split(":");
    const port = Number(portStr ?? "389");
    const ok = host ? await tcp(host, port) : false;
    checks.push({
      name: "ldap",
      ok,
      detail: ok ? "tcp reachable" : `cannot reach ${c.ldap}`,
    });
  }
  if (c.docs) {
    checks.push(
      await guard("docs", async () => {
        const { status, text } = await fetcher(c.docs!);
        const paywalled = PAYWALL_RE.test(text);
        const ok = status === 200 && !paywalled;
        return {
          ok,
          detail: ok
            ? "reachable, no paywall language"
            : paywalled
              ? "paywall language detected"
              : `status ${status}`,
        };
      }),
    );
  }

  const result: BadgeProbeResult["result"] =
    checks.length === 0 ? "skip" : checks.every((x) => x.ok) ? "pass" : "fail";

  return {
    slug: `${badge.vendor}/${badge.application}/${badge.version}`,
    vendor: badge.vendor,
    application: badge.application,
    version: badge.version,
    timestamp: new Date().toISOString(),
    checks,
    result,
  };
}

async function guard(
  name: string,
  fn: () => Promise<{ ok: boolean; detail: string }>,
): Promise<CheckResult> {
  try {
    const { ok, detail } = await fn();
    return { name, ok, detail };
  } catch (err) {
    return { name, ok: false, detail: `error: ${String(err)}` };
  }
}

/** Advance a badge's failure counter: increment on fail, reset on pass/skip. */
export function updateState(
  state: ProbeState,
  result: BadgeProbeResult,
): ProbeStateEntry {
  const prev = state[result.slug]?.consecutiveFailures ?? 0;
  const consecutiveFailures = result.result === "fail" ? prev + 1 : 0;
  const entry: ProbeStateEntry = {
    consecutiveFailures,
    lastResult: result.result,
    lastChecked: result.timestamp,
  };
  state[result.slug] = entry;
  return entry;
}

export interface RunProbeOptions {
  registry: string;
  out: string;
  statePath: string;
  threshold?: number;
  now?: number;
  deps?: ProbeDeps;
}

export interface RunProbeOutcome {
  results: BadgeProbeResult[];
  state: ProbeState;
  /** Slugs that have now failed `threshold` times in a row → revoke. */
  toRevoke: string[];
}

/**
 * Probe every currently-certified badge, write dated evidence + updated state,
 * and return the slugs that crossed the revocation threshold.
 */
export async function runProbe(opts: RunProbeOptions): Promise<RunProbeOutcome> {
  const threshold = opts.threshold ?? DEFAULT_REVOKE_THRESHOLD;
  const now = opts.now ?? Date.now();
  const day = new Date(now).toISOString().slice(0, 10).replace(/-/g, "");
  const state: ProbeState = existsSync(opts.statePath)
    ? (JSON.parse(readFileSync(opts.statePath, "utf8")) as ProbeState)
    : {};

  const results: BadgeProbeResult[] = [];
  const toRevoke: string[] = [];

  for (const { badge } of walkRegistry(opts.registry)) {
    // Only probe badges that currently confer certification.
    if (effectiveStatus(badge, now) !== "certified") continue;

    const result = await probeBadge(badge, opts.deps);
    results.push(result);

    const dir = join(opts.out, badge.vendor, badge.application, badge.version, day);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "summary.json"), JSON.stringify(result, null, 2) + "\n");

    const entry = updateState(state, result);
    if (entry.consecutiveFailures >= threshold) toRevoke.push(result.slug);
  }

  mkdirSync(dirname(opts.statePath), { recursive: true });
  writeFileSync(opts.statePath, JSON.stringify(state, null, 2) + "\n");

  return { results, state, toRevoke };
}
