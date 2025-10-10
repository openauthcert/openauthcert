from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import json, base64, pathlib, os
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519

REG_ROOT = pathlib.Path(__file__).resolve().parents[2] / "registry" / "badge-registry"
PUB_KEY_PEM = os.getenv("OAC_PUBLIC_KEY_PEM_PATH", "/run/secrets/oac_public_key.pem")
PRIV_KEY_B64 = os.getenv("OAC_PRIVATE_KEY_B64")  # base64 raw 32 bytes
ADMIN_TOKEN = os.getenv("OAC_ADMIN_TOKEN")       # gate for issue/revoke

class Badge(BaseModel):
    vendor: str
    application: str
    version: str
    badge_type: str
    status: str
    issued_at: str
    revoked_at: Optional[str] = None
    evidence_urls: Optional[List[str]] = None
    notes: Optional[str] = None
    digital_signature: str = ""

def _canonical(d: dict) -> bytes:
    return json.dumps(d, sort_keys=True, separators=(",", ":")).encode()

def _priv():
    if not PRIV_KEY_B64: raise RuntimeError("missing OAC_PRIVATE_KEY_B64")
    return ed25519.Ed25519PrivateKey.from_private_bytes(base64.b64decode(PRIV_KEY_B64))

def _pub():
    return serialization.load_pem_public_key(pathlib.Path(PUB_KEY_PEM).read_bytes())

def _path(b: Badge) -> pathlib.Path:
    return REG_ROOT / b.vendor / b.application / f"{b.version}.json"

def _require_admin(token: Optional[str]):
    if not ADMIN_TOKEN or token != ADMIN_TOKEN:
        raise HTTPException(401, "unauthorized")

app = FastAPI(title="OpenAuthCert Badge Server")

@app.get("/badges")
def list_badges():
    items = []
    if REG_ROOT.exists():
        for p in REG_ROOT.rglob("*.json"):
            items.append(json.loads(p.read_text()))
    return {"count": len(items), "items": items}

@app.get("/badges/{vendor}/{application}")
def app_badges(vendor: str, application: str):
    base = REG_ROOT / vendor / application
    if not base.exists(): return {"count": 0, "items": []}
    items = [json.loads(p.read_text()) for p in sorted(base.glob("*.json"))]
    return {"count": len(items), "items": items}

@app.post("/issue")
def issue(badge: Badge, authorization: Optional[str] = Header(None)):
    _require_admin(authorization)
    if badge.status not in {"certified", "pending"}:
        raise HTTPException(400, "status must be certified or pending on issue")
    if not badge.issued_at:
        badge.issued_at = datetime.now(timezone.utc).isoformat().replace("+00:00","Z")
    data = badge.model_dump()
    data.pop("digital_signature", None)
    sig = _priv().sign(_canonical(data))
    badge.digital_signature = base64.b64encode(sig).decode()
    out = _path(badge)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(badge.model_dump(), indent=2))
    return {"ok": True, "path": str(out.relative_to(REG_ROOT))}

@app.post("/revoke/{vendor}/{application}/{version}")
def revoke(vendor: str, application: str, version: str, authorization: Optional[str] = Header(None)):
    _require_admin(authorization)
    path = REG_ROOT / vendor / application / f"{version}.json"
    if not path.exists(): raise HTTPException(404, "not found")
    badge = json.loads(path.read_text())
    badge["status"] = "revoked"
    badge["revoked_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00","Z")
    data = {k:v for k,v in badge.items() if k != "digital_signature"}
    sig = _priv().sign(_canonical(data))
    badge["digital_signature"] = base64.b64encode(sig).decode()
    path.write_text(json.dumps(badge, indent=2))
    return {"ok": True}

@app.post("/verify")
def verify(badge: Badge):
    data = {k:v for k,v in badge.model_dump().items() if k != "digital_signature"}
    sig = base64.b64decode(badge.digital_signature)
    _pub().verify(sig, _canonical(data))
    return {"valid": True}
