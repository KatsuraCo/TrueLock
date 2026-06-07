# TrueLock license backend

Minimal backend for direct invoice sales. It stores paid orders and issues signed `CF...` activation codes that the current TrueLock app can verify offline.

## Start locally

```powershell
cd "C:\Users\dkats\StudioProjects\encryptor77777\TrueLock main landing"
$env:ADMIN_TOKEN="local-admin-token"
$env:PAYMENT_WEBHOOK_SECRET="local-webhook-secret"
$env:TRUELOCK_LICENSE_PRIVATE_SEED_PATH="C:\secure\cf_private_key.txt"
$env:CORS_ORIGIN="https://truelock.pro"
node backend/license-server.mjs
```

`TRUELOCK_LICENSE_PRIVATE_SEED_PATH` or `TRUELOCK_LICENSE_PRIVATE_SEED_B64` must contain the same 32-byte base64 private seed used by the local license generator.

## Manual paid order

Use this after a confirmed manual invoice payment:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://localhost:8788/api/orders/create `
  -Headers @{ "x-admin-token" = "local-admin-token" } `
  -ContentType "application/json" `
  -Body '{"email":"buyer@example.com","orderId":"TL-ORDER-001","amountUsd":10,"maxActivations":1}'
```

The buyer opens `/activate.html`, enters email, order ID, and optional device ID from the app.

## Payment webhook

When the payment widget is ready, configure successful payments to call:

`POST /api/webhooks/payment`

Header:

`x-webhook-secret: <PAYMENT_WEBHOOK_SECRET>`

Body:

```json
{
  "email": "buyer@example.com",
  "orderId": "provider-order-id",
  "provider": "payment-provider-name",
  "providerPaymentId": "payment-id",
  "amountUsd": 10,
  "maxActivations": 1
}
```

Keep the private seed only on the backend host. Never publish it in the static site.
