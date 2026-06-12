# ProxiJob — Hướng dẫn test thủ công (Identity + Job)

Tài liệu này hướng dẫn setup môi trường, **import dữ liệu mẫu PostgreSQL**, và chạy checklist test PR (REST, chưa bắt buộc Management).

**File liên quan**

| File | Mục đích |
|------|----------|
| `docs/seed/00_cleanup_test_data.sql` | Xóa user test id≥4 + job của business 5 |
| `docs/seed/04_identity_new_users_from_id4.sql` | User 4–7, profile, gói, payment |
| `docs/seed/02_job_test_data_id4plus.sql` | Category, job post, ca, đơn ứng tuyển |
| `docs/seed/TEST_E2E_id4.http` | Gọi API nhanh (REST Client) |
| `src/Identity/.../ProxiJob.Identity.API.*.http` | Request mẫu theo module |

---

## 1. Tài khoản test

Giữ user **1–3** (`khoi@gmail.com`, `khoind@gmail.com`, `business@example.com`) — seed **không** sửa.

| UserId | Email | Mật khẩu | Ghi chú |
|--------|-------|----------|---------|
| 1–3 | *(tài khoản của bạn)* | *(đăng ký trước)* | Không đổi |
| **4** | `student@proxijob.test` | `Password1!` | Student, ReadyForWork |
| **5** | `business@proxijob.test` | `Password1!` | Business + Standard |
| **6** | `admin@proxijob.test` | `Password1!` | Admin |
| **7** | `business.trial@proxijob.test` | `Password1!` | Đơn CK Pending |

**Job seed:** `businessId=5`, `studentId=4`, CV `http://localhost:5231/api/public/students/4/cv`

**SQL:** `04_identity_new_users_from_id4.sql` → `02_job_test_data_id4plus.sql`

---

## 2. Chuẩn bị môi trường

### 2.1 Phần mềm

- .NET 8 SDK
- PostgreSQL (local hoặc Supabase)
- (Tuỳ chọn) Docker — RabbitMQ cho test event
- VS Code / Cursor + extension **REST Client** (hoặc Postman / Swagger)

### 2.2 Database

Tạo 2 database (tên gợi ý):

- `proxijob_identity`
- `proxijob_job`

### 2.3 Cấu hình API

```powershell
# Identity
copy src\Identity\ProxiJob.Identity.API\appsettings.Example.json `
     src\Identity\ProxiJob.Identity.API\appsettings.json
# Sửa ConnectionStrings:DefaultConnection

# Job
copy src\Job\ProxiJob.Job.API\appsettings.Example.json `
     src\Job\ProxiJob.Job.API\appsettings.json
# Sửa connection + GrpcServices:Identity = http://localhost:5231
```

### 2.4 Migration

```powershell
cd d:\ProxiJob

# Identity (hoặc bỏ qua nếu sẽ start API — tự migrate khi chạy)
dotnet ef database update `
  --project src\Identity\ProxiJob.Identity.Infrastructure `
  --startup-project src\Identity\ProxiJob.Identity.API

# Job (bắt buộc — Job API không auto-migrate)
dotnet ef database update `
  --project src\Job\ProxiJob.Job.Infrastructure `
  --startup-project src\Job\ProxiJob.Job.API
```

### 2.5 Import seed SQL

**Supabase (một DB `postgres`):** SQL Editor → chạy lần lượt:

1. `docs/seed/04_identity_new_users_from_id4.sql`
2. `docs/seed/02_job_test_data_id4plus.sql`

**Chạy lại:** `00_cleanup_test_data.sql` → `04` → `02`.

### 2.6 RabbitMQ (tuỳ chọn)

```powershell
docker run -d --name proxijob-rabbit -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

UI: http://localhost:15672 — `guest` / `guest`

### 2.7 Chạy service

```powershell
# Terminal 1
dotnet run --project src\Identity\ProxiJob.Identity.API

# Terminal 2
dotnet run --project src\Job\ProxiJob.Job.API
```

| Service | URL |
|---------|-----|
| Identity Swagger | https://localhost:7159/swagger |
| Identity HTTP | http://localhost:5231 |
| Job Swagger | http://localhost:5021/swagger |

---

## 3. Checklist test

Đánh dấu `[x]` khi pass. Có thể dùng `docs/seed/TEST_E2E_id4.http` hoặc Swagger.

### 3.1 Build

```powershell
dotnet build ProxiJob.sln
```

- [ ] **0 errors**

### 3.2 Identity — Auth

| # | Việc cần làm | Kỳ vọng |
|---|----------------|---------|
| 1 | `POST /api/auth/login` — `student@proxijob.test` | 200 + `accessToken`, `refreshToken` |
| 2 | `POST /api/auth/login` — `business@proxijob.test` | 200 |
| 3 | `POST /api/auth/refresh-token` `{ "refreshToken": "..." }` | Token mới |
| 4 | `POST /api/auth/logout` `{ "refreshToken": "..." }` | 200 |
| 5 | Login lại sau logout | 200 |
| 6 | `POST /api/auth/register` email mới | 200 (tuỳ chọn) |

### 3.3 Identity — Profile

**Student** (Bearer token SV):

- [ ] `GET /api/student/profile` — `readinessStatus` = `ReadyForWork`
- [ ] `PUT /api/student/profile` — cập nhật bio OK

**Business** (Bearer token DN `business@proxijob.test`):

- [ ] `GET /api/business/profile` — `readinessStatus` = `ProfileComplete`

**Public CV** (không cần token):

- [ ] `GET http://localhost:5231/api/public/students/1/cv` — JSON profile sinh viên

### 3.4 Identity — Gói & thanh toán

**Business đã có gói (`business@proxijob.test`):**

