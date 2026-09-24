#!/usr/bin/env bash
# Promemoria segnalazioni, scadenza revisione, cancellazione dati del segnalante senza account.
#
# crontab -e
#   20 8 * * * /opt/bl-app/scripts/run-report-deadlines-cron.sh >> /var/log/bl-report-deadlines.log 2>&1

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

echo "$(date -Is) POST $APP_URL/api/cron/report-deadlines"

response="$(curl -sS -w "\n%{http_code}" -X POST "$APP_URL/api/cron/report-deadlines" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json")"

body="$(echo "$response" | head -n -1)"
code="$(echo "$response" | tail -n 1)"

echo "$(date -Is) HTTP $code body: $body"
if [[ "$code" != "200" ]]; then
  exit 1
fi
