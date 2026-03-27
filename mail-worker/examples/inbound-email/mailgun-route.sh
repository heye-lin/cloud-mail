#!/usr/bin/env bash
set -euo pipefail

: "${MAILGUN_API_KEY:?Missing MAILGUN_API_KEY}"
: "${MAILGUN_WEBHOOK_BASE:?Missing MAILGUN_WEBHOOK_BASE, e.g. https://mail-api.example.com}"
: "${INBOUND_EMAIL_SECRET:?Missing INBOUND_EMAIL_SECRET}"

MAILGUN_API_BASE="${MAILGUN_API_BASE:-https://api.mailgun.net}"
MAILGUN_ROUTE_EXPRESSION="${MAILGUN_ROUTE_EXPRESSION:-match_recipient(\".*@example.com\")}"
MAILGUN_ROUTE_PRIORITY="${MAILGUN_ROUTE_PRIORITY:-0}"
MAILGUN_ROUTE_DESCRIPTION="${MAILGUN_ROUTE_DESCRIPTION:-Cloud Mail inbound MIME webhook}"

TARGET_URL="${MAILGUN_WEBHOOK_BASE%/}/api/webhooks/inbound-email/mime?secret=${INBOUND_EMAIL_SECRET}"

curl -sS --user "api:${MAILGUN_API_KEY}" \
  "${MAILGUN_API_BASE}/v3/routes" \
  -F priority="${MAILGUN_ROUTE_PRIORITY}" \
  -F description="${MAILGUN_ROUTE_DESCRIPTION}" \
  -F expression="${MAILGUN_ROUTE_EXPRESSION}" \
  -F action="forward(\"${TARGET_URL}\")" \
  -F action='stop()'

echo
