# ProxiJob — Management Service: AI Agent Implementation Guide
**Version:** 1.0 | **Team:** 04 | **Service:** `management-service`

---

## 0. Nguyên tắc bắt buộc (Đọc trước khi làm bất cứ điều gì)

### 0.1 Kiến trúc Clean Architecture — 4 tầng bắt buộc

```
ManagementService/
├── ManagementService.Domain/          # Entity, Enum — KHÔNG reference tầng nào khác
├── ManagementService.Application/     # Use Cases, CQRS, DTOs, Interfaces
├── ManagementService.Infrastructure/  # EF Core, RabbitMQ Consumer, gRPC client
└── ManagementService.API/             # Controllers, Middleware — Startup Project
```

**Dependency rule:**
- `Domain` ← không depend vào gì cả
- `Application` ← chỉ depend vào `Domain`
- `Infrastructure` ← depend vào `Application` + `Domain`
- `API` ← depend vào `Application` + `Infrastructure`

### 0.2 BaseEntity — Tất cả Entity phải kế thừa

```csharp
// ProxiJob.Shared.Kernel.BaseEntity
public abstract class BaseEntity
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = "System";
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
}
```

**Soft delete đúng chuẩn:**
```csharp
entity.IsDeleted = true;
entity.DeletedAt = DateTime.UtcNow;
entity.DeletedBy = currentUser; // lấy từ JWT claim
```

### 0.3 CQRS với MediatR
- **Command** = thao tác ghi (Create, Update, Delete) → trả về `id` hoặc `bool`
- **Query** = thao tác đọc → trả về DTO, **không bao giờ** trả về Entity trực tiếp

### 0.4 Quy tắc bắt buộc
- Không dùng `DELETE` SQL — chỉ soft delete
- Mọi query **bắt buộc** có điều kiện `IsDeleted = false`
- Tất cả ID đều là kiểu `int` — không dùng `Guid`
- `BusinessId` lấy từ JWT claim, **không** nhận từ request body
- Controller không chứa business logic — chỉ gọi MediatR

### 0.5 Thứ tự implement trong mỗi Feature

```
1. Domain Entity (nếu chưa có)
2. Application — DTOs
3. Application — Command hoặc Query Handler
4. Infrastructure — EF Core config + Migration
5. API — Controller endpoint
6. Test thủ công: gọi endpoint, kiểm tra DB
```

---

## 1. Tổng quan Service

**Tên service:** `management-service`
**Database:** PostgreSQL trên Supabase — toàn bộ bảng trong schema `public`
**Port:** `5004` (local dev)
**Chỉ dành cho:** Business role với gói **Enterprise**
**Responsibilities:**
- Quản lý danh sách nhân viên của quán (nội bộ + từ Job Service)
- Xếp lịch làm việc cho nhân viên
- Chấm công GPS + QR + ảnh selfie
- Tính lương và duyệt thanh toán
- Lắng nghe event từ Job Service qua RabbitMQ

---

## 2. Database Schema — `public`

### Bảng `employees`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | SERIAL (int, PK) | |
| business_id | int | ID chủ quán — lấy từ JWT, không có FK constraint |
| user_id | int | Nullable — NULL nếu nhân viên không có tài khoản ProxiJob |
| full_name | VARCHAR(200) | NOT NULL |
| phone_number | VARCHAR(20) | Nullable |
| position | VARCHAR(100) | Chức vụ — string tự nhập, nullable |
| status | VARCHAR(20) | Enum string: `Active`, `Terminated` |
| is_external | BOOLEAN | true = từ Job Service, false = chủ quán tự thêm |
| payment_type | VARCHAR(20) | Enum string: `PerShift`, `Monthly` |
| hourly_rate | DECIMAL(10,2) | Nullable — dùng khi PaymentType = PerShift (nhân viên cố định) |
| monthly_salary | DECIMAL(10,2) | Nullable — dùng khi PaymentType = Monthly |
| created_at | TIMESTAMPTZ | |
| created_by | VARCHAR(100) | |
| updated_at | TIMESTAMPTZ | Nullable |
| updated_by | VARCHAR(100) | Nullable |
| is_deleted | BOOLEAN | Default false |
| deleted_at | TIMESTAMPTZ | Nullable |
| deleted_by | VARCHAR(100) | Nullable |

