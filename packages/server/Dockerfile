# Multi-stage build for the OpenAuthCert badge server.
FROM node:26-slim AS builder
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# Copy workspace manifests first for layer caching.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
RUN pnpm install --frozen-lockfile --filter @openauthcert/server...

# Build core + server, then produce a pruned production deploy.
COPY packages/core packages/core
COPY packages/server packages/server
COPY specs specs
RUN pnpm --filter @openauthcert/server... build \
  && pnpm deploy --filter @openauthcert/server --prod /app

FROM node:26-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app /app
# The schema is embedded into core at build time. The public key is still read
# at runtime; ship it at the server's default path. Override with
# OAC_PUBLIC_KEY_PEM / OAC_PUBLIC_KEY_PEM_PATH in production if preferred.
COPY --from=builder /repo/specs/badge-spec/public.pem /app/specs/badge-spec/public.pem
# Provide the registry path via OAC_REGISTRY_ROOT or mount it as a volume.
ENV OAC_REGISTRY_ROOT=/app/registry/badge-registry
EXPOSE 8080
CMD ["node", "dist/index.js"]
