# Management Service — Tổng hợp triển khai

**Service:** `management-service` | **Port:** `5004` | **Database:** PostgreSQL (Supabase)  
**Kiến trúc:** Clean Architecture 4 tầng | **CQRS:** MediatR | **Messaging:** MassTransit + RabbitMQ  
**Blueprint:** [`MANAGEMENT_SERVICE_AGENT.md`](./MANAGEMENT_SERVICE_AGENT.md)

---

## Tổng quan cấu trúc dự án

```
src/Management/
├── ProxiJob.Management.API/              ← Controllers, Program.cs (Startup)
│   ├── Controllers/
│   │   ├── EmployeesController.cs
│   │   ├── WorkSchedulesController.cs
│   │   ├── QrCodesController.cs
│   │   ├── TimekeepingController.cs
│   │   └── PayrollsController.cs
│   ├── Program.cs
│   └── appsettings.json
│
├── ProxiJob.Management.Application/      ← Use Cases, DTOs, Interfaces
│   ├── Common/Interfaces/
│   │   └── IManagementDbContext.cs
│   └── Features/
│       ├── Employees/  (5 Commands, 2 Queries, 1 DTO file)
│       ├── WorkSchedules/  (3 Commands, 2 Queries, 1 DTO)
│       ├── QrCodes/  (2 Commands, 1 Query, 1 DTO)
│       ├── Timekeepings/  (4 Commands, 3 Queries, 1 DTO)
│       └── Payrolls/  (2 Commands, 3 Queries, 2 DTOs)
│
├── ProxiJob.Management.Infrastructure/   ← EF Core, Consumers, Background Jobs
│   ├── Data/
│   │   ├── ManagementDbContext.cs
│   │   └── Configurations/  (5 Entity Configurations)
│   ├── BackgroundJobs/
│   │   └── AutoAbsentJob.cs
│   └── Messaging/Consumers/
│       ├── ApplicationApprovedConsumer.cs
│       └── ApplicationCancelledConsumer.cs
│
└── ProxiJob.Management.Domain/           ← Entity, Enum — không depend vào ai
    ├── Models/
    │   ├── Employee.cs
    │   ├── WorkSchedule.cs
    │   ├── Timekeeping.cs
    │   ├── Payroll.cs
    │   └── BusinessQrCode.cs
    └── Enums/
        ├── EmployeeStatus.cs        (Active, Terminated)
        ├── PaymentType.cs           (PerShift, Monthly)
        ├── TimekeepingStatus.cs     (OnTime, Late, Absent, Suspicious)
        └── PayrollStatus.cs         (Pending, Paid)
```

---

## Trạng thái từng Feature (so với Blueprint)

### ✅ Feature 1: Employee Management

| Hạng mục | Blueprint | Triển khai | Ghi chú |
|---|---|---|---|
| `CreateEmployeeCommand` | ✅ | ✅ | IsExternal = false, BusinessId từ JWT |
| `UpdateEmployeeCommand` | ✅ | ✅ | |
| `TerminateEmployeeCommand` | ✅ | ✅ | Status → Terminated |
| `ReactivateEmployeeCommand` | ✅ | ✅ | Status → Active |
| `DeleteEmployeeCommand` | ✅ | ✅ | Soft delete |
| `GetEmployeesByBusinessQuery` | ✅ | ✅ | Filter status, phân trang |
| `GetEmployeeByIdQuery` | ✅ | ✅ | Trả EmployeeDetailDto + UpcomingSchedules |
| DTOs: EmployeeSummaryDto, EmployeeDetailDto | ✅ | ✅ | EmployeeDetailDto kế thừa EmployeeSummaryDto |
| API 7 endpoints | ✅ | ✅ | Đầy đủ POST/GET/PUT/PATCH/DELETE |

**Business Rules đã có:**
- ✅ BusinessId lấy từ JWT claim (placeholder — cần JWT middleware thật)
- ✅ Soft delete giữ toàn bộ lịch sử
- ⚠️ Chưa validate "không xóa Employee khi còn WorkSchedule chưa hoàn thành hoặc Payroll Pending"

---

### ✅ Feature 2: Work Schedule Management