> **Lưu ý:** Nhân viên từ Job Service (IsExternal = true) dùng `JobShift.Salary` để tính lương theo ca — không dùng `HourlyRate`. `HourlyRate` chỉ dùng cho nhân viên cố định tính theo giờ.

### Bảng `work_schedules`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | SERIAL (int, PK) | |
| employee_id | int | FK → employees.id |
| job_shift_id | int | Nullable — NULL nếu xếp lịch thủ công không qua Job Service |
| date | DATE | Ngày làm việc |
| start_time | TIMESTAMPTZ | Giờ bắt đầu ca |
| end_time | TIMESTAMPTZ | Giờ kết thúc ca |
| note | TEXT | Nullable |
| created_at | TIMESTAMPTZ | |
| created_by | VARCHAR(100) | |
| updated_at | TIMESTAMPTZ | Nullable |
| updated_by | VARCHAR(100) | Nullable |
| is_deleted | BOOLEAN | Default false |
| deleted_at | TIMESTAMPTZ | Nullable |
| deleted_by | VARCHAR(100) | Nullable |

### Bảng `timekeepings`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | SERIAL (int, PK) | |
| employee_id | int | FK → employees.id |
| work_schedule_id | int | FK → work_schedules.id |
| check_in_time | TIMESTAMPTZ | Nullable — NULL nếu chưa check-in |
| check_out_time | TIMESTAMPTZ | Nullable — NULL nếu chưa check-out |
| in_latitude | DOUBLE PRECISION | Nullable |
| in_longitude | DOUBLE PRECISION | Nullable |
| out_latitude | DOUBLE PRECISION | Nullable |
| out_longitude | DOUBLE PRECISION | Nullable |
| check_in_photo | TEXT | Nullable — URL ảnh selfie lúc check-in trên Supabase Storage |
| check_out_photo | TEXT | Nullable — URL ảnh selfie lúc check-out |
| status | VARCHAR(20) | Enum string: `OnTime`, `Late`, `Absent`, `Suspicious` |
| is_manual | BOOLEAN | Default false — true nếu chủ quán điền thủ công |
| note | TEXT | Nullable — ghi chú khi điền thủ công hoặc xác nhận Suspicious |
| created_at | TIMESTAMPTZ | |
| created_by | VARCHAR(100) | |
| updated_at | TIMESTAMPTZ | Nullable |
| updated_by | VARCHAR(100) | Nullable |
| is_deleted | BOOLEAN | Default false |
| deleted_at | TIMESTAMPTZ | Nullable |
| deleted_by | VARCHAR(100) | Nullable |

### Bảng `payrolls`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | SERIAL (int, PK) | |
| employee_id | int | FK → employees.id |
| total_hours | DECIMAL(10,2) | Tổng giờ làm từ Timekeeping |
| base_amount | DECIMAL(10,2) | Lương tự động tính trước khi điều chỉnh |
| adjustment | DECIMAL(10,2) | Nullable — số tiền điều chỉnh (+ thưởng, - phạt) |
| adjustment_note | TEXT | Nullable — lý do điều chỉnh |
| final_amount | DECIMAL(10,2) | = base_amount + adjustment |
| pay_date | DATE | Nullable — ngày chốt lương |
| status | VARCHAR(20) | Enum string: `Pending`, `Paid` |
| created_at | TIMESTAMPTZ | |
| created_by | VARCHAR(100) | |
| updated_at | TIMESTAMPTZ | Nullable |
| updated_by | VARCHAR(100) | Nullable |
| is_deleted | BOOLEAN | Default false |
| deleted_at | TIMESTAMPTZ | Nullable |
| deleted_by | VARCHAR(100) | Nullable |

