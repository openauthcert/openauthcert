#!/usr/bin/env python3
import argparse, json, pathlib, base64, sys
from jsonschema import validate
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.exceptions import InvalidSignature

def canonical(d): return json.dumps(d, sort_keys=True, separators=(",",":")).encode()

def main():
  ap = argparse.ArgumentParser()
  ap.add_argument("registry_dir")
  ap.add_argument("schema_path")
  ap.add_argument("public_key_pem")
  args = ap.parse_args()

  schema = json.loads(pathlib.Path(args.schema_path).read_text())
  pub = serialization.load_pem_public_key(pathlib.Path(args.public_key_pem).read_bytes())

  bad = False
  for p in pathlib.Path(args.registry_dir).rglob("*.json"):
    data = json.loads(p.read_text())
    try:
      validate(data, schema)
    except Exception as e:
      print(f"Schema error: {p}: {e}"); bad = True; continue
    body = {k:v for k,v in data.items() if k!="digital_signature"}
    sig_b64 = data.get("digital_signature","")
    try:
      pub.verify(base64.b64decode(sig_b64), canonical(body))
    except InvalidSignature:
      print(f"Signature invalid: {p}"); bad = True
  sys.exit(1 if bad else 0)

if __name__ == "__main__": main()
