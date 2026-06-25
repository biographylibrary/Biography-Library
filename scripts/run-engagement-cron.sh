#!/usr/bin/env bash
# Daily engagement emails (G1 chapter + G2 PDF draft reminder).
# Install on Jelastic server crontab (runs inside the host, not inside Docker):
#
#   crontab -e
#   # Every day at 08:00 UTC (09:00 CET / 10:00 CEST)
#   0 8 * * * /opt/bl-app/scripts/run-engagement-cron.sh >> /var/log/bl-engagement-cron.log 2>&1
#
# Requires CRON_SECRET in /opt/bl-app/.env (same value as Supabase Edge Function secret).

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/bl-app}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
FUNCTION_URL="${FUNCTION_URL:-https://gckmusbozgbclokvbnwx.supabase.co/functions/v1/send-engagement-emails}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "$(date -Is) ERROR: missing $ENV_FILE"
  exit 1
fi

# Read only CRON_SECRET — do not `source` the whole .env (unquoted values break bash).
CRON_SECRET="$(grep -E '^CRON_SECRET=' "$ENV_FILE" | head -1 | cut -d= -f2- | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/")"

if [[ -z "$CRON_SECRET" ]]; then
  echo "$(date -Is) ERROR: CRON_SECRET not set in $ENV_FILE"
  exit 1
fi

echo "$(date -Is) POST $FUNCTION_URL"

response="$(curl -sS -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json")"

body="$(echo "$response" | head -n -1)"
code="$(echo "$response" | tail -n 1)"

echo "$(date -Is) HTTP $code body: $body"

if [[ "$code" != "200" ]]; then
  exit 1
fi

exit 0
