#!/usr/bin/env bash
# Signs in to the HireFlow API with curl so you can replay the commands from
# backend/storage/logs/api-*.log. Run it with `source` (Git Bash, macOS or Linux):
#
#   source scripts/api-login.sh recruiter@acme.test 'Password123!'
#
# It creates cookies.txt (session cookie) in the current folder and exports $XSRF,
# which the logged curl commands use for POST/PUT/DELETE requests.
# Optional 3rd/4th arguments: API URL (default http://localhost:8000) and SPA origin
# (default http://localhost:5173, must be listed in SANCTUM_STATEFUL_DOMAINS).

HF_EMAIL="${1:?Usage: source scripts/api-login.sh <email> <password> [api-url] [origin]}"
HF_PASSWORD="${2:?Usage: source scripts/api-login.sh <email> <password> [api-url] [origin]}"
HF_API="${3:-http://localhost:8000}"
HF_ORIGIN="${4:-http://localhost:5173}"

_hf_read_xsrf() {
  # Cookie jar column 7 holds the URL-encoded token.
  grep 'XSRF-TOKEN' cookies.txt | tail -n 1 | awk '{print $7}' \
    | sed -e 's/%3D/=/g' -e 's/%2B/+/g' -e 's/%2F/\//g'
}

rm -f cookies.txt
curl -s -o /dev/null -c cookies.txt -H "Origin: $HF_ORIGIN" "$HF_API/sanctum/csrf-cookie"
XSRF="$(_hf_read_xsrf)"

HF_BODY=$(printf '{"email":"%s","password":"%s"}' "$HF_EMAIL" "$HF_PASSWORD")
HF_STATUS=$(curl -s -o /tmp/hf-login.json -w '%{http_code}' -X POST "$HF_API/api/v1/auth/login" \
  -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -H "Origin: $HF_ORIGIN" -H "X-XSRF-TOKEN: $XSRF" \
  -b cookies.txt -c cookies.txt --data-raw "$HF_BODY")

# Laravel issues a fresh CSRF token after sign-in.
export XSRF="$(_hf_read_xsrf)"
unset HF_PASSWORD HF_BODY

if [ "$HF_STATUS" = "200" ]; then
  echo "Signed in as $HF_EMAIL. Session saved to cookies.txt and \$XSRF exported."
else
  echo "Sign-in failed (HTTP $HF_STATUS):" && cat /tmp/hf-login.json && echo
fi
