#!/usr/bin/env bash
# Verify environment variables for the biography-library Docker container on Jelastic.
#
# Run ON the server (after git pull):
#   cd /opt/bl-app && bash scripts/verify-jelastic-env.sh
#
# Or from your laptop via SSH:
#   ssh USER@HOST 'cd /opt/bl-app && bash scripts/verify-jelastic-env.sh'
#
# Optional:
#   APP_DIR=/opt/bl-app CONTAINER=bl-app bash scripts/verify-jelastic-env.sh

set -uo pipefail

APP_DIR="${APP_DIR:-/opt/bl-app}"
CONTAINER="${CONTAINER:-bl-app}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"

# --- Required for Next.js in production ---
REQUIRED_VARS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  INFOMANIAK_AI_ENDPOINT
  INFOMANIAK_AI_TOKEN
  INFOMANIAK_AI_MODEL
  NEXT_PUBLIC_APP_URL
  NEXT_PUBLIC_APP_ENV
  RESEND_API_KEY
  RESEND_FROM_EMAIL
  CRON_SECRET
)

# --- Recommended (defaults exist in code if missing) ---
RECOMMENDED_VARS=(
  NEXT_PUBLIC_SITE_URL
  NEXT_PUBLIC_SITE_NAME
  AGENT_EMBEDDING_MODEL
  AGENT_SKIP_MODEL_CATALOG
  MISTRAL_API_KEY
  ECHO_TTS_MODEL
  ECHO_TTS_VOICE_IT
  ECHO_TTS_VOICE_EN
  ECHO_TTS_VOICE_FR
  ECHO_TTS_VOICE_DE
)

# --- Optional overrides ---
OPTIONAL_VARS=(
  AGENT_MODEL_ONBOARDING
  AGENT_MODEL_COACH
  AGENT_MODEL_REVIEWER
  AGENT_MODEL_APERTUS
  AGENT_DAILY_LIMIT
  AGENT_BURST_LIMIT
  INFOMANIAK_AI_BASE_URL
  ECHO_VOICE_PROVIDER
  AUTH_HOOK_SECRET
)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

fail=0
warn=0

is_secret() {
  case "$1" in
    *_KEY|*_TOKEN|*_SECRET|CRON_SECRET|AUTH_HOOK_SECRET|SUPABASE_SERVICE_ROLE_KEY)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