### Bảng `business_qr_codes`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | SERIAL (int, PK) | |
| business_id | int | Mỗi quán có 1 QR code duy nhất |
| qr_token | VARCHAR(200) | Token ngẫu nhiên để verify — NOT NULL, UNIQUE |
| allowed_radius_meters | int | Bán kính cho phép check-in, default 100 |
| is_active | BOOLEAN | Default true |
| created_at | TIMESTAMPTZ | |
| created_by | VARCHAR(100) | |
| updated_at | TIMESTAMPTZ | Nullable |
| updated_by | VARCHAR(100) | Nullable |
| is_deleted | BOOLEAN | Default false |
| deleted_at | TIMESTAMPTZ | Nullable |
| deleted_by | VARCHAR(100) | Nullable |

---

## 3. Entity Mapping (Domain Layer)

### Quan hệ giữa Entity

```
Employee       1 ──── N  WorkSchedule     (HasMany / WithOne, FK: EmployeeId)
Employee       1 ──── N  Timekeeping      (HasMany / WithOne, FK: EmployeeId)
Employee       1 ──── N  Payroll          (HasMany / WithOne, FK: EmployeeId)
WorkSchedule   1 ──── 1  Timekeeping      (HasOne / WithOne, FK: WorkScheduleId)
Business       1 ──── 1  BusinessQrCode   (HasOne / WithOne, FK: BusinessId)
```

### ⚠️ Điểm đặc biệt
- `WorkSchedule.JobShiftId` là int nullable — **không có FK constraint** sang Job Service
- `Employee.UserId` là int nullable — **không có FK constraint** sang Identity Service
- `Employee.BusinessId` là int — **không có FK constraint** sang Identity Service
- Tất cả ID đều là `int`, không có `Guid` ở bất kỳ đâu

---

## 4. Danh sách Features — Thứ tự implement

```
Feature 1:  Employee Management (CRUD + auto-create từ RabbitMQ)
Feature 2:  Work Schedule Management
Feature 3:  QR Code Management
Feature 4:  Timekeeping — Check-in/out
Feature 5:  Timekeeping — Xử lý Absent tự động + Suspicious
Feature 6:  Payroll — Tính lương tự động
Feature 7:  Payroll — Duyệt & chốt lương
Feature 8:  RabbitMQ Consumer (application.approved + application.cancelled)
```

---

## Feature 1: Employee Management

**Mục đích:** Quản lý danh sách nhân viên của quán — 2 nguồn: thủ công và tự động từ Job Service.

### 1.1 Flow tạo thủ công

```
POST /api/employees
    │  Body: fullName, phoneNumber?, position?, paymentType,
    │        hourlyRate?, monthlySalary?, userId? (nếu có tài khoản ProxiJob)
    │  JWT: businessId
    ▼
[Application] CreateEmployeeCommand Handler
    │
    ├─ businessId lấy từ JWT claim
    ├─ Tạo Employee với IsExternal = false, Status = "Active"
    └─ Trả về employeeId
```

### 1.2 Flow tạo tự động (từ RabbitMQ — xem Feature 8)

```
Nhận event: application.approved
    │  Payload: studentId, businessId, jobShiftId, startTime, endTime, salary
    ▼
[Application] HandleApplicationApprovedCommand
    │
    ├─ Kiểm tra: đã có Employee với UserId = studentId VÀ BusinessId = businessId chưa?
    │   ├─ Chưa có → gọi gRPC Identity Service lấy FullName, PhoneNumber
    │   │            → Tạo Employee mới (IsExternal = true, PaymentType = "PerShift", Status = "Active")
    │   └─ Đã có → dùng lại Employee cũ, không tạo mới
    └─ Tạo WorkSchedule từ jobShiftId, startTime, endTime (xem Feature 2)
```

### 1.3 Commands
| Command | Input | Output |
|---|---|---|
| `CreateEmployeeCommand` | fullName, phoneNumber?, position?, paymentType, hourlyRate?, monthlySalary?, userId?, businessId, createdBy | employeeId (int) |
| `UpdateEmployeeCommand` | employeeId, fullName, phoneNumber, position, paymentType, hourlyRate?, monthlySalary?, updatedBy | bool |
| `TerminateEmployeeCommand` | employeeId, updatedBy | bool |
| `DeleteEmployeeCommand` | employeeId, deletedBy | bool |
| `ReactivateEmployeeCommand` | employeeId, updatedBy | bool |

