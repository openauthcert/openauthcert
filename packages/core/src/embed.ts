/**
 * Embed URL helpers for the status badge / click-to-registry widget. Pure —
 * safe to import in the browser. Kept in core so the website components and the
 * standalone embed.js (which mirrors these strings) stay consistent.
 */
import type { Badge } from "./types.js";

type BadgeSlugParts = Pick<Badge, "vendor" | "application" | "version">;

/** Site-root path of a badge's status SVG, e.g. `/badges/acme/cloud-sso/1.0.0.svg`. */
export function statusSvgPath(b: BadgeSlugParts): string {
  return `/badges/${encodeURIComponent(b.vendor)}/${encodeURIComponent(
    b.application,
  )}/${encodeURIComponent(b.version)}.svg`;
}

/**
 * Deep link to the registry pre-filtered to this badge's vendor + application.
 * The registry page hydrates these query params on load (RegistryFilters runs
 * its route watcher with `immediate: true`).
 */
export function registryDeepLink(
  b: Pick<Badge, "vendor" | "application">,
  siteUrl = "https://openauthcert.org",
): string {
  const base = siteUrl.replace(/\/+$/, "");
  const q = new URLSearchParams({ vendor: b.vendor, app: b.application });
  return `${base}/registry?${q.toString()}`;
}

/** Absolute URL of a badge's status SVG. */
export function statusSvgUrl(
  b: BadgeSlugParts,
  siteUrl = "https://openauthcert.org",
): string {
  return `${siteUrl.replace(/\/+$/, "")}${statusSvgPath(b)}`;
}