mask_value() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "MISSING"
    return 1
  fi
  if is_secret "$name"; then
    echo "set (${#value} chars)"
    return 0
  fi
  if [[ ${#value} -gt 72 ]]; then
    echo "${value:0:68}..."
    return 0
  fi
  echo "$value"
  return 0
}

env_file_has_key() {
  local key="$1"
  [[ -f "$ENV_FILE" ]] || return 1
  grep -qE "^${key}=" "$ENV_FILE" 2>/dev/null
}

container_has_key() {
  local key="$1"
  docker exec "$CONTAINER" printenv "$key" >/dev/null 2>&1
}

container_get() {
  local key="$1"
  docker exec "$CONTAINER" printenv "$key" 2>/dev/null || true
}

env_file_get() {
  local key="$1"
  if [[ ! -f "$ENV_FILE" ]]; then
    return
  fi
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/"
}

check_var() {
  local tier="$1"
  local key="$2"
  local in_container=false
  local in_file=false
  local c_val f_val

  if container_has_key "$key"; then
    in_container=true
    c_val="$(container_get "$key")"
  fi
  if env_file_has_key "$key"; then
    in_file=true
    f_val="$(env_file_get "$key")"
  fi

  if [[ "$in_container" == true ]]; then
    local display
    display="$(mask_value "$key" "$c_val")"
    if [[ "$tier" == "required" ]]; then
      printf "  ${GREEN}✓${NC} %-32s container: %s\n" "$key" "$display"
    else
      printf "  ${GREEN}✓${NC} %-32s container: %s\n" "$key" "$display"
    fi
    if [[ "$in_file" == false ]]; then
      printf "    ${YELLOW}!${NC} not in %s (only in container runtime)\n" "$ENV_FILE"
      ((warn++)) || true
    elif [[ -n "${c_val:-}" && -n "${f_val:-}" && "$c_val" != "$f_val" ]]; then
      printf "    ${YELLOW}!${NC} .env value differs from container — restart needed after .env edits\n"
      ((warn++)) || true
    fi
  else
    if [[ "$tier" == "required" ]]; then
      printf "  ${RED}✗${NC} %-32s MISSING in container\n" "$key"
      ((fail++)) || true
    else
      printf "  ${YELLOW}○${NC} %-32s missing (optional / has code default)\n" "$key"
    fi
    if [[ "$in_file" == true ]]; then
      printf "    ${YELLOW}!${NC} present in .env but not in container — run: docker restart %s\n" "$CONTAINER"
      ((warn++)) || true
    fi
  fi
}

echo "=== Biography Library — Jelastic env check ==="
echo "App dir:   $APP_DIR"
echo "Container: $CONTAINER"
echo "Env file:  $ENV_FILE"
echo

if ! command -v docker >/dev/null 2>&1; then
  echo -e "${RED}docker not found${NC}"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo -e "${RED}Container '$CONTAINER' is not running.${NC}"
  echo "Running containers:"
  docker ps --format '  - {{.Names}} ({{.Status}})' || true
  exit 1
fi

echo -e "${GREEN}Container is running.${NC}"
if [[ -f "$ENV_FILE" ]]; then
  echo -e "${GREEN}.env file exists.${NC}"
else
  echo -e "${YELLOW}.env file not found at $ENV_FILE${NC}"
  ((warn++)) || true
fi
echo

echo "--- Required ---"
for v in "${REQUIRED_VARS[@]}"; do
  check_var required "$v"
done
echo

echo "--- Recommended ---"
for v in "${RECOMMENDED_VARS[@]}"; do
  check_var recommended "$v"
done
echo

echo "--- Optional ---"
for v in "${OPTIONAL_VARS[@]}"; do
  check_var optional "$v"
done
echo

echo "--- Quick sanity ---"
app_url="$(container_get NEXT_PUBLIC_APP_URL)"
if [[ "$app_url" == "https://app.biographylibrary.org" ]]; then
  echo -e "  ${GREEN}✓${NC} NEXT_PUBLIC_APP_URL is production URL"
elif [[ -n "$app_url" ]]; then
  echo -e "  ${YELLOW}!${NC} NEXT_PUBLIC_APP_URL = $app_url (expected https://app.biographylibrary.org)"
  ((warn++)) || true
fi

if container_has_key CRON_SECRET; then
  cron_val="$(container_get CRON_SECRET)"
  echo -e "  ${GREEN}✓${NC} CRON_SECRET set (${#cron_val} chars) — must match Supabase Edge Function secret"
fi

if container_has_key AUTH_HOOK_SECRET; then
  echo -e "  ${YELLOW}!${NC} AUTH_HOOK_SECRET on Jelastic is unused by Next.js (Supabase only)"
fi

echo
echo "--- HTTP probe (optional) ---"
if command -v curl >/dev/null 2>&1; then
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 http://127.0.0.1/ 2>/dev/null || echo '000')"
  if [[ "$code" =~ ^[23] ]]; then
    echo -e "  ${GREEN}✓${NC} GET http://127.0.0.1/ → HTTP $code"
  else
    echo -e "  ${YELLOW}!${NC} GET http://127.0.0.1/ → HTTP $code"
    ((warn++)) || true
  fi
else
  echo "  curl not installed, skipping HTTP probe"
fi

echo
echo "=== Summary ==="
if [[ "$fail" -eq 0 && "$warn" -eq 0 ]]; then
  echo -e "${GREEN}All required variables are present in the running container.${NC}"
  exit 0
fi
if [[ "$fail" -eq 0 ]]; then
  echo -e "${YELLOW}Required OK, but $warn warning(s). Review messages above.${NC}"
  echo "After editing $ENV_FILE:"
  echo "  cd $APP_DIR && docker restart $CONTAINER"
  exit 0
fi
echo -e "${RED}$fail required variable(s) missing in container.${NC}"
echo "Fix $ENV_FILE then recreate/restart:"
echo "  cd $APP_DIR"
echo "  docker stop $CONTAINER && docker rm $CONTAINER"
echo "  docker run -d --name $CONTAINER --restart unless-stopped -p 80:80 --env-file .env biography-library"
exit 1