### 1.4 Queries
| Query | Input | Output |
|---|---|---|
| `GetEmployeesByBusinessQuery` | businessId, status?, page, pageSize | `PagedResult<EmployeeSummaryDto>` |
| `GetEmployeeByIdQuery` | employeeId | `EmployeeDetailDto` |

### 1.5 DTOs
**`EmployeeSummaryDto`** gồm: id, fullName, position, status, isExternal, paymentType, createdAt

**`EmployeeDetailDto`** gồm: tất cả trên + phoneNumber, userId, hourlyRate, monthlySalary, upcomingSchedules[]

### 1.6 API Endpoints
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/employees` | Business (Enterprise) | Tạo nhân viên thủ công |
| GET | `/api/employees` | Business (Enterprise) | Danh sách nhân viên của quán |
| GET | `/api/employees/{id}` | Business (Enterprise) | Chi tiết nhân viên |
| PUT | `/api/employees/{id}` | Business (Enterprise) | Cập nhật thông tin |
| PATCH | `/api/employees/{id}/terminate` | Business (Enterprise) | Chuyển sang Terminated |
| PATCH | `/api/employees/{id}/reactivate` | Business (Enterprise) | Kích hoạt lại |
| DELETE | `/api/employees/{id}` | Business (Enterprise) | Xóa mềm |

### 1.7 Quy tắc nghiệp vụ
- Chỉ Business với gói **Enterprise** mới truy cập được toàn bộ Management Service.
- `businessId` lấy từ JWT claim, không nhận từ body.
- Không thể xóa Employee khi còn WorkSchedule chưa hoàn thành hoặc Payroll đang `Pending`.
- Soft delete giữ toàn bộ lịch sử Timekeeping và Payroll.

---

## Feature 2: Work Schedule Management

**Mục đích:** Xếp lịch làm việc cho nhân viên — thủ công hoặc tự động từ Job Service.

### 2.1 Flow tạo thủ công

```
POST /api/employees/{employeeId}/schedules
    │  Body: date, startTime, endTime, note?
    ▼
[Application] CreateWorkScheduleCommand Handler
    │
    ├─ Validate: Employee tồn tại và thuộc businessId của caller
    ├─ Validate: endTime > startTime
    ├─ Tạo WorkSchedule với JobShiftId = null
    └─ Trả về scheduleId
```

### 2.2 Flow tạo tự động (từ application.approved)

```
Sau khi tạo/xác định Employee (Feature 1)
    │
    ▼
Tạo WorkSchedule:
    ├─ EmployeeId = employee.Id
    ├─ JobShiftId = jobShiftId từ event payload
    ├─ Date = date của StartTime
    ├─ StartTime = startTime từ event payload
    └─ EndTime = endTime từ event payload
```

### 2.3 Commands
| Command | Input | Output |
|---|---|---|
| `CreateWorkScheduleCommand` | employeeId, date, startTime, endTime, note?, jobShiftId?, createdBy | scheduleId (int) |
| `UpdateWorkScheduleCommand` | scheduleId, date, startTime, endTime, note?, updatedBy | bool |
| `DeleteWorkScheduleCommand` | scheduleId, deletedBy | bool |

### 2.4 Queries
| Query | Input | Output |
|---|---|---|
| `GetSchedulesByEmployeeQuery` | employeeId, fromDate, toDate | `List<WorkScheduleDto>` |
| `GetSchedulesByBusinessQuery` | businessId, date | `List<WorkScheduleDto>` |

### 2.5 API Endpoints
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/employees/{employeeId}/schedules` | Business (Enterprise) | Tạo lịch thủ công |
| GET | `/api/employees/{employeeId}/schedules` | Business (Enterprise) | Lịch của 1 nhân viên |
| GET | `/api/schedules` | Business (Enterprise) | Lịch toàn bộ nhân viên theo ngày |
| PUT | `/api/schedules/{id}` | Business (Enterprise) | Sửa lịch |
| DELETE | `/api/schedules/{id}` | Business (Enterprise) | Xóa lịch |

### 2.6 Quy tắc nghiệp vụ
- Không thể xóa WorkSchedule đã có Timekeeping record.
- Không thể tạo 2 WorkSchedule trùng giờ cho cùng 1 Employee.
- WorkSchedule từ Job Service (JobShiftId != null) vẫn có thể sửa giờ nếu chủ quán cần điều chỉnh.

