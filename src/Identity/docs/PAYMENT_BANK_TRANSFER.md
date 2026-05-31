# Thanh toán chuyển khoản MB Bank

## Luồng

1. `POST /api/plans/purchase` — body `{ "planId": 3 }`
2. Response `bankTransfer`: STK **0783629758**, MB Bank, QR `/images/payment-qr.jpg`, `transferContent` = `orderCode`
3. User chuyển khoản đúng số tiền + nội dung
4. Admin `GET /api/admin/payments/pending` → `POST /api/admin/payments/{id}/confirm`
5. `GET /api/payments/{orderId}` → `Paid` → `POST /api/payments/{orderId}/session`

## Cấu hình

```json
"PaymentSettings": {
  "PublicBaseUrl": "https://localhost:7159"
},
"BankTransfer": {
  "Enabled": true,
  "BankName": "MB Bank",
  "AccountNumber": "0783629758",
  "AccountHolder": "TEN CHU TAI KHOAN",
  "QrImagePath": "/images/payment-qr.jpg",
  "OrderExpirationMinutes": 1440
}
```

QR file: `ProxiJob.Identity.API/wwwroot/images/payment-qr.jpg` (copy từ `image/` gốc).

`PublicBaseUrl` + `QrImagePath` → URL đầy đủ trong API response.
