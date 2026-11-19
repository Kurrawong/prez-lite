# syntax=docker/dockerfile:1
#
# prez-lite: a static SKOS vocabulary browser in one container.
#
# The image holds the pre-built prez-lite site (served by nginx) and the
# TTL → JSON processing pipeline (Node.js). When the container starts, the
# vocabularies in /data are processed and the site is served on port 8080.
#
#   docker build -t prez-lite .
#   docker run --rm -p 8080:8080 -v "$PWD/data:/data:ro" prez-lite
#
# See docs/5-technical/docker.md for configuration and custom images.

ARG NODE_VERSION=22

# -----------------------------------------------------------------------------
# Stage 1: build the static site and assemble the processing pipeline.
#
# Runs on the build host's own platform: everything it produces is
# platform-independent (static files and pure-JS packages), so multi-arch
# builds don't have to run Nuxt under emulation.
# -----------------------------------------------------------------------------
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-alpine AS build

ENV CI=true \
    NUXT_TELEMETRY_DISABLED=1 \
    npm_config_store_dir=/pnpm/store
WORKDIR /app

# Install the pnpm version pinned by the root package.json "packageManager" field
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN npm install --global --no-fund --no-audit \
      "$(node -p "require('./package.json').packageManager")"

# Download every package in the lockfile. This layer only changes when the
# lockfile does, so source edits don't trigger a full re-download.
RUN pnpm fetch

COPY . .
RUN pnpm install --offline --frozen-lockfile \
      --filter "@prez-lite/web..." \
      --filter "@prez-lite/web-components..." \
      --filter "@prez-lite/data-processing..."

# Standalone processing pipeline: scripts + exact-version runtime dependencies only
RUN node docker/build-processor.mjs /app /opt/prez-lite/processor \
 && cd /opt/prez-lite/processor \
 && npm install --omit=dev --no-fund --no-audit --no-package-lock

# Public runtime config is baked in at build time (the site is static).
# Set these with --build-arg to enable "Edit on GitHub" links / inline editing.
ARG NUXT_PUBLIC_GITHUB_REPO=""
ARG NUXT_PUBLIC_GITHUB_BRANCH="main"
ARG NUXT_PUBLIC_GITHUB_VOCAB_PATH=""
ARG NUXT_PUBLIC_GITHUB_CLIENT_ID=""
ARG NUXT_PUBLIC_GITHUB_AUTH_WORKER_URL=""

# Web components bundle, then the static site. Vocabulary data is not needed
# here: the site fetches /export/** in the browser, so one build serves any data.
RUN pnpm --filter @prez-lite/web-components build \
 && NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter @prez-lite/web generate

# -----------------------------------------------------------------------------
# Stage 2: runtime: nginx serves the site; Node runs the pipeline at start-up.
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime

ARG PREZ_LITE_VERSION=dev

RUN apk add --no-cache nginx tini \
 && mkdir -p /data /srv/prez-lite/export \
 && chown -R node:node /srv/prez-lite

COPY --from=build /app/web/.output/public /usr/share/prez-lite/site
COPY --from=build /opt/prez-lite/processor /opt/prez-lite/processor
# Demo vocabularies, used when /data/vocabs has no .ttl files
COPY --from=build /app/data /opt/prez-lite/sample-data
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/security-headers.conf /etc/nginx/prez-lite/security-headers.conf
COPY --chmod=0755 docker/prez-lite-process docker/docker-entrypoint.sh /usr/local/bin/

ENV NODE_ENV=production \
    PREZ_LITE_VERSION=${PREZ_LITE_VERSION} \
    PREZ_PROCESS=auto

USER node
WORKDIR /srv/prez-lite
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["/sbin/tini", "--", "docker-entrypoint.sh"]
CMD ["nginx", "-e", "/dev/stderr", "-g", "daemon off;"]
