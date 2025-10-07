.PHONY: sign verify run-server dev-website

sign:
	@if [ -z "$(BADGE)" ] || [ -z "$(PRIV)" ]; then \
		echo "Usage: make sign BADGE=path PRIV=/path/to/private.b64"; \
		exit 1; \
	fi
	python tools/tooling/sign_verify.py sign $(BADGE) $(PRIV)

verify:
	@if [ -z "$(BADGE)" ] || [ -z "$(PUB)" ]; then \
		echo "Usage: make verify BADGE=path PUB=/path/to/public.pem"; \
		exit 1; \
	fi
	python tools/tooling/sign_verify.py verify $(BADGE) $(PUB)

run-server:
	uvicorn apps.badge-server.main:app --reload

dev-website:
	npm run dev --prefix website
