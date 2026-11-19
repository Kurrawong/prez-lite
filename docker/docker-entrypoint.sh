#!/bin/sh
# Container entrypoint: process vocabularies, then start the web server.
#
# PREZ_PROCESS controls processing when the server starts:
#   auto    (default) process only if /data or the image version changed since
#           the last run. Images that ran `prez-lite-process` at build time
#           start instantly.
#   always  process on every start
#   never   serve whatever is already in /srv/prez-lite/export
#
# Any other command is run as-is, e.g.
#   docker run --rm -v "$PWD/data:/data:ro" -v "$PWD/out:/out" <image> prez-lite-process --out /out

set -eu

if [ "${1:-}" = "nginx" ]; then
  echo "[prez-lite] version ${PREZ_LITE_VERSION:-dev}"

  case "${PREZ_PROCESS:-auto}" in
    auto)   prez-lite-process --if-changed ;;
    always) prez-lite-process ;;
    never)
      if [ ! -f /srv/prez-lite/export/system/vocabularies/index.json ]; then
        echo "[prez-lite] warning: PREZ_PROCESS=never but no exports found in /srv/prez-lite/export" >&2
      fi
      ;;
    *)
      echo "[prez-lite] error: PREZ_PROCESS must be auto, always or never (got '${PREZ_PROCESS}')" >&2
      exit 64
      ;;
  esac

  echo "[prez-lite] serving on port 8080"
fi

exec "$@"
