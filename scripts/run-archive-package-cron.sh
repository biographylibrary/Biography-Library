#!/usr/bin/env bash
# Versa i pacchetti d'archivio dovuti.
# Autobiografie già pubblicate senza pacchetto: v1.
# Memorial: v1 solo se provisional_until è passato.
#
# crontab -e
#   15 8 * * * /opt/bl-app/scripts/run-archive-package-cron.sh >> /var/log/bl-archive-package.log 2>&1

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/bl-app}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
APP_URL="${APP_URL:-https://app.biographylibrary.org}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "$(date -Is) ERROR: missing $ENV_FILE"
  exit 1
fi

CRON_SECRET="$(grep -E '^CRON_SECRET=' "$ENV_FILE" | head -1 | cut -d= -f2- | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/")"

if [[ -z "$CRON_SECRET" ]]; then
  echo "$(date -Is) ERROR: CRON_SECRET not set in $ENV_FILE"
  exit 1
fi

echo "$(date -Is) POST $APP_URL/api/cron/archive-packages"

response="$(curl -sS -w "\n%{http_code}" -X POST "$APP_URL/api/cron/archive-packages" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json")"

body="$(echo "$response" | head -n -1)"
code="$(echo "$response" | tail -n 1)"

echo "$(date -Is) HTTP $code body: $body"
if [[ "$code" != "200" ]]; then
  exit 1
fi
