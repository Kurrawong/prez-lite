---
title: Docker
status: current
updated: 2026-11-19
---

# Docker

> Run a prez-lite vocabulary site from one container. Bring your TTL files, then mount them or `COPY` them in.

## What's in the image

| Part | Where | What it does |
|------|-------|--------------|
| Web site | `/usr/share/prez-lite/site` | The prez-lite Nuxt site, pre-built as static files |
| Pipeline | `/opt/prez-lite/processor` | The TTL → JSON processing scripts (`packages/data-processing`) |
| Demo data | `/opt/prez-lite/sample-data` | The repo's `data/` directory, used when you provide no vocabularies |
| Your data | `/data` | Input: vocabularies, profiles, background labels |
| Exports | `/srv/prez-lite/export` | Output: served at `/export/` |

The site reads all vocabulary data from `/export/**` in the browser, so one image serves any set of vocabularies. On start, the container:

1. Processes `/data` into `/srv/prez-lite/export`, the same steps as `pnpm build:all-export`. It skips this when nothing has changed.
2. Starts nginx on port **8080**.

The image runs as the unprivileged `node` user (uid 1000) and is published for `linux/amd64` and `linux/arm64`.

## Quick start

```bash
docker run --rm -p 8080:8080 ghcr.io/kurrawong/prez-lite:latest
```

Open <http://localhost:8080>. With no `/data`, the container serves the demo vocabularies.

> **Forks:** the workflow publishes to `ghcr.io/<owner>/<repo>`. Replace `kurrawong` with your GitHub owner (lowercase) when you run your own builds.

## Publish your own vocabularies

`/data` uses the same layout as the repo's `data/` directory. Only `vocabs/` is required:

```
data/
├── vocabs/*.ttl            # SKOS vocabularies (required)
├── config/profiles.ttl     # SHACL profiles (optional: prez-lite's defaults otherwise)
├── config/workspaces.ttl   # workspace definitions (optional)
├── background/*.ttl        # labels for external IRIs (optional)
└── validators/*.ttl        # SHACL validation shapes (optional)
```

### Option 1: mount a volume

Good for local work and for servers where you update vocabularies in place.

```bash
docker run -d --name vocabs -p 8080:8080 \
  -v "$PWD/data:/data:ro" \
  ghcr.io/kurrawong/prez-lite:latest
```

If you only have a folder of TTL files, mount it straight at `/data/vocabs`:

```bash
docker run -d -p 8080:8080 -v "$PWD/my-vocabs:/data/vocabs:ro" ghcr.io/kurrawong/prez-lite:latest
```

After you change the files, restart the container to reprocess them:

```bash
docker restart vocabs
```

The container must be able to read the files as uid 1000. Files that are readable by everyone (mode `644`, the usual default) work.

### Option 2: build a custom image

Good for deployments: the image carries its own data and needs no volumes. Put a `Dockerfile` next to your `vocabs/` folder (see [`docker/examples/custom-image/Dockerfile`](../../docker/examples/custom-image/Dockerfile)):

```dockerfile
FROM ghcr.io/kurrawong/prez-lite:latest

COPY vocabs/ /data/vocabs/
# COPY config/ /data/config/
# COPY background/ /data/background/

# Optional: process at build time
RUN prez-lite-process
```

```bash
docker build -t my-vocabs .
docker run --rm -p 8080:8080 my-vocabs
```

Processing at build time with `RUN prez-lite-process` is optional, but it helps in two ways:

- A broken TTL file fails `docker build` rather than the container start.
- The container starts serving at once. It also runs with a read-only root filesystem: `docker run --read-only --tmpfs /tmp ...`.

Pin a release tag such as `:0.3.0` instead of `:latest` when you need reproducible builds.

## Docker Compose

The repo's [`docker-compose.yml`](../../docker-compose.yml) serves `./data`:

```bash
docker compose up -d            # run the published image
docker compose up -d --build    # build the image from this checkout instead
docker compose restart          # reprocess after editing ./data
```

