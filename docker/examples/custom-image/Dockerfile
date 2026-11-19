# Example: publish your own vocabularies with the prez-lite image.
#
# Layout next to this Dockerfile:
#
#   vocabs/*.ttl            your SKOS vocabularies (required)
#   config/profiles.ttl     SHACL profiles (optional: prez-lite's defaults otherwise)
#   background/*.ttl        background labels for external IRIs (optional)
#
#   docker build -t my-vocabs .
#   docker run --rm -p 8080:8080 my-vocabs
#
# Pin a release tag (e.g. :0.3.0) instead of :latest for reproducible builds.
FROM ghcr.io/kurrawong/prez-lite:latest

COPY vocabs/ /data/vocabs/
# COPY config/ /data/config/
# COPY background/ /data/background/

# Optional: process at build time. Broken TTL then fails the build instead of
# the container start, and the container starts serving immediately.
RUN prez-lite-process
