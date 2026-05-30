/** Badge types and enums. Pure — safe to import in the browser. */

export const BADGE_TYPES = [
  "free-sso-idp",
  "free-ldap-support",
  "free-oidc-support",
  "free-saml-support",
  "multi-idp-ready",
] as const;

export type BadgeType = (typeof BADGE_TYPES)[number];

export const BADGE_STATUSES = [
  "certified",
  "pending",
  "revoked",
  "denied",
] as const;

export type BadgeStatus = (typeof BADGE_STATUSES)[number];

/** Live endpoints the compliance probe re-tests. All optional. */
export interface BadgeChecks {
  oidc_discovery?: string;
  saml_metadata?: string;
  ldap?: string;
  docs?: string;
}

export interface Badge {
  vendor: string;
  application: string;
  version: string;
  badge_type: BadgeType;
  status: BadgeStatus;
  issued_at: string;
  /** Certification lapses after this instant (RFC 3339 date-time). */
  expires_at: string;
  revoked_at?: string;
  evidence_urls?: string[];
  checks?: BadgeChecks;
  notes?: string;
  digital_signature: string;
}

/**
 * The lifecycle state actually shown to consumers. Unlike the stored
 * `status`, "expired" is computed from `expires_at` (no re-signing needed),
 * mirroring how a TLS certificate expires intrinsically.
 */
export type EffectiveStatus =
  | "certified"
  | "expired"
  | "revoked"
  | "pending"
  | "denied";