| Variable | Default | Purpose |
|----------|---------|---------|
| `PREZ_LITE_IMAGE` | `ghcr.io/kurrawong/prez-lite:latest` | Image to run (or the tag for `--build`) |
| `PREZ_LITE_PORT` | `8080` | Host port |

## Configuration

| Environment variable | Default | Description |
|----------------------|---------|-------------|
| `PREZ_PROCESS` | `auto` | `auto` processes `/data` when it, or the image version, has changed since the last run. `always` processes on every start. `never` serves whatever is already in `/srv/prez-lite/export`. |

`auto` stores a fingerprint of the inputs next to the exports, so a plain `docker restart` with unchanged data starts at once.

If processing fails, for example on a TTL syntax error, the container exits with a non-zero code. The log names the file and line. The previous exports stay untouched.

### Generate exports without serving

The pipeline also runs on its own. This writes the export files (JSON, JSON-LD, TTL, RDF/XML, CSV, HTML, search index) to a host directory, for example to publish them on another static host:

```bash
docker run --rm --user "$(id -u):$(id -g)" \
  -v "$PWD/data:/data:ro" -v "$PWD/export:/out" \
  ghcr.io/kurrawong/prez-lite:latest prez-lite-process --out /out
```

`prez-lite-process --help` lists all options.

## Build the image from source

```bash
docker build -t prez-lite .
docker run --rm -p 8080:8080 -v "$PWD/data:/data:ro" prez-lite
```

The Nuxt build bakes in public runtime config, so GitHub editing features need build arguments:

| Build argument | Purpose |
|----------------|---------|
| `NUXT_PUBLIC_GITHUB_REPO` | `owner/repo` for "Edit on GitHub" links and inline editing |
| `NUXT_PUBLIC_GITHUB_BRANCH` | Branch to edit (default `main`) |
| `NUXT_PUBLIC_GITHUB_VOCAB_PATH` | Path to the TTL files in that repo |
| `NUXT_PUBLIC_GITHUB_CLIENT_ID` | GitHub OAuth app client ID ([setup](../3-features/github-oauth-setup.md)) |
| `NUXT_PUBLIC_GITHUB_AUTH_WORKER_URL` | URL of the auth worker |
| `PREZ_LITE_VERSION` | Version string shown in the logs (CI sets it) |

The build stage runs on the build host's own platform, because the site and the pipeline's dependencies are platform-independent. A multi-arch build (`docker buildx build --platform linux/amd64,linux/arm64 .`) therefore runs only the small runtime stage under emulation.

## Published images

[`.github/workflows/docker-publish.yml`](../../.github/workflows/docker-publish.yml) builds, smoke-tests and pushes the image to GitHub Container Registry:

| Event | Tags |
|-------|------|
| Push to `main` | `latest`, `sha-<short-sha>` |
| Release (release-please) | `<version>`, `<major>.<minor>`, and `<major>` from 1.0.0 |
| Manually pushed `v*` tag | Same as a release |
| Pull request (Docker-related files) | Built and tested, not pushed |

release-please creates its tags with `GITHUB_TOKEN`, and such tags don't trigger workflows. So `release.yml` calls `docker-publish.yml` directly when it cuts a release.

GHCR makes a new package **private**. After the first publish, open the package settings on GitHub (your profile or organisation → Packages → prez-lite → Package settings) and change the visibility to public.

## Customising the site

The image covers the common case: your vocabularies with prez-lite's look and pages. Some parts are fixed when the site is built:

- **Branding, header, footer, content pages:** use a client site (Nuxt layer) or the [template repository](https://github.com/Kurrawong/prez-lite-template-default). See [Sites Management](sites-management.md).
- **nginx:** replace `/etc/nginx/nginx.conf`, or `/etc/nginx/prez-lite/security-headers.conf`, in a derived image. The defaults mirror `web/public/_headers`: CORS on `/export/` and `/web-components/`, and security headers on every response.

## Notes

- The browser loads icons from `api.iconify.design` at runtime (Nuxt UI's default), so a fully offline network shows the site without icons.
- `GET /healthz` returns `ok` once nginx is up. The image's `HEALTHCHECK` uses it.
- Logs go to stdout and stderr: processing output, then nginx access logs.