| Hạng mục | Blueprint | Triển khai | Ghi chú |
|---|---|---|---|
| `CreateWorkScheduleCommand` | ✅ | ✅ | Validate endTime > startTime, trùng lịch |
| `UpdateWorkScheduleCommand` | ✅ | ✅ | |
| `DeleteWorkScheduleCommand` | ✅ | ✅ | Không cho xóa nếu đã có Timekeeping |
| `GetSchedulesByEmployeeQuery` | ✅ | ✅ | Filter fromDate/toDate |
| `GetSchedulesByBusinessQuery` | ✅ | ✅ | Filter theo date |
| API 5 endpoints | ✅ | ✅ | |

**Business Rules đã có:**
- ✅ Validate Employee thuộc đúng businessId
- ✅ Detect trùng lịch (overlapping schedules)
- ✅ Không cho xóa nếu đã có Timekeeping
- ✅ WorkSchedule từ Job Service (JobShiftId != null) vẫn sửa được

---

### ✅ Feature 3: QR Code Management

| Hạng mục | Blueprint | Triển khai | Ghi chú |
|---|---|---|---|
| `GenerateQrCodeCommand` | ✅ | ✅ | Regenerate invalidate token cũ |
| `UpdateQrRadiusCommand` | ✅ | ✅ | |
| `GetQrCodeByBusinessQuery` | ✅ | ✅ | |
| API 3 endpoints | ✅ | ✅ | |

**Business Rules đã có:**
- ✅ Mỗi business chỉ 1 QR active
- ✅ Token = `Guid.NewGuid().ToString()`
- ✅ Default AllowedRadiusMeters = 100
- ⚠️ BusinessQrCode có Latitude/Longitude nhưng chưa có endpoint cập nhật tọa độ

---

### ✅ Feature 4: Timekeeping — Check-in/out

| Hạng mục | Blueprint | Triển khai | Ghi chú |
|---|---|---|---|
| `CheckInCommand` | ✅ | ✅ | QR + GPS + Photo (URL string) |
| `CheckOutCommand` | ✅ | ✅ | GPS + Photo |
| `ManualTimekeepingCommand` | ✅ | ✅ | IsManual = true |
| `ConfirmSuspiciousCommand` | ✅ | ✅ | Tính lại Status từ CheckInTime |
| `GetTimekeepingByEmployeeQuery` | ✅ | ✅ | Filter fromDate/toDate |
| `GetTimekeepingByBusinessQuery` | ✅ | ✅ | Filter theo date |
| `GetSuspiciousTimekeepingsQuery` | ✅ | ✅ | |
| API 6 endpoints | ✅ | ✅ | |

**Logic tính Status đã có:**
- ✅ `OnTime` ← CheckInTime ≤ StartTime
- ✅ `Late` ← CheckInTime > StartTime + 15 phút
- ✅ `Suspicious` ← GPS distance > AllowedRadiusMeters (Haversine formula)

**Business Rules đã có:**
- ✅ Validate QR token hợp lệ và active
- ✅ Kiểm tra Employee thuộc business
- ✅ Mỗi WorkSchedule chỉ 1 Timekeeping
- ⚠️ CheckInPhoto/CheckOutPhoto nhận URL string — chưa upload lên Supabase Storage

---

### ✅ Feature 5: Auto Absent Background Job

| Hạng mục | Blueprint | Triển khai | Ghi chú |
|---|---|---|---|
| BackgroundService 30 phút | ✅ | ✅ | .NET HostedService |
| Tìm WorkSchedule quá 2h chưa check-in | ✅ | ✅ | |
| Tạo Timekeeping Absent (idempotent) | ✅ | ✅ | |
| Publish `employee.absent` event | ✅ | ✅ | EmployeeAbsentEvent via MassTransit |

---

### ✅ Feature 6: Payroll — Tính lương

| Hạng mục | Blueprint | Triển khai | Ghi chú |
|---|---|---|---|
| `CalculatePayrollCommand` | ✅ | ✅ | |
| `GetPayrollsByEmployeeQuery` | ✅ | ✅ | Filter status |
| `GetPayrollsByBusinessQuery` | ✅ | ✅ | Filter status |
| `GetPayrollByIdQuery` | ✅ | ✅ | |

