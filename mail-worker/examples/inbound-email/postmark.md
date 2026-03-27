# Postmark Inbound Webhook Example

Postmark can send parsed inbound email JSON to the Node API.

Recommended target:

```text
https://mail-api.example.com/api/webhooks/inbound-email/postmark?secret=replace-me
```

The Postmark webhook payload already contains structured sender, recipient, body, header, and attachment fields. The Cloud Mail webhook maps common Postmark fields such as:

- `From`
- `FromFull`
- `To`
- `ToFull`
- `CcFull`
- `BccFull`
- `OriginalRecipient`
- `Subject`
- `HtmlBody`
- `TextBody`
- `MessageID`
- `Headers`
- `Attachments`

You only need to point the Postmark inbound webhook URL at the `/postmark` endpoint and include the shared secret in the query string.
