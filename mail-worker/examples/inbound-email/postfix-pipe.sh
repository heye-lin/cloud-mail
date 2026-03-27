#!/usr/bin/env bash
set -euo pipefail

# Example Postfix pipe target:
#   argv=/bin/bash /path/to/postfix-pipe.sh ${sender} ${recipient}

SENDER="${1:-}"
RECIPIENT="${2:-}"

: "${INBOUND_WEBHOOK_URL:?Missing INBOUND_WEBHOOK_URL}"
: "${INBOUND_EMAIL_SECRET:?Missing INBOUND_EMAIL_SECRET}"

export ENVELOPE_FROM="${SENDER}"
export ENVELOPE_TO="${RECIPIENT}"

exec node /root/cloud-mail/mail-worker/src/scripts/relay-inbound-stdin.js
