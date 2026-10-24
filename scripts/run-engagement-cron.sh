#!/usr/bin/env bash
# Daily engagement emails (G1 chapter + G2 PDF draft reminder).
# Install on Jelastic server crontab (runs inside the host, not inside Docker):
#
#   crontab -e
#   # Every day at 08:00 UTC (09:00 CET / 10:00 CEST)
#   0 8 * * * /opt/bl-app/scripts/run-engagement-cron.sh >> /opt/bl-app/engagement-cron.log 2>&1
#
# Requires CRON_SECRET in /opt/bl-app/.env (same value as Supabase Edge Function secret).
# Optional: SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL in .env (defaults to Zurich).

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/bl-app}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") ERROR: missing $ENV_FILE"
  exit 1
fi

# grep returns 1 when the key is absent — must not abort under pipefail.
read_env() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2- | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/" || true
}

# Read only needed keys — do not `source` the whole .env (unquoted values break bash).
CRON_SECRET="$(read_env CRON_SECRET)"
PROJECT_REF="$(read_env SUPABASE_PROJECT_REF)"
PUBLIC_URL="$(read_env NEXT_PUBLIC_SUPABASE_URL)"

if [[ -z "$CRON_SECRET" ]]; then
  echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") ERROR: CRON_SECRET not set in $ENV_FILE"
  exit 1
fi

if [[ -z "${FUNCTION_URL:-}" ]]; then
  if [[ -n "$PUBLIC_URL" ]]; then
    FUNCTION_URL="${PUBLIC_URL%/}/functions/v1/send-engagement-emails"
  else
    # Zurich production project (override via SUPABASE_PROJECT_REF or FUNCTION_URL)
    PROJECT_REF="${PROJECT_REF:-frycyhvhuifznxzamenn}"
    FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/send-engagement-emails"
  fi
fi

echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") POST $FUNCTION_URL"

response="$(curl -sS -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json")"

body="${response%$'\n'*}"
code="${response##*$'\n'}"

echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") HTTP $code body: $body"

if [[ "$code" != "200" ]]; then
  exit 1
fi

exit 0
