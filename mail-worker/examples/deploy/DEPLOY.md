# Deployment Checklist

## 1. Backend environment

Create `/etc/cloud-mail/cloud-mail.env` from:

```text
examples/deploy/cloud-mail.env.example
```

Required values to replace:

- `DATABASE_HOST`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`
- `REDIS_HOST`
- `REDIS_PASSWORD`
- `MAIL_DOMAINS`
- `ADMIN_EMAIL`
- `JWT_SECRET`
- `INBOUND_EMAIL_SECRET`

## 2. PostgreSQL

Initialize schema once:

```bash
cd /root/cloud-mail/mail-worker
corepack pnpm init:pg
```

## 3. Node API

Install and start via systemd:

```bash
cp examples/deploy/systemd/cloud-mail-api.service /etc/systemd/system/cloud-mail-api.service
systemctl daemon-reload
systemctl enable --now cloud-mail-api
```

## 4. Frontend

Build the frontend separately from `mail-vue` and serve the output directory as static files:

```bash
cd /root/cloud-mail/mail-vue
corepack pnpm install
corepack pnpm build
```

The default `release` build writes files into `mail-worker/dist`, so point Nginx root there unless you override `VITE_OUT_DIR`.

Reference config:

```text
examples/deploy/nginx-full.conf
```

## 5. Inbound email

Choose one upstream:

- Mailgun route -> `examples/inbound-email/mailgun.md`
- Postmark inbound webhook -> `examples/inbound-email/postmark.md`
- SMTP/MTA pipe -> `examples/inbound-email/postfix.md`

## 6. Verify

Run:

```bash
CLOUD_MAIL_BASE_URL=https://mail.example.com \
INBOUND_EMAIL_SECRET=replace-me \
bash examples/deploy/deploy-check.sh
```