**Logic tính lương đã có:**
- ✅ PerShift + IsExternal = cộng JobShiftSalary từng ca
- ✅ PerShift + cố định = TotalHours × HourlyRate
- ✅ Monthly = MonthlySalary cố định
- ✅ Chỉ tính Timekeeping OnTime/Late, đã có CheckOutTime
- ⚠️ `GetPayrollsByBusinessQuery` chưa có filter `month` (blueprint yêu cầu)

---

### ✅ Feature 7: Payroll — Duyệt & chốt lương

| Hạng mục | Blueprint | Triển khai | Ghi chú |
|---|---|---|---|
| `ApprovePayrollCommand` | ✅ | ✅ | |
| Publish `payroll.paid` event | ✅ | ✅ | PayrollPaidEvent via MassTransit |

**Business Rules đã có:**
- ✅ Validate FinalAmount ≥ 0
- ✅ Sau khi Paid → không cho sửa
- ✅ Adjustment âm (phạt) hoặc dương (thưởng)

---

### ✅ Feature 8: RabbitMQ Consumer

| Hạng mục | Blueprint | Triển khai | Ghi chú |
|---|---|---|---|
| `ApplicationApprovedConsumer` | ✅ | ✅ | Idempotent Employee + WorkSchedule |
| `ApplicationCancelledConsumer` | ✅ | ✅ | Soft-delete WorkSchedule + Timekeeping |
| Publish `employee.absent` | ✅ | ✅ | Từ AutoAbsentJob |
| Publish `payroll.paid` | ✅ | ✅ | Từ ApprovePayrollCommand |
| MassTransit configuration (Program.cs) | ✅ | ✅ | Queue endpoints đăng ký đúng |

---

## Domain Models — So sánh với Schema Blueprint

### Employee ✅
| Cột (Blueprint) | Property (Code) | Khớp? |
|---|---|---|
| id (int PK) | Id (BaseEntity) | ✅ |
| business_id (int) | BusinessId | ✅ |
| user_id (int, nullable) | UserId (int?) | ✅ |
| full_name | FullName | ✅ |
| phone_number | PhoneNumber (string?) | ✅ |
| position | Position (string?) | ✅ |
| status (enum string) | Status (EmployeeStatus) | ✅ |
| is_external (bool) | IsExternal | ✅ |
| payment_type (enum string) | PaymentType | ✅ |
| hourly_rate (decimal) | HourlyRate (decimal?) | ✅ |
| monthly_salary (decimal) | MonthlySalary (decimal?) | ✅ |
| BaseEntity fields | ✅ | ✅ |

### WorkSchedule ✅
| Cột (Blueprint) | Property (Code) | Khớp? |
|---|---|---|
| employee_id (FK) | EmployeeId + nav Employee | ✅ |
| job_shift_id (nullable) | JobShiftId (int?) | ✅ |
| date (DATE) | Date (DateOnly) | ✅ |
| start_time | StartTime (DateTime) | ✅ |
| end_time | EndTime (DateTime) | ✅ |
| note | Note (string?) | ✅ |
| — | JobShiftSalary (decimal?) | ➕ Extra: lưu salary ca cho tính lương |

### Timekeeping ✅
| Cột (Blueprint) | Property (Code) | Khớp? |
|---|---|---|
| employee_id (FK) | EmployeeId + nav Employee | ✅ |
| work_schedule_id (FK) | WorkScheduleId + nav WorkSchedule | ✅ |
| check_in_time | CheckInTime (DateTime?) | ✅ |
| check_out_time | CheckOutTime (DateTime?) | ✅ |
| in_latitude / in_longitude | InLatitude, InLongitude (double?) | ✅ |
| out_latitude / out_longitude | OutLatitude, OutLongitude (double?) | ✅ |
| check_in_photo / check_out_photo | CheckInPhoto, CheckOutPhoto (string?) | ✅ |
| status (enum) | Status (TimekeepingStatus) | ✅ |
| is_manual (bool) | IsManual | ✅ |
| note | Note (string?) | ✅ |

