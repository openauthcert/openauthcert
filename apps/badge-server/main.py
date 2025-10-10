"""FastAPI application for issuing, revoking, and verifying OpenAuthCert badges."""

import base64
import datetime as dt
import json
import os
from typing import Dict, List, Optional, Literal

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519
from fastapi import FastAPI, HTTPException
from nacl.signing import SigningKey
from pydantic import BaseModel, Field, HttpUrl


def _utcnow() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def _canonical_json(payload: Dict[str, object]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _load_signing_key() -> SigningKey:
    private_b64 = os.getenv("OAC_PRIVATE_KEY_B64")
    if not private_b64:
        raise RuntimeError("OAC_PRIVATE_KEY_B64 environment variable is not set")
    raw_key = base64.b64decode(private_b64)
    if len(raw_key) != 32:
        raise RuntimeError("OAC_PRIVATE_KEY_B64 must decode to 32 bytes")
    return SigningKey(raw_key)


def _load_verification_key() -> ed25519.Ed25519PublicKey:
    public_pem = os.getenv("OAC_PUBLIC_KEY_PEM")
    if not public_pem:
        raise RuntimeError("OAC_PUBLIC_KEY_PEM environment variable is not set")
    return serialization.load_pem_public_key(public_pem.encode("utf-8"))


class BadgeIn(BaseModel):
    vendor: str = Field(..., min_length=1)
    application: str = Field(..., min_length=1)
    version: str = Field(..., min_length=1)
    badge_type: Literal[
        "free-sso-idp",
        "free-ldap-support",
        "free-oidc-support",
        "free-saml-support",
        "multi-idp-ready",
    ]
    status: Literal["certified", "pending", "revoked", "denied"]
    issued_at: Optional[str] = None
    revoked_at: Optional[str] = None
    evidence_urls: Optional[List[HttpUrl]] = None
    notes: Optional[str] = None


class Badge(BadgeIn):
    digital_signature: str


class RevokeRequest(BaseModel):
    vendor: str
    application: str
    version: str
    notes: Optional[str] = None


BADGE_STORE: Dict[str, Badge] = {}

app = FastAPI(title="OpenAuthCert Badge Service", version="1.0.0")


def _badge_key(vendor: str, application: str, version: str) -> str:
    return f"{vendor}:{application}:{version}"


def _sign_badge(data: Dict[str, object]) -> str:
    signing_key = _load_signing_key()
    payload = dict(data)
    payload.pop("digital_signature", None)
    message = _canonical_json(payload)
    signature = signing_key.sign(message).signature
    return base64.b64encode(signature).decode("ascii")


def _verify_badge(badge: Dict[str, object]) -> None:
    signature_b64 = badge.get("digital_signature")
    if not isinstance(signature_b64, str):
        raise HTTPException(status_code=400, detail="digital_signature is required")
    try:
        signature = base64.b64decode(signature_b64)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="digital_signature must be base64") from exc
    payload = dict(badge)
    payload.pop("digital_signature", None)
    message = _canonical_json(payload)
    verify_key = _load_verification_key()
    try:
        verify_key.verify(signature, message)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Signature verification failed") from exc


@app.get("/badges", response_model=List[Badge])
async def list_badges() -> List[Badge]:
    return list(BADGE_STORE.values())


@app.post("/issue", response_model=Badge)
async def issue_badge(badge_in: BadgeIn) -> Badge:
    """
    Issue a new badge by signing the badge payload, storing it, and returning the signed Badge.
    
    Parameters:
        badge_in: Input badge data; if `issued_at` is not provided it will be set to the current UTC time. If `status` is "revoked", `revoked_at` must be present.
    
    Returns:
        The created Badge including a base64-encoded `digital_signature`.
    
    Raises:
        HTTPException: If `status` is "revoked" but `revoked_at` is not provided (status code 400).
    """
    if badge_in.status == "revoked" and not badge_in.revoked_at:
        raise HTTPException(status_code=400, detail="revoked_at required when status is revoked")
    issued_at = badge_in.issued_at or _utcnow()
    payload: Dict[str, object] = badge_in.model_dump(mode="json")
    payload["issued_at"] = issued_at
    signature = _sign_badge(payload)
    badge = Badge(**payload, digital_signature=signature)
    key = _badge_key(badge.vendor, badge.application, badge.version)
    BADGE_STORE[key] = badge
    return badge


@app.post("/verify", response_model=Badge)
async def verify_badge(badge: Badge) -> Badge:
    """
    Validate the digital signature on a Badge.
    
    Parameters:
        badge (Badge): Badge object containing the signed payload and `digital_signature`.
    
    Returns:
        Badge: The same `badge` instance if the signature is valid.
    
    Raises:
        fastapi.HTTPException: If the badge is missing or has an invalid `digital_signature`.
    """
    _verify_badge(badge.model_dump(mode="json"))
    return badge


@app.post("/revoke", response_model=Badge)
async def revoke_badge(request: RevokeRequest) -> Badge:
    """
    Revoke a previously issued badge identified by vendor, application, and version.
    
    Parameters:
        request (RevokeRequest): Identifies the badge to revoke (vendor, application, version) and may include optional `notes` to attach to the revoked badge.
    
    Returns:
        Badge: The updated badge with `status` set to "revoked", `revoked_at` set to the current UTC timestamp, any provided `notes` applied, and a newly generated `digital_signature`.
    
    Raises:
        HTTPException: Raises with status code 404 if the specified badge does not exist.
    
    Side effects:
        Updates the in-memory BADGE_STORE with the revoked badge.
    """
    key = _badge_key(request.vendor, request.application, request.version)
    existing = BADGE_STORE.get(key)
    if not existing:
        raise HTTPException(status_code=404, detail="Badge not found")
    payload = existing.model_dump(mode="json")
    payload["status"] = "revoked"
    payload["revoked_at"] = _utcnow()
    if request.notes:
        payload["notes"] = request.notes
    payload.pop("digital_signature", None)
    signature = _sign_badge(payload)
    revoked_badge = Badge(**payload, digital_signature=signature)
    BADGE_STORE[key] = revoked_badge
    return revoked_badge