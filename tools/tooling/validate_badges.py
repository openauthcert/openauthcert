#!/usr/bin/env python3
"""Validate badge registry entries against the schema and digital signature."""

import argparse
import base64
import json
import pathlib
from typing import Iterable

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519
from jsonschema import Draft202012Validator


def _canonical_json(data: dict) -> bytes:
    return json.dumps(data, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _load_public_key(pem_path: pathlib.Path) -> ed25519.Ed25519PublicKey:
    pem = pem_path.read_bytes()
    return serialization.load_pem_public_key(pem)


def iter_badge_files(directory: pathlib.Path) -> Iterable[pathlib.Path]:
    for path in sorted(directory.rglob("*.json")):
        if path.name == "vendors.json":
            continue
        yield path


def load_schema(schema_path: pathlib.Path) -> Draft202012Validator:
    schema = json.loads(schema_path.read_text())
    return Draft202012Validator(schema)


def validate_badge(path: pathlib.Path, validator: Draft202012Validator, public_key_path: pathlib.Path) -> None:
    badge = json.loads(path.read_text())
    validator.validate(badge)
    signature_b64 = badge.get("digital_signature")
    if not signature_b64:
        raise ValueError(f"{path} missing digital_signature")
    signature = base64.b64decode(signature_b64)
    badge_without_signature = dict(badge)
    badge_without_signature.pop("digital_signature", None)
    message = _canonical_json(badge_without_signature)
    public_key = _load_public_key(public_key_path)
    public_key.verify(signature, message)


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate OpenAuthCert badge registry")
    parser.add_argument("registry", type=pathlib.Path, help="Path to registry directory")
    parser.add_argument("schema", type=pathlib.Path, help="Path to JSON schema")
    parser.add_argument("public_key", type=pathlib.Path, help="Path to PEM public key")
    args = parser.parse_args()

    validator = load_schema(args.schema)
    errors = []
    for badge_file in iter_badge_files(args.registry):
        try:
            validate_badge(badge_file, validator, args.public_key)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{badge_file}: {exc}")

    if errors:
        for error in errors:
            print(error)
        raise SystemExit(1)


def _entrypoint() -> None:
    main()


if __name__ == "__main__":
    _entrypoint()