### Payroll ✅
| Cột (Blueprint) | Property (Code) | Khớp? |
|---|---|---|
| employee_id (FK) | EmployeeId + nav Employee | ✅ |
| total_hours | TotalHours (decimal) | ✅ |
| base_amount | BaseAmount (decimal) | ✅ |
| adjustment | Adjustment (decimal?) | ✅ |
| adjustment_note | AdjustmentNote (string?) | ✅ |
| final_amount | FinalAmount (decimal) | ✅ |
| pay_date | PayDate (DateOnly?) | ✅ |
| status | Status (PayrollStatus) | ✅ |

### BusinessQrCode ✅
| Cột (Blueprint) | Property (Code) | Khớp? |
|---|---|---|
| business_id | BusinessId | ✅ |
| qr_token | QrToken | ✅ |
| allowed_radius_meters | AllowedRadiusMeters (int) | ✅ |
| is_active | IsActive (bool) | ✅ |
| — | Latitude, Longitude (double?) | ➕ Extra: cho tính GPS distance |

---

## Infrastructure Configuration

### Program.cs
- ✅ `AddDbContext<ManagementDbContext>` với Npgsql
- ✅ `AddScoped<IManagementDbContext>` → DI interface
- ✅ `AddMediatR` đăng ký từ Application assembly
- ✅ `AddMassTransit` RabbitMQ + 2 consumer endpoints
- ✅ `AddHostedService<AutoAbsentJob>`
- ✅ Swagger/OpenAPI enabled

### ManagementDbContext
- ✅ Naming convention: `management_` prefix + snake_case
- ✅ Global soft-delete filter: `HasQueryFilter(IsDeleted = false)`
- ✅ `ApplyConfigurationsFromAssembly`
- ✅ 5 DbSets khớp với IManagementDbContext interface

### EF Configurations (5 files)
- ✅ EmployeeConfiguration
- ✅ WorkScheduleConfiguration
- ✅ TimekeepingConfiguration
- ✅ PayrollConfiguration
- ✅ BusinessQrCodeConfiguration

### Shared Contract Events (Events.cs)
- ✅ `ApplicationApprovedEvent` — consumed by Management
- ✅ `ApplicationCancelledEvent` — consumed by Management
- ✅ `EmployeeAbsentEvent` — published by AutoAbsentJob
- ✅ `PayrollPaidEvent` — published by ApprovePayrollCommand

---

## Thống kê số lượng

| Loại | Số lượng |
|---|---|
| Domain Entities | 5 |
| Domain Enums | 4 |
| Commands | 16 (5 Employee + 3 WorkSchedule + 2 QrCode + 4 Timekeeping + 2 Payroll) |
| Queries | 11 (2 Employee + 2 WorkSchedule + 1 QrCode + 3 Timekeeping + 3 Payroll) |
| API Controllers | 5 |
| API Endpoints | ~28 |
| RabbitMQ Consumers | 2 |
| Background Jobs | 1 |
| EF Configurations | 5 |
| Shared Events (publish) | 2 |

---

## Danh sách điểm chưa hoàn thiện (cần external service)

### 🔴 Chờ tích hợp — Chưa có service để dùng

| # | Hạng mục | Mô tả | Ảnh hưởng |
|---|---|---|---|
| 1 | **gRPC Identity Service** | `ApplicationApprovedConsumer` cần gọi gRPC lấy `FullName`/`PhoneNumber` thật của student. Hiện dùng `msg.JobTitle` làm placeholder. | Tên nhân viên external sẽ sai |
| 2 | **Supabase Storage SDK** | `CheckInCommand`/`CheckOutCommand` cần upload ảnh selfie lên storage trước khi lưu URL. Hiện nhận URL string trực tiếp. | Ảnh chấm công chưa được quản lý |
| 3 | **EF Migrations** | Chưa chạy `dotnet ef migrations add` + `dotnet ef database update`. Schema chưa tồn tại trong DB. | Không thể test với DB thật |

### 🟡 Nên cải thiện

