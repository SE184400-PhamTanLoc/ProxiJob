# ProxiJob — Tổng hợp thay đổi đã triển khai

**Cập nhật:** 2026-06-01  
**Tham chiếu spec:** `MANAGEMENT_SERVICE_AGENT.md`

Tài liệu mô tả những gì đã implement trong repo (Management Service, Identity gRPC, tích hợp Job, shared contracts). **JWT login không đổi**; **chưa** bật `[Authorize]` / Enterprise middleware trên controller (làm sau).

---

## 1. Tổng quan kiến trúc

| Service | Port dev (tham khảo) | Trạng thái chính |
|---------|----------------------|------------------|
| Identity | `5231` | gRPC server + REST login + public student profile (CV) |
| Job | `5021` | gRPC client Identity, apply ca lấy CV từ profile |
| Management | `5004` (spec) | Features 1–8 + RabbitMQ + background job |

**Database:** PostgreSQL (Supabase) — Management dùng chung connection string với Job (`appsettings`).

---

## 2. Management Service (`src/Management/`)

### 2.1 Clean Architecture (4 project)

```
ProxiJob.Management.Domain/
ProxiJob.Management.Application/
ProxiJob.Management.Infrastructure/
ProxiJob.Management.API/
```

- Entity kế thừa `ProxiJob.Shared.Kernel.BaseEntity`
- CQRS + MediatR
- EF Core + migration `InitialManagementDb` (bảng snake_case trong `public`)

### 2.2 Bảng database

| Bảng | Ghi chú |
|------|---------|
| `employees` | `business_id`, `user_id` nullable, enum string, soft delete |
| `work_schedules` | `job_shift_id` nullable, `job_shift_salary` (salary từ event) |
| `timekeepings` | GPS, ảnh URL, status enum |
| `payrolls` | Pending / Paid |
| `business_qr_codes` | `latitude` / `longitude` cho GPS, `qr_token` unique |

**Naming:** `IEntityTypeConfiguration` từng bảng + snake_case cột trong `ManagementDbContext`. Global query filter `IsDeleted = false`.

### 2.3 Features đã implement

| # | Feature | API (tóm tắt) |
|---|---------|----------------|
| 1 | Employee | `POST/GET/PUT/PATCH/DELETE /api/employees` |
| 2 | Work Schedule | `/api/employees/{id}/schedules`, `/api/schedules` |
| 3 | QR Code | `/api/qr-code` (generate, get, radius, location) |
| 4 | Timekeeping | `/api/timekeeping/check-in`, `check-out`, manual, confirm |
| 5 | Absent tự động | `AutoAbsentJob` (BackgroundService ~30 phút) |
| 6–7 | Payroll | `/api/payrolls/calculate`, approve, queries |
| 8 | RabbitMQ | Consumer `application.approved` / `application.cancelled` |

**Business rules (đã code):**

- `businessId` / `userId` từ `ICurrentUserService` (Identity gRPC), không từ body
- Soft delete only
- Không xóa employee nếu payroll `Pending`
- Không xóa schedule nếu đã có timekeeping
- Không trùng lịch cùng employee
- Mỗi work schedule tối đa 1 timekeeping

### 2.4 RabbitMQ

**Subscribe:**

- `management.application.approved` → `ApplicationApprovedConsumer`
- `management.application.cancelled` → `ApplicationCancelledConsumer`

**Publish (`Events.cs`):**

- `EmployeeAbsentEvent`
- `PayrollPaidEvent`

### 2.5 Tích hợp Identity (chưa authorize controller)

- `IIdentityGrpcClient` + `IdentityGrpcClient`
- `IdentityUserContextMiddleware` — Bearer → `ValidateAccessToken`
- `ICurrentUserService` → `IdentityUserContextSnapshot`

### 2.6 Cấu hình

`ProxiJob.Management.API/appsettings.json`:

```json
{
  "ConnectionStrings": { "DefaultConnection": "..." },
  "GrpcServices": { "Identity": "http://localhost:5231" }
}
```

---

## 3. Identity Service — gRPC & CV

### 3.1 Proto

`common/ProxiJob.Shared.Contract/Protos/identity_service.proto`

| RPC | Mô tả |
|-----|--------|
| `ValidateAccessToken` | Validate JWT → `UserContextGrpcDto` |
| `GetUserContext` | User theo `user_id` |
| `GetStudentCvForApplication` | Profile + `cv_url` cho Job apply |

### 3.2 Server

- `IdentityGrpcServiceImpl`
- `UserContextService`, `JwtAccessTokenValidator`
- `StudentCvUrlResolver` — CV = link xem profile (không file upload)

### 3.3 REST public — CV = StudentProfile

`GET /api/public/students/{userId}/cv` → `PublicStudentCvController` → JSON `StudentProfileDto`  
Job lưu URL vào `Application.CVUrl`.

### 3.4 Program

```csharp
builder.Services.AddGrpc();
app.MapGrpcService<IdentityGrpcServiceImpl>();
```

---

## 4. Job Service — thay đổi

| Thay đổi | Chi tiết |
|----------|----------|
| Events | `ApplicationApprovedEvent` + `BusinessId`, `JobShiftId`, `Salary` |
| Events | `ApplicationCancelledEvent` + `BusinessId`, `JobShiftId` |
| gRPC | `IdentityGrpcClient` thay mock |
| Middleware | `IdentityUserContextMiddleware` |
| Apply | `CVUrl` từ profile Identity |

---

## 5. Shared Contract

### `common/ProxiJob.Shared.Contract/`

- `Protos/identity_service.proto`
- `Events/Events.cs` — Job + Management events
- `Identity/IdentityUserContextSnapshot.cs`
- `Identity/IdentityUserContextMapper.cs`
- `Identity/IdentityUserContextHttpKeys.cs`

---

## 6. Luồng gRPC

### User đăng nhập (Job + Management)

```
Client Bearer JWT → API → Middleware → gRPC ValidateAccessToken
→ HttpContext["IdentityUserContext"] → ICurrentUserService
```

### Apply ca (Job)

```
ApplyShift → GetStudentCvForApplication → cv_url + profile → Application.CVUrl
```

### Event Job → Management

```
ApplicationApprovedEvent → queue management.application.approved → Employee + WorkSchedule
```

---

## 7. Chạy local

1. Connection string trong Job & Management appsettings  
2. `dotnet ef database update` (Management)  
3. Identity `:5231`, Job `:5021`, Management  
4. RabbitMQ (test consumer)  
5. Login → Bearer token cho API  

```bash
dotnet ef database update \
  -p src/Management/ProxiJob.Management.Infrastructure/ProxiJob.Management.Infrastructure.csproj \
  -s src/Management/ProxiJob.Management.API/ProxiJob.Management.API.csproj
```

---

## 8. Chưa làm / để sau

- [ ] `[Authorize]` trên controllers  
- [ ] Enterprise gate Management  
- [ ] Matching nối Identity gRPC  
- [ ] Bảo mật gRPC service-to-service  

---

## 9. File tra cứu nhanh

**Management:** `src/Management/**` — Controllers, Features, Consumers, `AutoAbsentJob.cs`, Migrations  

**Identity gRPC:** `IdentityGrpcService.cs`, `UserContextService.cs`, `PublicStudentCvController.cs`  

**Job:** `IdentityGrpcClient.cs`, `IdentityUserContextMiddleware.cs`  

**Spec:** `MANAGEMENT_SERVICE_AGENT.md`