---

## Feature 3: QR Code Management

**Mục đích:** Mỗi quán có 1 QR code duy nhất để nhân viên quét khi check-in.

### 3.1 Flow generate QR

```
POST /api/qr-code/generate
    │  JWT: businessId
    ▼
[Application] GenerateQrCodeCommand Handler
    │
    ├─ Kiểm tra: businessId đã có QR chưa?
    │   ├─ Chưa → tạo mới BusinessQrCode với qrToken = random GUID string
    │   └─ Đã có → regenerate token mới (invalidate token cũ)
    └─ Trả về qrToken + allowedRadiusMeters
```

### 3.2 Commands
| Command | Input | Output |
|---|---|---|
| `GenerateQrCodeCommand` | businessId, createdBy | qrToken (string) |
| `UpdateQrRadiusCommand` | businessId, allowedRadiusMeters, updatedBy | bool |

### 3.3 Queries
| Query | Input | Output |
|---|---|---|
| `GetQrCodeByBusinessQuery` | businessId | `QrCodeDto` |

### 3.4 API Endpoints
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/qr-code/generate` | Business (Enterprise) | Tạo/regenerate QR |
| GET | `/api/qr-code` | Business (Enterprise) | Xem QR hiện tại |
| PATCH | `/api/qr-code/radius` | Business (Enterprise) | Đổi bán kính cho phép |

### 3.5 Quy tắc nghiệp vụ
- Mỗi `businessId` chỉ có **1 QR code active** tại một thời điểm.
- Khi regenerate, token cũ lập tức vô hiệu — nhân viên phải dùng QR mới.
- `allowedRadiusMeters` mặc định **100m**, chủ quán có thể tùy chỉnh.

---

## Feature 4: Timekeeping — Check-in/out

**Mục đích:** Nhân viên check-in bằng QR + GPS + ảnh selfie, check-out bằng GPS + ảnh.

### 4.1 Flow Check-in

```
POST /api/timekeeping/check-in
    │  Body: qrToken, latitude, longitude, checkInPhoto (base64 hoặc URL)
    │  JWT: userId (int)
    ▼
[Application] CheckInCommand Handler
    │
    ├─ Validate: qrToken hợp lệ → tìm BusinessQrCode → lấy businessId + allowedRadiusMeters
    ├─ Validate: userId có Employee record với businessId này không
    ├─ Tìm WorkSchedule của Employee hôm nay (Date = today)
    ├─ Validate: chưa có Timekeeping record cho WorkSchedule này
    ├─ Upload ảnh selfie lên Supabase Storage → lấy checkInPhotoUrl
    ├─ Tính khoảng cách GPS: so sánh (lat, lng) với JobLocation của quán
    │   ├─ Trong bán kính → tính Status (OnTime / Late dựa vào StartTime)
    │   └─ Ngoài bán kính → Status = "Suspicious"
    ├─ Tạo Timekeeping record
    └─ Trả về timekeepingId + status
```

### 4.2 Flow Check-out

```
POST /api/timekeeping/check-out
    │  Body: timekeepingId, latitude, longitude, checkOutPhoto (base64 hoặc URL)
    │  JWT: userId (int)
    ▼
[Application] CheckOutCommand Handler
    │
    ├─ Validate: Timekeeping tồn tại, thuộc userId này
    ├─ Validate: CheckOutTime chưa được điền
    ├─ Upload ảnh selfie checkout lên Supabase Storage
    ├─ Điền CheckOutTime, OutLatitude, OutLongitude, CheckOutPhoto
    └─ Cập nhật Timekeeping record
```

### 4.3 Flow Chủ quán điền thủ công

```
POST /api/timekeeping/manual
    │  Body: employeeId, workScheduleId, checkInTime, checkOutTime, note
    │  JWT: businessId
    ▼
[Application] ManualTimekeepingCommand Handler
    │
    ├─ Validate: Employee thuộc businessId của caller
    ├─ Validate: WorkSchedule tồn tại và thuộc Employee này
    ├─ Tạo Timekeeping với IsManual = true
    └─ Tính Status dựa vào StartTime của WorkSchedule