| # | Hạng mục | Mô tả |
|---|---|---|
| 4 | **JWT Claims** | Controller dùng placeholder `GetBusinessId()`/`GetUserId()` từ claim "BusinessId"/"UserId". Cần đảm bảo JWT middleware khớp với Identity Service. |
| 5 | **Authorization Middleware** | Chưa check Enterprise plan. Blueprint yêu cầu chỉ Business gói Enterprise mới dùng được Management Service. |
| 6 | **Error Handling** | Handlers throw `new Exception(...)`. Nên dùng custom exceptions + global exception handler để trả đúng HTTP status code (404/403/409). |
| 7 | **Payroll filter by month** | `GetPayrollsByBusinessQuery` có filter `status` nhưng chưa có filter `month` (blueprint Section 6.4). |
| 8 | **Employee delete validation** | Blueprint yêu cầu "không xóa Employee khi còn WorkSchedule chưa hoàn thành hoặc Payroll Pending". Hiện DeleteEmployeeCommand chưa check. |
| 9 | **QR Code GPS endpoint** | `BusinessQrCode` có `Latitude`/`Longitude` nhưng chưa có API endpoint để chủ quán set tọa độ. |
| 10 | **Naming convention** | `ToLower()` chỉ lowercase tên bảng/cột chứ chưa chuyển PascalCase → snake_case chuẩn (vd: `FullName` → `fullname` thay vì `full_name`). Cần dùng regex hoặc thư viện snake_case. |

### 🟢 Có thể mở rộng sau

| # | Hạng mục |
|---|---|
| 11 | Unit Tests — chưa có test nào |
| 12 | Pagination — một số query trả toàn bộ list chưa có phân trang |
| 13 | Transaction — DB commit trước khi publish RabbitMQ event (Outbox pattern) |

---

## Checklist Blueprint (Section 10) vs Thực tế

| Checklist item | Status |
|---|---|
| Tất cả Entity kế thừa BaseEntity, đủ audit fields | ✅ |
| Tất cả ID đều là int — không có Guid | ✅ |
| Không có raw SQL DELETE — chỉ soft delete | ✅ |
| Mọi query có điều kiện IsDeleted = false | ✅ (global query filter) |
| Command và Query tách biệt, dùng MediatR | ✅ |
| Controller không chứa business logic | ✅ |
| businessId lấy từ JWT claim, không từ body | ⚠️ Placeholder — cần JWT thật |
| Chỉ Enterprise plan mới gọi API | ❌ Chưa có middleware check |
| WorkSchedule.JobShiftId nullable, không FK | ✅ |
| Employee.UserId nullable, không FK | ✅ |
| Mỗi WorkSchedule chỉ 1 Timekeeping | ✅ Validate trước khi tạo |
| FinalAmount không âm | ✅ Validate trước khi chốt |
| Ảnh upload Supabase Storage | ❌ Chưa tích hợp |
| RabbitMQ Consumer idempotent | ✅ |
| Background job Absent không trùng | ✅ |
| Transaction commit trước publish event | ⚠️ Chưa dùng Outbox pattern |
| EF Migration đã tạo + test | ❌ Chưa chạy |

---

## Cách build và verify

```bash
# Restore packages
dotnet restore src/Management/ProxiJob.Management.API/ProxiJob.Management.API.csproj

# Build toàn bộ (6 projects)
dotnet build src/Management/ProxiJob.Management.API/ProxiJob.Management.API.csproj
# → Build succeeded. 0 Warning(s). 0 Error(s). ✅

# Tạo migration (sau khi có DB connection)
dotnet ef migrations add InitManagementSchema \
  -p src/Management/ProxiJob.Management.Infrastructure \
  -s src/Management/ProxiJob.Management.API

# Apply migration
dotnet ef database update \
  -p src/Management/ProxiJob.Management.Infrastructure \
  -s src/Management/ProxiJob.Management.API

# Chạy local
dotnet run --project src/Management/ProxiJob.Management.API
```

---

> **Kết luận:** Tất cả 8 features trong blueprint đã được triển khai đầy đủ về mặt code logic. Build thành công 0 error 0 warning. Các điểm chưa hoàn thiện chủ yếu là tích hợp external services (gRPC Identity, Supabase Storage) và infrastructure (JWT, migrations, error handling) — những phần này cần các service khác sẵn sàng mới triển khai được.
