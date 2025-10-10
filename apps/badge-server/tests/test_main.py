import base64
import importlib.util
import os
from pathlib import Path

from fastapi.testclient import TestClient

MODULE_PATH = Path(__file__).resolve().parents[1] / "main.py"
spec = importlib.util.spec_from_file_location("badge_server_app", MODULE_PATH)
badge_module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(badge_module)

app = badge_module.app
BADGE_STORE = badge_module.BADGE_STORE

PRIVATE_KEY_B64 = "JzIhFLQf91zXIipEl6IHQW55Ey7RHG1PKjPSLZFSccE="
PUBLIC_KEY_PEM = Path(__file__).resolve().parents[3] / "specs" / "badge-spec" / "public.pem"


def setup_module() -> None:  # noqa: D401
    os.environ["OAC_PRIVATE_KEY_B64"] = PRIVATE_KEY_B64
    os.environ["OAC_PUBLIC_KEY_PEM"] = PUBLIC_KEY_PEM.read_text()


def teardown_module() -> None:  # noqa: D401
    BADGE_STORE.clear()


def _issue_payload() -> dict:
    return {
        "vendor": "acme-cloud",
        "application": "cloud-sso",
        "version": "1.0.1",
        "badge_type": "free-oidc-support",
        "status": "certified",
        "issued_at": "2024-05-02T00:00:00Z",
    }


def test_issue_badge() -> None:
    client = TestClient(app)
    response = client.post("/issue", json=_issue_payload())
    assert response.status_code == 200
    data = response.json()
    assert "digital_signature" in data
    assert base64.b64decode(data["digital_signature"])  # signature decodes


def test_issue_badge_with_evidence_urls() -> None:
    client = TestClient(app)
    payload = _issue_payload()
    payload["evidence_urls"] = [
        "https://example.com/evidence-1",
        "https://example.com/evidence-2",
    ]
    response = client.post("/issue", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["evidence_urls"] == payload["evidence_urls"]

    verify_response = client.post("/verify", json=data)
    assert verify_response.status_code == 200


def test_verify_and_revoke() -> None:
    client = TestClient(app)
    issue_response = client.post("/issue", json=_issue_payload())
    badge = issue_response.json()

    verify_response = client.post("/verify", json=badge)
    assert verify_response.status_code == 200

    revoke_response = client.post(
        "/revoke",
        json={
            "vendor": badge["vendor"],
            "application": badge["application"],
            "version": badge["version"],
            "notes": "Regressed OIDC endpoint",
        },
    )
    assert revoke_response.status_code == 200
    revoked = revoke_response.json()
    assert revoked["status"] == "revoked"
    assert "revoked_at" in revoked


def test_revoke_badge_preserves_evidence_urls() -> None:
    """
    Verifies that evidence URLs included when issuing a badge are preserved after revocation and that the revoked badge still verifies.
    
    Issues a badge with two `evidence_urls`, revokes it using its identifiers, asserts the revoked response retains the same `evidence_urls`, and confirms verification of the revoked badge succeeds.
    """
    client = TestClient(app)
    payload = _issue_payload()
    payload["evidence_urls"] = [
        "https://example.com/evidence-1",
        "https://example.com/evidence-2",
    ]

    issue_response = client.post("/issue", json=payload)
    badge = issue_response.json()

    revoke_response = client.post(
        "/revoke",
        json={
            "vendor": badge["vendor"],
            "application": badge["application"],
            "version": badge["version"],
        },
    )
    assert revoke_response.status_code == 200
    revoked = revoke_response.json()
    assert revoked["evidence_urls"] == payload["evidence_urls"]

    verify_response = client.post("/verify", json=revoked)
    assert verify_response.status_code == 200