```

### 4.4 Flow Xác nhận Suspicious

```
PATCH /api/timekeeping/{id}/confirm
    │  Body: note (lý do xác nhận)
    │  JWT: businessId
    ▼
    ├─ Validate: Timekeeping có Status = "Suspicious"
    ├─ Validate: Timekeeping thuộc quán của businessId
    ├─ Cập nhật Status → "OnTime" hoặc "Late" (tính lại từ CheckInTime vs StartTime)
    └─ Ghi note xác nhận
```

### 4.5 Logic tính Status
```
OnTime     — CheckInTime ≤ WorkSchedule.StartTime
Late       — CheckInTime > WorkSchedule.StartTime + 15 phút
Absent     — Không có CheckInTime sau WorkSchedule.StartTime + 2 tiếng (xem Feature 5)
Suspicious — GPS check-in ngoài bán kính AllowedRadiusMeters
```

### 4.6 Commands
| Command | Input | Output |
|---|---|---|
| `CheckInCommand` | qrToken, latitude, longitude, checkInPhoto, userId, createdBy | timekeepingId (int) |
| `CheckOutCommand` | timekeepingId, latitude, longitude, checkOutPhoto, updatedBy | bool |
| `ManualTimekeepingCommand` | employeeId, workScheduleId, checkInTime, checkOutTime, note, businessId, createdBy | timekeepingId (int) |
| `ConfirmSuspiciousCommand` | timekeepingId, note, updatedBy | bool |

### 4.7 Queries
| Query | Input | Output |
|---|---|---|
| `GetTimekeepingByEmployeeQuery` | employeeId, fromDate, toDate | `List<TimekeepingDto>` |
| `GetTimekeepingByBusinessQuery` | businessId, date | `List<TimekeepingDto>` |
| `GetSuspiciousTimekeepingsQuery` | businessId | `List<TimekeepingDto>` |

### 4.8 API Endpoints
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/timekeeping/check-in` | Employee (có UserId) | Check-in QR + GPS |
| POST | `/api/timekeeping/check-out` | Employee (có UserId) | Check-out GPS |
| POST | `/api/timekeeping/manual` | Business (Enterprise) | Điền thủ công |
| PATCH | `/api/timekeeping/{id}/confirm` | Business (Enterprise) | Xác nhận Suspicious |
| GET | `/api/timekeeping` | Business (Enterprise) | Xem chấm công theo ngày |
| GET | `/api/timekeeping/suspicious` | Business (Enterprise) | Danh sách bất thường |

### 4.9 Quy tắc nghiệp vụ
- Nhân viên chỉ check-in được nếu có `UserId` — nhân viên không có tài khoản ProxiJob chỉ được điền thủ công bởi chủ quán.
- Mỗi WorkSchedule chỉ có **1 Timekeeping record** duy nhất.
- `checkInPhoto` và `checkOutPhoto` upload lên Supabase Storage trước khi lưu URL vào DB.
- Khoảng cách GPS tính từ tọa độ check-in so với `JobLocation` của quán (lấy qua gRPC Job Service hoặc lưu cache trong `business_qr_codes`).

---

## Feature 5: Timekeeping — Xử lý Absent tự động

**Mục đích:** Hệ thống tự động đánh dấu `Absent` cho nhân viên không check-in sau 2 tiếng kể từ `StartTime`.

### 5.1 Flow

```
[Background Job / Scheduled Task] chạy mỗi 30 phút
    │
    ▼
Tìm tất cả WorkSchedule có:
    ├─ Date = today
    ├─ StartTime + 2 tiếng < DateTime.UtcNow
    └─ Chưa có Timekeeping record
    │
    ▼
Với mỗi WorkSchedule tìm được:
    ├─ Tạo Timekeeping record với Status = "Absent", IsManual = false
    └─ Phát RabbitMQ event: employee.absent → Notification Service thông báo cho Business
```

### 5.2 Implementation
- Dùng **Hangfire** hoặc **BackgroundService** (.NET) để chạy scheduled task
- Chạy mỗi **30 phút** để kiểm tra
- Tạo Timekeeping `Absent` chỉ 1 lần — không tạo trùng

---

