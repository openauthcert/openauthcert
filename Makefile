.PHONY: install build test validate sign verify keygen site-dev site-build server

install:
	pnpm install

build:
	pnpm -r --filter "./packages/*" build

test:
	pnpm -r --filter "./packages/*" test

# Validate the whole registry (schema + signature + path consistency).
validate:
	node packages/cli/dist/cli.js validate --pub specs/badge-spec/public.pem

# make sign BADGE=registry/badge-registry/<vendor>/<app>/<version>.json SEED=/path/to/seed.b64
sign:
	@if [ -z "$(BADGE)" ] || [ -z "$(SEED)" ]; then echo "Usage: make sign BADGE=path SEED=seed.b64"; exit 1; fi
	node packages/cli/dist/cli.js sign $(BADGE) --seed-b64 @$(SEED)

# make verify BADGE=path
verify:
	@if [ -z "$(BADGE)" ]; then echo "Usage: make verify BADGE=path"; exit 1; fi
	node packages/cli/dist/cli.js verify $(BADGE) --pub specs/badge-spec/public.pem

keygen:
	node packages/cli/dist/cli.js keygen

site-dev:
	pnpm --filter openauthcert-site dev

site-build:
	pnpm --filter openauthcert-site build

server:
	pnpm --filter @openauthcert/server start
