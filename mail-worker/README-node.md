# Node Runtime Notes

This repository was originally built for Cloudflare Workers. A first-stage Node runtime is now available at `src/node.js` so the backend can move toward `PostgreSQL + Redis + S3/MinIO`.

## Required environment variables

```bash
PORT=8787
MAIL_DB_DIALECT=pg
DATABASE_URL=postgres://user:pass@127.0.0.1:5432/cloud_mail
REDIS_URL=redis://127.0.0.1:6379
MAIL_DOMAINS=["example.com"]
ADMIN_EMAIL=admin@example.com
JWT_SECRET=replace-me
INBOUND_EMAIL_SECRET=replace-me
```

You can also provide split connection settings instead of URLs:

```bash
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_USER=cloud_mail
DATABASE_PASSWORD=secret
DATABASE_NAME=cloud_mail
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=secret
```

Optional variables keep the existing names used by the Worker version, for example `linuxdo_switch`, `linuxdo_client_id`, `linuxdo_callback_url`.

Captcha is optional in the Node path. If you do not configure `site_key` + `secret_key` in the `setting` table, register/add-email verification is treated as disabled. You can also force-disable it with:

```bash
captcha_provider=disabled
```

## Start

```bash
pnpm start:node
```

Basic health check:

```bash
curl http://127.0.0.1:8787/api/healthz
```

To keep the old Worker cron behavior in the Node runtime, enable the built-in scheduler:

```bash
SCHEDULED_ENABLED=true
SCHEDULED_TIMEZONE=Asia/Shanghai
SCHEDULED_HOUR=0
SCHEDULED_MINUTE=0
pnpm start:node
```

Or run the maintenance job once and hand scheduling off to system cron:

```bash
pnpm scheduled:node
```

## Inbound email webhook

Node can now accept raw inbound MIME via HTTP:

```bash
POST /api/webhooks/inbound-email
Authorization: Bearer $INBOUND_EMAIL_SECRET
X-Envelope-To: user@example.com
Content-Type: message/rfc822
```

It also exposes Mailgun-friendly aliases:

```text
/api/webhooks/inbound-email/mime
/api/webhooks/inbound-email/raw-mime
```

Those aliases accept the same payloads and also allow `?secret=...` when the upstream sender cannot attach a custom authorization header.

For Postmark-style parsed JSON payloads:

```text
/api/webhooks/inbound-email/postmark?secret=replace-me
```

The request body should be the raw MIME message. A JSON body is also accepted:

```json
{
  "to": "user@example.com",
  "from": "sender@example.org",
  "raw": "From: sender@example.org\nTo: user@example.com\nSubject: Test\n\nhello"
}
```

`multipart/form-data` and URL-encoded payloads are also accepted. Common field names such as `recipient`, `sender`, `body-mime`, `raw`, `message`, `raw_base64`, and `mime_base64` are normalized automatically.

```bash
curl -X POST http://127.0.0.1:8787/api/webhooks/inbound-email \
  -H "Authorization: Bearer $INBOUND_EMAIL_SECRET" \
  -F recipient=user@example.com \
  -F sender=sender@example.org \
  -F 'body-mime=From: sender@example.org
To: user@example.com
Subject: Test

hello'
```

The webhook stores the email and returns JSON describing whether it was accepted. On the Node webhook path, external mailbox forwarding is reported via `forwardTargets` in the response and is not executed automatically.

Example reverse-proxy snippets are available in:

- `examples/inbound-email/nginx.conf`
- `examples/inbound-email/Caddyfile`
- `examples/inbound-email/mailgun.md`
- `examples/inbound-email/postmark.md`
- `examples/inbound-email/postfix.md`
- `examples/deploy/cloud-mail.env.example`
- `examples/deploy/systemd/cloud-mail-api.service`
- `examples/deploy/nginx-full.conf`
- `examples/deploy/DEPLOY.md`
- `examples/deploy/deploy-check.sh`

You can also send a local smoke-test message to the webhook:

```bash
INBOUND_EMAIL_SECRET=replace-me \
INBOUND_WEBHOOK_URL=http://127.0.0.1:8787/api/webhooks/inbound-email \
TEST_TO=nobody@example.com \
pnpm send:test:inbound
```

For Mailgun routes, a ready-to-run creation script is included:

```bash
MAILGUN_API_KEY=key-xxxx \
MAILGUN_WEBHOOK_BASE=https://mail-api.example.com \
INBOUND_EMAIL_SECRET=replace-me \
bash examples/inbound-email/mailgun-route.sh
```

For SMTP/MTA pipe transports, a stdin bridge is included:

```bash
cat raw-email.eml | \
INBOUND_EMAIL_SECRET=replace-me \
INBOUND_WEBHOOK_URL=http://127.0.0.1:8787/api/webhooks/inbound-email \
ENVELOPE_TO=user@example.com \
ENVELOPE_FROM=sender@example.org \
pnpm relay:stdin:inbound
```

This is the simplest path for self-hosted MTAs or filters that can execute a command with the raw MIME message on stdin.

## systemd example

Copy the example env file and service unit:

```bash
mkdir -p /etc/cloud-mail
cp examples/deploy/cloud-mail.env.example /etc/cloud-mail/cloud-mail.env
cp examples/deploy/systemd/cloud-mail-api.service /etc/systemd/system/cloud-mail-api.service
systemctl daemon-reload
systemctl enable --now cloud-mail-api
```

After startup:

```bash
curl http://127.0.0.1:8787/api/healthz
journalctl -u cloud-mail-api -f
```

If you want one public domain to serve both the Vue frontend and the Node API, use the example front+api Nginx config in `examples/deploy/nginx-full.conf`.

## Initialize PostgreSQL

```bash
pnpm init:pg
```

## Current scope

- HTTP API can now be hosted without Cloudflare Workers.
- Cache/session storage is designed to run on Redis.
- Database access is prepared for PostgreSQL.
- Captcha can run disabled by default without Cloudflare Turnstile.
- Worker `scheduled` maintenance tasks can now run from Node as a one-off script or optional daily scheduler.
- Inbound email processing is shared between Workers Email events and a Node webhook endpoint.
- `/init/:secret` still follows the legacy D1/SQLite bootstrap path and should not be used for PostgreSQL.

You should create PostgreSQL tables via migrations or SQL scripts before using the Node runtime in production.