## Feature 6: Payroll — Tính lương tự động

**Mục đích:** Tự động tính lương dựa trên Timekeeping, chờ chủ quán duyệt.

### 6.1 Logic tính lương theo PaymentType

**PerShift — Nhân viên từ Job Service (IsExternal = true):**
```
BaseAmount = JobShift.Salary (lấy từ WorkSchedule.JobShiftId qua gRPC Job Service)
TotalHours = (CheckOutTime - CheckInTime).TotalHours
```

**PerShift — Nhân viên cố định:**
```
TotalHours = (CheckOutTime - CheckInTime).TotalHours
BaseAmount = Employee.HourlyRate × TotalHours
```

**Monthly — Nhân viên cố định:**
```
BaseAmount = Employee.MonthlySalary
TotalHours = tổng giờ làm trong tháng (từ Timekeeping)
```

### 6.2 Flow tạo Payroll

```
POST /api/payrolls/calculate
    │  Body: employeeId, fromDate, toDate
    │  JWT: businessId
    ▼
[Application] CalculatePayrollCommand Handler
    │
    ├─ Validate: Employee thuộc businessId
    ├─ Lấy tất cả Timekeeping trong khoảng fromDate → toDate
    │   (chỉ tính Status = "OnTime" hoặc "Late" — bỏ qua Absent, Suspicious chưa confirm)
    ├─ Tính TotalHours và BaseAmount theo PaymentType
    ├─ Tạo Payroll với Status = "Pending", Adjustment = null, FinalAmount = BaseAmount
    └─ Trả về payrollId
```

### 6.3 Commands
| Command | Input | Output |
|---|---|---|
| `CalculatePayrollCommand` | employeeId, fromDate, toDate, businessId, createdBy | payrollId (int) |

### 6.4 Queries
| Query | Input | Output |
|---|---|---|
| `GetPayrollsByEmployeeQuery` | employeeId, status? | `List<PayrollDto>` |
| `GetPayrollsByBusinessQuery` | businessId, status?, month? | `List<PayrollDto>` |
| `GetPayrollByIdQuery` | payrollId | `PayrollDetailDto` |

### 6.5 API Endpoints
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/payrolls/calculate` | Business (Enterprise) | Tạo bảng lương |
| GET | `/api/payrolls` | Business (Enterprise) | Danh sách bảng lương |
| GET | `/api/payrolls/{id}` | Business (Enterprise) | Chi tiết bảng lương |

---

## Feature 7: Payroll — Duyệt & chốt lương

**Mục đích:** Chủ quán review, điều chỉnh thưởng/phạt và chốt lương.

### 7.1 Flow duyệt Payroll

```
PATCH /api/payrolls/{id}/approve
    │  Body: adjustment? (decimal), adjustmentNote? (string)
    │  JWT: businessId
    ▼
[Application] ApprovePayrollCommand Handler
    │
    ├─ Validate: Payroll tồn tại, Status = "Pending"
    ├─ Validate: Payroll thuộc Employee của businessId
    ├─ Cập nhật Adjustment và AdjustmentNote (nếu có)
    ├─ Tính FinalAmount = BaseAmount + Adjustment
    ├─ Cập nhật Status = "Paid", PayDate = DateTime.UtcNow
    └─ Phát RabbitMQ event: payroll.paid → thông báo cho nhân viên (nếu có UserId)
```

### 7.2 Commands
| Command | Input | Output |
|---|---|---|
| `ApprovePayrollCommand` | payrollId, adjustment?, adjustmentNote?, updatedBy | bool |

### 7.3 API Endpoints
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| PATCH | `/api/payrolls/{id}/approve` | Business (Enterprise) | Duyệt + chốt lương |

### 7.4 Quy tắc nghiệp vụ
- Sau khi `Paid` → **không thể sửa** Payroll.
- `Adjustment` có thể âm (phạt) hoặc dương (thưởng).
- `FinalAmount` không được âm — validate trước khi chốt.
- Sau khi `Paid`, phát event để Notification Service thông báo nhân viên → nhân viên xác nhận nhận tiền → trigger đánh giá 2 chiều với Job Service.

---

## Feature 8: RabbitMQ Consumer

**Mục đích:** Lắng nghe event từ Job Service để tự động tạo Employee và WorkSchedule.

### 8.1 Events cần Subscribe

| Event | Từ Service | Xử lý |
|---|---|---|
| `application.approved` | Job Service | Tạo Employee (nếu chưa có) + tạo WorkSchedule |
| `application.cancelled` | Job Service | Xóa WorkSchedule liên quan (soft delete) |

### 8.2 Flow xử lý `application.approved`

```
Nhận event: application.approved
    │  Payload: applicationId, studentId (int), businessId (int),
    │           jobShiftId (int), startTime, endTime, jobTitle
    ▼
