#!/usr/bin/env bash
set -euo pipefail

: "${CLOUD_MAIL_BASE_URL:?Missing CLOUD_MAIL_BASE_URL, e.g. https://mail.example.com}"

echo "[1/3] healthz"
curl -fsS "${CLOUD_MAIL_BASE_URL%/}/api/healthz"
echo
echo

echo "[2/3] websiteConfig"
curl -fsS "${CLOUD_MAIL_BASE_URL%/}/api/setting/websiteConfig"
echo
echo

if [[ -n "${INBOUND_EMAIL_SECRET:-}" ]]; then
  echo "[3/3] inbound-email"
  printf 'From: sender@example.org\r\nTo: nobody@example.com\r\nSubject: deploy-check inbound\r\n\r\nhello\r\n' | \
    curl -fsS -X POST "${CLOUD_MAIL_BASE_URL%/}/api/webhooks/inbound-email" \
      -H "Authorization: Bearer ${INBOUND_EMAIL_SECRET}" \
      -H "X-Envelope-To: nobody@example.com" \
      -H "Content-Type: message/rfc822" \
      --data-binary @-
  echo
else
  echo "[3/3] inbound-email skipped (INBOUND_EMAIL_SECRET not set)"
fi
