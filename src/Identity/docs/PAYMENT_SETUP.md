# Thiết lập thanh toán thật (VNPay / MoMo)

Backend đã có luồng: tạo đơn → redirect cổng → IPN/callback → kích hoạt gói → lấy JWT.

Để **không dùng Mock**, team cần chuẩn bị các mục dưới đây.

---

## 1. URL công khai (bắt buộc)

Cổng thanh toán gọi **server của bạn** qua Internet. `localhost` không nhận IPN production.

| Môi trường | Gợi ý |
|------------|--------|
| Dev test cổng | [ngrok](https://ngrok.com) / Cloudflare Tunnel → `https://xxx.ngrok-free.app` |
| Staging/Prod | Domain API thật, ví dụ `https://api.proxijob.vn` |

Cập nhật `PaymentSettings:PublicBaseUrl` = URL API (không slash cuối).

Callback mẫu (thay domain):

- VNPay return/IPN: `https://api.proxijob.vn/api/payments/callback/vnpay`
- MoMo return: `https://api.proxijob.vn/api/payments/callback/momo-return`
- MoMo IPN: `https://api.proxijob.vn/api/payments/callback/momo`

`PaymentSettings:FrontendReturnUrl` = trang web/app sau khi user thanh toán xong (ví dụ `https://app.proxijob.vn/payment/result`).

---

## 2. VNPay — cần gửi cho dev (appsettings / secret)

Đăng ký merchant: https://vnpay.vn/dang-ky-dich-vu

| Key | Mô tả |
|-----|--------|
| `VNPay:TmnCode` | Mã website / terminal |
| `VNPay:HashSecret` | Chuỗi bí mật ký HMAC |
| `VNPay:Enabled` | `true` |
| `VNPay:PaymentUrl` | Sandbox: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` — Prod: URL production VNPay cung cấp |
| `VNPay:ReturnUrl` | Trùng URL đăng ký trên portal VNPay (GET callback) |
| `VNPay:IpnUrl` | URL IPN (có thể cùng path, method POST) |

**Trên portal VNPay** phải khai báo đúng Return URL / IPN URL như trên.

---

## 3. MoMo — cần gửi cho dev

Đăng ký: https://developers.momo.vn/

| Key | Mô tả |
|-----|--------|
| `MoMo:PartnerCode` | Partner Code |
| `MoMo:AccessKey` | Access Key |
| `MoMo:SecretKey` | Secret Key |
| `MoMo:Enabled` | `true` |
| `MoMo:ApiEndpoint` | Test: `https://test-payment.momo.vn/v2/gateway/api/create` — Prod: endpoint production |
| `MoMo:ReturnUrl` | `.../api/payments/callback/momo-return` |
| `MoMo:IpnUrl` | `.../api/payments/callback/momo` |

**Lưu ý:** Gói chỉ được kích hoạt chắc chắn khi **IPN POST** thành công. Return URL chỉ để đưa user về app.

---

## 4. Cấu hình production (appsettings hoặc biến môi trường)

```json
"PaymentSettings": {
  "PublicBaseUrl": "https://api.proxijob.vn",
  "OrderExpirationMinutes": 15,
  "EnableMockGateway": false,
  "FrontendReturnUrl": "https://app.proxijob.vn/payment/result"
}
```

**Không commit** secret vào git — dùng User Secrets / Azure Key Vault / env vars.

---

## 5. Luồng FE sau khi có cổng thật

1. `POST /api/plans/purchase` → `{ planId, gateway: "VNPay" }`
2. Redirect user tới `paymentUrl`
3. Sau khi user về app: poll `GET /api/payments/{orderId}` đến `status === "Paid"`
4. `POST /api/payments/{orderId}/session` → lưu token

---

## 6. Checklist trước go-live

- [ ] Merchant VNPay/MoMo **đã duyệt** (không chỉ sandbox)
- [ ] IPN URL whitelist trên portal cổng
- [ ] `EnableMockGateway: false` trên Production
- [ ] HTTPS, không lộ `HashSecret` / `SecretKey`
- [ ] Test 1 giao dịch thật số tiền nhỏ mỗi cổng

---

## 7. Việc team ProxiJob cần quyết định (gửi lại cho dev)

1. **Cổng nào lên trước?** VNPay / MoMo / cả hai?
2. **URL production** API + web app?
3. **Chỉ sandbox** hay đã có merchant production?
4. File `appsettings.Production.json` (hoặc env) — gửi qua kênh bảo mật, không chat công khai.
