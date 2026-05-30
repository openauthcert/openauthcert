/**
 * Certification lifecycle helpers. Pure — safe to import in the browser.
 *
 * A badge's stored `status` is a signed, point-in-time attestation. Expiry,
 * however, is intrinsic and time-based (like a TLS certificate): a correctly
 * signed `certified` badge is reported as "expired" once `expires_at` passes,
 * with no re-signing required. Revocation remains an explicit signed status.
 */
import type { Badge, EffectiveStatus } from "./types.js";

/** Default certification validity window applied at issue/sign time. */
export const DEFAULT_VALIDITY_MONTHS = 12;

/** True when `expires_at` is in the past relative to `now` (ms epoch). */
export function isExpired(
  badge: Pick<Badge, "expires_at">,
  now: number = Date.now(),
): boolean {
  if (!badge.expires_at) return false;
  const expiry = Date.parse(badge.expires_at);
  return Number.isFinite(expiry) && now >= expiry;
}

/**
 * The lifecycle state to display/enforce: revocation wins, then expiry of an
 * otherwise-certified badge, otherwise the stored status.
 */
export function effectiveStatus(
  badge: Pick<Badge, "status" | "expires_at" | "revoked_at">,
  now: number = Date.now(),
): EffectiveStatus {
  if (badge.status === "revoked") return "revoked";
  if (badge.status === "certified" && isExpired(badge, now)) return "expired";
  return badge.status;
}

/** A badge currently conferring certification: certified and not yet expired. */
export function isCurrentlyCertified(
  badge: Pick<Badge, "status" | "expires_at" | "revoked_at">,
  now: number = Date.now(),
): boolean {
  return effectiveStatus(badge, now) === "certified";
}

/**
 * Compute an RFC 3339 expiry `months` after the given ISO instant, normalized
 * to a trailing "Z" (UTC) like the rest of the badge timestamps.
 */
export function addMonthsIso(iso: string, months: number): string {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
