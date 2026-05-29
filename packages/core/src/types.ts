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

export interface Badge {
  vendor: string;
  application: string;
  version: string;
  badge_type: BadgeType;
  status: BadgeStatus;
  issued_at: string;
  revoked_at?: string;
  evidence_urls?: string[];
  notes?: string;
  digital_signature: string;
}
