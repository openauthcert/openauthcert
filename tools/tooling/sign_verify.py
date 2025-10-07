#!/usr/bin/env python3
"""Utilities for signing and verifying OpenAuthCert badges."""

import argparse
import base64
import json
import pathlib
from typing import Any, Dict

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519
from nacl.signing import SigningKey


def _canonical_json(data: Dict[str, Any]) -> bytes:
    return json.dumps(data, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _load_public_key(pem_path: pathlib.Path) -> ed25519.Ed25519PublicKey:
    pem = pem_path.read_bytes()
    return serialization.load_pem_public_key(pem)


def _load_private_key_from_b64(path: pathlib.Path) -> SigningKey:
    raw_key = base64.b64decode(path.read_text().strip())
    if len(raw_key) != 32:
        raise ValueError("Private key must decode to 32 bytes for Ed25519")
    return SigningKey(raw_key)


def sign(badge_path: pathlib.Path, private_key_b64_path: pathlib.Path) -> None:
    badge = json.loads(badge_path.read_text())
    badge.pop("digital_signature", None)
    message = _canonical_json(badge)
    signing_key = _load_private_key_from_b64(private_key_b64_path)
    signature = signing_key.sign(message).signature
    badge["digital_signature"] = base64.b64encode(signature).decode("ascii")
    badge_path.write_text(json.dumps(badge, indent=2, sort_keys=True) + "\n")


def verify(badge_path: pathlib.Path, public_key_pem_path: pathlib.Path) -> None:
    badge = json.loads(badge_path.read_text())
    signature_b64 = badge.get("digital_signature")
    if not signature_b64:
        raise ValueError("Badge JSON is missing digital_signature")
    signature = base64.b64decode(signature_b64)
    badge_without_signature = dict(badge)
    badge_without_signature.pop("digital_signature", None)
    message = _canonical_json(badge_without_signature)
    public_key = _load_public_key(public_key_pem_path)
    public_key.verify(signature, message)


def main() -> None:
    parser = argparse.ArgumentParser(description="Sign or verify OpenAuthCert badges")
    subparsers = parser.add_subparsers(dest="command", required=True)

    sign_parser = subparsers.add_parser("sign", help="Sign a badge JSON in-place")
    sign_parser.add_argument("badge", type=pathlib.Path, help="Path to badge JSON file")
    sign_parser.add_argument(
        "private_key",
        type=pathlib.Path,
        help="Path to base64 encoded 32-byte Ed25519 private key",
    )

    verify_parser = subparsers.add_parser("verify", help="Verify a badge JSON signature")
    verify_parser.add_argument("badge", type=pathlib.Path, help="Path to badge JSON file")
    verify_parser.add_argument(
        "public_key",
        type=pathlib.Path,
        help="Path to PEM encoded Ed25519 public key",
    )

    args = parser.parse_args()
    if args.command == "sign":
        sign(args.badge, args.private_key)
    elif args.command == "verify":
        verify(args.badge, args.public_key)


if __name__ == "__main__":
    main()