1. Kiểm tra Employee: UserId = studentId AND BusinessId = businessId AND IsDeleted = false
   ├─ Chưa có → gọi gRPC Identity Service lấy FullName, PhoneNumber
   │            → Tạo Employee (IsExternal = true, PaymentType = "PerShift", Status = "Active")
   └─ Đã có → lấy employeeId hiện tại

2. Tạo WorkSchedule:
   ├─ EmployeeId = employeeId
   ├─ JobShiftId = jobShiftId
   ├─ Date = date từ startTime
   ├─ StartTime = startTime
   └─ EndTime = endTime
```

### 8.3 Flow xử lý `application.cancelled`

```
Nhận event: application.cancelled
    │  Payload: applicationId, studentId (int), businessId (int), jobShiftId (int)
    ▼
1. Tìm WorkSchedule: EmployeeId của studentId + JobShiftId = jobShiftId
2. Soft delete WorkSchedule đó
3. Nếu Timekeeping liên quan đang Pending → soft delete luôn
```

### 8.4 Event cần Publish

| Event | Publish khi | Gửi tới ai |
|---|---|---|
| `payroll.paid` | Payroll được chốt `Paid` | Nhân viên có UserId (studentId) |
| `employee.absent` | Tự động tạo record Absent | Business (chủ quán) |

### 8.5 Payload

| Event | Payload |
|---|---|
| `payroll.paid` | payrollId, employeeId, studentId, finalAmount, payDate, businessId |
| `employee.absent` | employeeId, workScheduleId, businessId, scheduledStartTime |

---

## 9. Error Handling Convention

| Tình huống | Status Code |
|---|---|
| Thành công, có data | 200 OK |
| Tạo mới thành công | 201 Created |
| Không tìm thấy resource | 404 Not Found |
| Không có quyền / sai Enterprise | 403 Forbidden |
| Validation lỗi | 400 Bad Request |
| Conflict (vd: trùng lịch) | 409 Conflict |
| Lỗi server | 500 Internal Server Error |

---

## 10. Checklist trước khi merge PR

- [ ] Tất cả Entity kế thừa `BaseEntity`, có đủ audit fields + `DeletedAt` + `DeletedBy`
- [ ] Tất cả ID đều là `int` — không có `Guid` ở bất kỳ đâu
- [ ] Không có raw SQL DELETE — chỉ soft delete
- [ ] Mọi query có điều kiện lọc `IsDeleted = false`
- [ ] Command và Query tách biệt hoàn toàn, dùng MediatR
- [ ] Controller không chứa business logic
- [ ] `businessId` lấy từ JWT claim, không từ request body
- [ ] Chỉ Business với gói **Enterprise** mới được gọi API (middleware check)
- [ ] `WorkSchedule.JobShiftId` nullable — không có FK constraint sang Job Service
- [ ] `Employee.UserId` nullable — không có FK constraint sang Identity Service
- [ ] Mỗi WorkSchedule chỉ có 1 Timekeeping record — validate trước khi tạo
- [ ] `FinalAmount` không âm — validate trước khi chốt Payroll
- [ ] Ảnh selfie upload Supabase Storage trước khi lưu URL vào DB
- [ ] RabbitMQ Consumer xử lý idempotent — không tạo duplicate Employee
- [ ] Background job Absent chạy đúng, không tạo trùng record
- [ ] Transaction DB commit trước khi publish RabbitMQ event
- [ ] EF Core Migration đã được tạo và test `dotnet ef database update`
- [ ] Nhánh Git theo đúng format: `feature/management-service-[tên-feature]`
