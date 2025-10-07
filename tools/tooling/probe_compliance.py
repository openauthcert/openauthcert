#!/usr/bin/env python3
"""Placeholder compliance probe script.

The MVP implementation records stub results for each certified badge so that
workflows can be wired end-to-end. Real deployments should replace this module
with live protocol checks.
"""

import argparse
import datetime as dt
import json
import pathlib
from typing import Dict, Iterable

def load_badges(registry: pathlib.Path) -> Iterable[Dict[str, object]]:
    for path in sorted(registry.glob('*.json')):
        if path.name == 'vendors.json':
            continue
        with path.open() as handle:
            yield json.load(handle)

def write_stub_evidence(base: pathlib.Path, badge: Dict[str, object]) -> None:
    vendor = badge['vendor']
    application = badge['application']
    version = badge['version']
    today = dt.datetime.utcnow().strftime('%Y%m%d')
    evidence_dir = base / vendor / application / version / today
    evidence_dir.mkdir(parents=True, exist_ok=True)

    summary = {
        'vendor': vendor,
        'application': application,
        'version': version,
        'timestamp': dt.datetime.utcnow().isoformat() + 'Z',
        'http': {'documentation': 200},
        'oidc': {'well_known': True, 'auth_code_flow': 'stub'},
        'saml': {'metadata': 'stub'},
        'ldap': {'starttls': 'stub'},
        'ui': {'paywall_detected': False},
        'result': 'pass',
    }
    (evidence_dir / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    (evidence_dir / 'README.md').write_text(
        '# Compliance Probe\n\n'
        'This is a placeholder compliance result generated during development.'
        ' Replace with real probe outputs in production.\n'
    )

def main() -> None:
    parser = argparse.ArgumentParser(description='Record stub compliance results')
    parser.add_argument('registry', type=pathlib.Path)
    parser.add_argument('output', type=pathlib.Path)
    args = parser.parse_args()

    for badge in load_badges(args.registry):
        if badge.get('status') != 'certified':
            continue
        write_stub_evidence(args.output, badge)

if __name__ == '__main__':
    main()