- [ ] `GET /api/plans` — danh sách gói
- [ ] `GET /api/plans/current` — gói **Standard**
- [ ] `GET /api/plans/job-posts/quota` — còn quota đăng tin

**Business chưa gói + test admin (`business.trial@proxijob.test`):**

- [ ] `POST /api/plans/purchase` `{ "planId": <id Basic> }` — tạo đơn mới (hoặc dùng order Pending có sẵn id từ DB)
- [ ] `GET /api/payments/{orderId}` — `Pending`
- [ ] Login `admin@proxijob.test` → `GET /api/admin/payments/pending`
- [ ] `POST /api/admin/payments/{orderId}/confirm` `{ "adminNote": "OK" }`
- [ ] `GET /api/payments/{orderId}` — `Paid`
- [ ] `POST /api/payments/{orderId}/session` — JWT cập nhật quyền

Lấy `orderId` đơn Pending seed:

```sql
SELECT id, ordercode, status FROM identity_paymentorders WHERE userid = 4;
```

### 3.5 Job — CRUD & lifecycle

Dùng seed: `categoryId=1`, `skillId=1`, `jobPostId=1`, `shiftId=1`, `businessId=2`, `studentId=1`.

- [ ] `GET /api/categories` — có F&B
- [ ] `POST /api/skills` — tạo skill mới (tuỳ chọn)
- [ ] `GET /api/job-posts/1` — Published
- [ ] `GET /api/job-posts/published` — có tin id 1
- [ ] `POST /api/job-posts` — tạo tin Draft mới (tuỳ chọn)
- [ ] `POST /api/job-posts/{id}/shifts` — thêm ca
- [ ] `PATCH /api/job-posts/{id}/publish` — publish tin Draft

### 3.6 Job — Apply / Approve / Reject / Cancel / Close

**Lưu ý:** Apply gọi Identity (gRPC) lấy CV URL → **Identity API phải chạy**.

- [ ] `POST /api/shifts/1/apply` — body `studentId: 1` → application id (hoặc dùng application id **1** có sẵn)
- [ ] `GET /api/applications/1` — `Pending`
- [ ] `PATCH /api/applications/1/approve` — `businessId: 2` → Approved, `remainingSlots` giảm
- [ ] Tạo đơn Pending thứ 2 → `PATCH .../reject` với `note`
- [ ] `PATCH .../cancel` (theo rule nghiệp vụ)
- [ ] `PATCH /api/job-posts/1/close` — đóng tin, reject đơn Pending còn lại

**Body mẫu approve:**

```json
{
  "applicationId": 1,
  "businessId": 2,
  "updatedBy": "business@proxijob.test"
}
```

### 3.7 RabbitMQ (nếu bật)

- [ ] Job API start không lỗi kết nối Rabbit
- [ ] Sau `publish` / `approve`: có message trên RabbitMQ Management UI

### 3.8 gRPC (phạm vi PR “chưa gRPC”)

Nhánh local có thể đã bật gRPC. Kiểm tra:

- REST-only test: chỉ gọi `/api/*` qua Swagger — đủ checklist.
- Nếu cần xác nhận không expose gRPC: khi **không** chạy Identity, Job `apply` sẽ lỗi CV — khi chạy Identity, `apply` thành công (đang dùng gRPC nội bộ).

---

## 4. Test bằng REST Client

1. Mở `docs/seed/TEST_E2E_id4.http`
2. Chạy request **Login Student** → copy `accessToken` vào biến `@studentToken`
3. Tương tự Business / Admin
4. Chạy lần lượt các request

---

## 5. Test bằng Swagger

1. Mở https://localhost:7159/swagger → **Authorize** → `Bearer {token}`
2. Gọi từng endpoint theo mục 3
3. Job: http://localhost:5021/swagger (hiện chưa gắn JWT Swagger — gửi body có `businessId` / `studentId` thủ công)

---

## 6. Truy vấn SQL hữu ích

```sql
-- Identity
SELECT id, email, jobpostsused FROM identity_users WHERE email LIKE '%@proxijob.test';
SELECT u.email, s.name, us.status, us.enddate
FROM identity_usersubscriptions us
JOIN identity_users u ON u.id = us.userid
JOIN identity_subscriptions s ON s.id = us.subscriptionid
WHERE u.email LIKE '%@proxijob.test';

-- Job
SELECT id, title, status, businessid FROM job_jobposts;
SELECT id, jobpostid, remainingslots, slots FROM job_jobshifts;
SELECT id, jobshiftid, studentid, status FROM job_applications;
```

---

## 7. Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|-----|-------------|------------|
| `Host can't be null` | Thiếu `appsettings.json` | Copy từ `appsettings.Example.json` |
| Login 401 | Sai password / chưa seed | Chạy lại `04_identity_new_users_from_id4.sql` |
| Admin 403 | User không phải Admin | Dùng `admin@proxijob.test` |
| Apply lỗi CV / gRPC | Identity tắt hoặc SV chưa profile | Chạy Identity; user id=1 đã ReadyForWork trong seed |
| Publish/Approve 500 | RabbitMQ down | Start Docker rabbit hoặc tạm tắt MassTransit khi dev |
| FK khi seed Job | Chưa seed Identity | Chạy `01` trước `02` |
| Trùng id user | DB đã có user id 1–4 | Chạy `00_cleanup` rồi seed lại |

---

## 8. Tạo lại mật khẩu BCrypt (tuỳ chọn)

```powershell
# Từ repo root, sau khi có folder .tmp-hash (hoặc chạy BCrypt trong project Identity)
dotnet run --project .tmp-hash\TmpHash.csproj
```

Hoặc đăng ký user mới qua API — không cần SQL.

---

*Cập nhật: 2026-06-02*
