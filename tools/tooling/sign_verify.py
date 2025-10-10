#!/usr/bin/env python3
import argparse, base64, json, pathlib, sys
from cryptography.hazmat.primitives.asymmetric import ed25519

def canonical(obj): return json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()

def load_private_key_b64(path):
  raw = pathlib.Path(path).read_text().strip()
  return ed25519.Ed25519PrivateKey.from_private_bytes(base64.b64decode(raw))

def load_public_key_pem(path):
  pem = pathlib.Path(path).read_bytes()
  from cryptography.hazmat.primitives import serialization
  return serialization.load_pem_public_key(pem)

def sign(badge_path, priv_b64_path):
  badge = json.loads(pathlib.Path(badge_path).read_text())
  body = {k:v for k,v in badge.items() if k != "digital_signature"}
  key = load_private_key_b64(priv_b64_path)
  sig = key.sign(canonical(body))
  badge["digital_signature"] = base64.b64encode(sig).decode()
  pathlib.Path(badge_path).write_text(json.dumps(badge, indent=2))
  print("signed")

def verify(badge_path, pub_pem_path):
  badge = json.loads(pathlib.Path(badge_path).read_text())
  sig_b64 = badge.get("digital_signature")
  if not sig_b64: print("missing signature"); sys.exit(2)
  body = {k:v for k,v in badge.items() if k != "digital_signature"}
  from cryptography.exceptions import InvalidSignature
  try:
    load_public_key_pem(pub_pem_path).verify(base64.b64decode(sig_b64), canonical(body))
    print("valid")
  except InvalidSignature:
    print("invalid"); sys.exit(1)

if __name__ == "__main__":
  ap = argparse.ArgumentParser()
  sub = ap.add_subparsers(dest="cmd", required=True)
  s = sub.add_parser("sign"); s.add_argument("badge"); s.add_argument("priv_raw_b64")
  v = sub.add_parser("verify"); v.add_argument("badge"); v.add_argument("pub_pem")
  args = ap.parse_args()
  if args.cmd == "sign": sign(args.badge, args.priv_raw_b64)
  else: verify(args.badge, args.pub_pem)
