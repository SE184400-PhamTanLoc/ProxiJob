# ProxiJob — Job Service: AI Agent Implementation Guide
**Version:** 1.0 | **Team:** 04 | **Service:** `job-service`

---

## 0. Nguyên tắc bắt buộc (Đọc trước khi làm bất cứ điều gì)

Đây là "hiến pháp" mà agent phải tuân thủ tuyệt đối trong suốt quá trình implement. Bất kỳ code nào vi phạm các quy tắc dưới đây đều phải được sửa lại trước khi tiếp tục.

### 0.1 Kiến trúc Clean Architecture — 4 tầng bắt buộc

```
JobService/
├── JobService.Domain/          # Entity, Enum — KHÔNG reference tầng nào khác
├── JobService.Application/     # Use Cases, CQRS, DTOs, Interfaces
├── JobService.Infrastructure/  # EF Core, Supabase, RabbitMQ, gRPC client
└── JobService.API/             # Controllers, Middleware — Startup Project
```

**Dependency rule:**
- `Domain` ← không depend vào gì cả
- `Application` ← chỉ depend vào `Domain`
- `Infrastructure` ← depend vào `Application` + `Domain`
- `API` ← depend vào `Application` + `Infrastructure`

### 0.2 BaseEntity — Tất cả Entity phải kế thừa

Mọi class trong tầng `Domain` **bắt buộc** kế thừa `BaseEntity` từ `ProxiJob.Shared.Kernel`:

```csharp
// ProxiJob.Shared.Kernel.BaseEntity
public abstract class BaseEntity
{
    public int Id { get; set; }                          // PK, Auto Increment
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = "System";   // Username/Email
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }             // Nullable — NULL = chưa xóa
    public string? DeletedBy { get; set; }               // Nullable — Username/Email người xóa
}
```

**Cách dùng soft delete đúng chuẩn:**
```csharp
entity.IsDeleted = true;
entity.DeletedAt = DateTime.UtcNow;
entity.DeletedBy = currentUser;   // lấy từ JWT claim
```

### 0.3 CQRS với MediatR

Tầng `Application` tách biệt hoàn toàn:
- **Command** = thao tác ghi (Create, Update, Delete) → trả về `id` hoặc `bool`
- **Query** = thao tác đọc → trả về DTO, không bao giờ trả về Entity trực tiếp

### 0.4 Soft Delete

Không được dùng `DELETE` SQL. Mọi thao tác xóa phải set `IsDeleted = true` và điền `UpdatedBy`.  
Mọi query đọc dữ liệu **bắt buộc** có điều kiện `WHERE is_deleted = false`.

### 0.5 Thứ tự implement trong mỗi Feature

Với mỗi feature, agent phải đi theo thứ tự sau, **hoàn thiện xong mới sang bước tiếp**:

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

**Tên service:** `job-service`  
**Database:** PostgreSQL trên Supabase — toàn bộ bảng nằm trong schema **`public`** (mặc định)  
**Port:** `5002` (local dev)  
**Responsibilities:**
- Toàn bộ vòng đời của tin tuyển dụng: tạo, cập nhật, đóng
- Quản lý ca làm việc (shifts) gắn với từng tin
- Tiếp nhận và xử lý đơn ứng tuyển của sinh viên
- Phân loại kỹ năng (Skills) và mapping với JobPost
- Phát sự kiện bất đồng bộ qua RabbitMQ khi có thay đổi quan trọng

---

## 2. Database Schema — `public` (Supabase)

> Tất cả bảng đều nằm trong schema **`public`** mặc định của PostgreSQL/Supabase. Không có schema tách biệt giữa các service. EF Core kết nối thẳng vào `public`, không cần cấu hình schema prefix.

### Bảng `job_posts`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | SERIAL (int, PK) | Auto increment |
| business_id | int | ID của chủ quán — tham chiếu tới Identity Service, **không có FK constraint** |
| category_id | int | FK → `job_categories.id` |
| title | VARCHAR(200) | NOT NULL |
| description | TEXT | Mô tả chi tiết công việc |
| requirements | TEXT | Yêu cầu ứng viên |
| status | VARCHAR(20) | Enum string: `Draft`, `Published`, `Closed` |
| created_at | TIMESTAMPTZ | Default now() |
| created_by | VARCHAR(100) | Username/Email |
| updated_at | TIMESTAMPTZ | Nullable |
| updated_by | VARCHAR(100) | Nullable |
| is_deleted | BOOLEAN | Default false |
| deleted_at | TIMESTAMPTZ | Nullable — NULL = chưa xóa |
| deleted_by | VARCHAR(100) | Nullable — Username/Email người xóa |

### Bảng `job_locations`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | SERIAL (int, PK) | |
| job_post_id | int | FK → `job_posts.id` |
| address | TEXT | Địa chỉ dạng text, NOT NULL |
| latitude | DOUBLE PRECISION | Tọa độ vĩ độ — kiểu `double` trong C# |
| longitude | DOUBLE PRECISION | Tọa độ kinh độ — kiểu `double` trong C# |
| created_at | TIMESTAMPTZ | |
| created_by | VARCHAR(100) | |
| updated_at | TIMESTAMPTZ | Nullable |
| updated_by | VARCHAR(100) | Nullable |
| is_deleted | BOOLEAN | Default false |
| deleted_at | TIMESTAMPTZ | Nullable |
| deleted_by | VARCHAR(100) | Nullable |

> **Lưu ý:** `JobLocation` **không có** cột `GEOGRAPHY(POINT)` trong EF Core entity. Cột PostGIS nếu cần cho Matching Service sẽ được thêm bằng raw migration SQL riêng, **không** map vào C# entity. Matching Service nhận `lat`/`lng` qua gRPC và tự xử lý spatial query.

### Bảng `job_shifts`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | SERIAL (int, PK) | |
| job_post_id | int | FK → job_posts.id |
| start_time | TIMESTAMPTZ | Thời điểm bắt đầu ca |
| end_time | TIMESTAMPTZ | Thời điểm kết thúc ca |
| salary | DECIMAL(10,2) | Lương cho ca này |
| slots | int | Tổng số chỗ cần tuyển |
| remaining_slots | int | Số chỗ còn lại (tự giảm khi có người được duyệt) |
| created_at | TIMESTAMPTZ | |
| created_by | VARCHAR(100) | |
| updated_at | TIMESTAMPTZ | Nullable |
| updated_by | VARCHAR(100) | Nullable |
| is_deleted | BOOLEAN | Default false |
| deleted_at | TIMESTAMPTZ | Nullable |
| deleted_by | VARCHAR(100) | Nullable |

### Bảng `job_categories`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | SERIAL (int, PK) | |
| name | VARCHAR(100) | Vd: "Phục vụ", "Pha chế", "Thu ngân" — NOT NULL |
| description | TEXT | Nullable |
| created_at | TIMESTAMPTZ | |
| created_by | VARCHAR(100) | |
| updated_at | TIMESTAMPTZ | Nullable |
| updated_by | VARCHAR(100) | Nullable |
| is_deleted | BOOLEAN | Default false |
| deleted_at | TIMESTAMPTZ | Nullable |
| deleted_by | VARCHAR(100) | Nullable |

### Bảng `skills`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | SERIAL (int, PK) | |
| name | VARCHAR(100) | Vd: "Tiếng Anh", "POS Machine" |
| description | TEXT | Nullable |
| created_at | TIMESTAMPTZ | |
| created_by | VARCHAR(100) | |
| updated_at | TIMESTAMPTZ | Nullable |
| updated_by | VARCHAR(100) | Nullable |
| is_deleted | BOOLEAN | Default false |
| deleted_at | TIMESTAMPTZ | Nullable |
| deleted_by | VARCHAR(100) | Nullable |

### Bảng `job_post_skills` (Many-to-many)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | SERIAL (int, PK) | |
| job_post_id | int | FK → job_posts.id |
| skill_id | int | FK → skills.id |
| created_at | TIMESTAMPTZ | |
| created_by | VARCHAR(100) | |
| is_deleted | BOOLEAN | Default false |
| deleted_at | TIMESTAMPTZ | Nullable |
| deleted_by | VARCHAR(100) | Nullable |

### Bảng `applications`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | SERIAL (int, PK) | |
| job_shift_id | int | FK → `job_shifts.id` |
| student_id | int | ID của sinh viên — tham chiếu tới Identity Service, **không có FK constraint** |
| cv_url | TEXT | Nullable — link file CV trên Supabase Storage |
| introduction | TEXT | Lời nhắn từ sinh viên, Nullable |
| status | VARCHAR(20) | Enum string: `Pending`, `Approved`, `Rejected` |
| created_at | TIMESTAMPTZ | |
| created_by | VARCHAR(100) | |
| updated_at | TIMESTAMPTZ | Nullable |
| updated_by | VARCHAR(100) | Nullable |
| is_deleted | BOOLEAN | Default false |
| deleted_at | TIMESTAMPTZ | Nullable |
| deleted_by | VARCHAR(100) | Nullable |

### Bảng `application_histories`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | SERIAL (int, PK) | |
| application_id | int | FK → applications.id |
| status | VARCHAR(20) | Trạng thái tại thời điểm ghi log |
| note | TEXT | Nullable — lý do thay đổi |
| changed_at | TIMESTAMPTZ | Default now() |
| created_by | VARCHAR(100) | |
| is_deleted | BOOLEAN | Default false |
| deleted_at | TIMESTAMPTZ | Nullable |
| deleted_by | VARCHAR(100) | Nullable |

---

## 2b. Entity — Code thực tế (Domain Layer)

Đây là các Entity đã được định nghĩa sẵn. Agent **không được tự ý thêm property** ngoài danh sách dưới đây mà không có chỉ định.

### Các Entity hiện có

| Entity | File | Ghi chú quan trọng |
|---|---|---|
| `JobPost` | `Domain/Models/JobPost.cs` | `BusinessId` là `int` — tham chiếu Identity Service |
| `JobLocation` | `Domain/Models/JobLocation.cs` | Chỉ có `Latitude`/`Longitude` dạng `double`, **không** có PostGIS column |
| `JobShift` | `Domain/JobShift.cs` | `RemainingSlots` — chỉ thay đổi qua approve/reject |
| `Application` | `Domain/Models/Application.cs` | `StudentId` là `int` — tham chiếu Identity Service |
| `ApplicationHistory` | `Domain/Models/ApplicationHistory.cs` | `ChangedAt` là `DateTime`, default `UtcNow` |
| `Skill` | `Domain/Models/Skill.cs` | Chưa có navigation property |

### Các Entity còn thiếu — Agent cần tạo thêm

| Entity | Ghi chú |
|---|---|
| `JobCategory` | `Domain/Models/JobCategory.cs` — Name, Description. Kế thừa BaseEntity |
| `JobPostSkill` | `Domain/Models/JobPostSkill.cs` — Many-to-many: JobPostId (int) + SkillId (int) |

### Quan hệ giữa Entity (để config EF Core Fluent API)

```
JobPost        1 ──── 1  JobLocation        (HasOne / WithOne, FK: JobPostId)
JobPost        1 ──── N  JobShift           (HasMany / WithOne, FK: JobPostId)
JobPost        N ──── 1  JobCategory        (HasOne / WithMany, FK: CategoryId)
JobPost        N ──── N  Skill              (qua JobPostSkill)
JobShift       1 ──── N  Application        (HasMany / WithOne, FK: JobShiftId)
Application    1 ──── N  ApplicationHistory (HasMany / WithOne, FK: ApplicationId)
```

### ⚠️ Điểm đặc biệt cần lưu ý

- `BusinessId` (trong `JobPost`) và `StudentId` (trong `Application`) là kiểu **`int`**, giống toàn bộ các ID khác trong hệ thống. Đây là ID từ Identity Service, **không có FK constraint** trong schema `public`.
- `Status` trên cả `JobPost` và `Application` là **`string`**, không phải `enum` C#. Khi validate, so sánh với các hằng số string cố định.
- `ApplicationHistory.ChangedAt` là trường riêng biệt, **không** dùng `CreatedAt` từ `BaseEntity` để ghi thời điểm đổi trạng thái.

---

Agent phải implement **theo đúng thứ tự** dưới đây. Hoàn thành Feature N trước khi bắt đầu Feature N+1.

```
Feature 1:  Quản lý danh mục (Categories & Skills)
Feature 2:  Tạo & quản lý JobPost
Feature 3:  Quản lý JobShift (Ca làm việc)
Feature 4:  Ứng tuyển (Application)
Feature 5:  Duyệt / Từ chối đơn ứng tuyển
Feature 6:  Đóng JobPost
Feature 7:  gRPC endpoints (cho Matching Service gọi vào)
Feature 8:  RabbitMQ event publishing
```

---

## Feature 1: Quản lý danh mục (Categories & Skills)

**Mục đích:** Seed dữ liệu nền, cho phép admin quản lý danh mục công việc và kỹ năng. `JobCategory` là bảng nội bộ của Job Service — không phụ thuộc service khác.

### 1.1 Commands
| Command | Input | Output | Mô tả |
|---|---|---|---|
| `CreateCategoryCommand` | name, description, createdBy | categoryId (int) | Tạo danh mục mới |
| `UpdateCategoryCommand` | categoryId, name, description, updatedBy | bool | Sửa danh mục |
| `DeleteCategoryCommand` | categoryId, deletedBy | bool | Xóa mềm danh mục |
| `CreateSkillCommand` | name, description, createdBy | skillId (int) | Tạo kỹ năng mới |
| `UpdateSkillCommand` | skillId, name, description, updatedBy | bool | Sửa kỹ năng |
| `DeleteSkillCommand` | skillId, deletedBy | bool | Xóa mềm kỹ năng |

### 1.2 Queries
| Query | Input | Output | Mô tả |
|---|---|---|---|
| `GetAllCategoriesQuery` | — | `List<CategoryDto>` | Lấy tất cả danh mục |
| `GetAllSkillsQuery` | — | `List<SkillDto>` | Lấy tất cả kỹ năng |

### 1.3 DTOs
**`CategoryDto`** gồm: id, name, description

**`SkillDto`** gồm: id, name, description

### 1.4 API Endpoints
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/categories` | Admin | Tạo danh mục |
| GET | `/api/categories` | Public | Lấy danh sách danh mục |
| PUT | `/api/categories/{id}` | Admin | Sửa danh mục |
| DELETE | `/api/categories/{id}` | Admin | Xóa danh mục |
| POST | `/api/skills` | Admin | Tạo kỹ năng |
| GET | `/api/skills` | Public | Lấy danh sách kỹ năng |
| PUT | `/api/skills/{id}` | Admin | Sửa kỹ năng |
| DELETE | `/api/skills/{id}` | Admin | Xóa kỹ năng |

### 1.5 Quy tắc nghiệp vụ
- Không được tạo trùng `name` (case-insensitive) trong cùng bảng.
- Không thể xóa `JobCategory` khi còn `JobPost` đang dùng `CategoryId` đó và chưa `Closed`/`IsDeleted`.
- Xóa dùng soft delete: set `IsDeleted = true`, `DeletedAt`, `DeletedBy`.

---

## Feature 2: Tạo & quản lý JobPost

**Mục đích:** Cho phép chủ quán (Business) tạo tin tuyển dụng, gắn địa điểm và kỹ năng yêu cầu.

### 2.1 Flow tạo JobPost (1 request, transaction)

```
Client (Business) gửi request
    │
    ▼
[API] POST /api/job-posts
    │  Body: title, description, requirements, categoryId,
    │        location{address, lat, lng}, skillIds[]
    ▼
[Application] CreateJobPostCommand Handler
    │
    ├─ Validate: categoryId tồn tại, skillIds[] hợp lệ
    ├─ Tạo JobPost với status = "Draft"
    ├─ Tạo JobLocation từ {address, lat, lng}
    ├─ Tạo các bản ghi JobPostSkill (mapping)
    └─ Commit transaction → trả về jobPostId
```

### 2.2 Flow publish JobPost

```
Client gửi PATCH /api/job-posts/{id}/publish
    │
    ▼
[Application] PublishJobPostCommand Handler
    │
    ├─ Kiểm tra: JobPost thuộc về businessId của user đang gọi
    ├─ Kiểm tra: JobPost có ít nhất 1 JobShift (nếu không có → lỗi 400)
    ├─ Kiểm tra: status hiện tại phải là "Draft"
    ├─ Cập nhật status → "Published"
    └─ [Sau khi commit] Phát RabbitMQ event: job.published
```

### 2.3 Commands
| Command | Input | Output |
|---|---|---|
| `CreateJobPostCommand` | title, description, requirements, categoryId (int), location{address, lat, lng}, skillIds[] (int[]), createdBy | jobPostId (int) |
| `UpdateJobPostCommand` | jobPostId (int), title, description, requirements, updatedBy | bool |
| `PublishJobPostCommand` | jobPostId (int), businessId (**int**), updatedBy | bool |
| `CloseJobPostCommand` | jobPostId (int), businessId (**int**), updatedBy | bool |
| `DeleteJobPostCommand` | jobPostId (int), businessId (**int**), updatedBy | bool |

### 2.4 Queries
| Query | Input | Output |
|---|---|---|
| `GetJobPostByIdQuery` | jobPostId | `JobPostDetailDto` |
| `GetJobPostsByBusinessQuery` | businessId, page, pageSize | `PagedResult<JobPostSummaryDto>` |
| `GetPublishedJobPostsQuery` | categoryId?, page, pageSize | `PagedResult<JobPostSummaryDto>` |

### 2.5 DTOs
**`JobPostDetailDto`** gồm: id, title, description, requirements, status, categoryName, location{address, lat, lng}, skills[], shifts[], createdAt, createdBy

**`JobPostSummaryDto`** gồm: id, title, status, categoryName, address, shiftCount, createdAt

### 2.6 API Endpoints
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/job-posts` | Business | Tạo JobPost (draft) |
| GET | `/api/job-posts/{id}` | Authenticated | Xem chi tiết |
| GET | `/api/job-posts` | Public | Danh sách đã publish |
| GET | `/api/job-posts/my` | Business | Tin của tôi |
| PUT | `/api/job-posts/{id}` | Business (owner) | Cập nhật thông tin |
| PATCH | `/api/job-posts/{id}/publish` | Business (owner) | Đăng tin |
| PATCH | `/api/job-posts/{id}/close` | Business (owner) | Đóng tin |
| DELETE | `/api/job-posts/{id}` | Business (owner) | Xóa mềm |

### 2.7 Quy tắc nghiệp vụ
- Chỉ `Business` role mới được tạo JobPost.
- `businessId` lấy từ JWT claim dạng **`int`**, **không** nhận từ body request.
- JobPost chỉ có thể `Publish` khi đang ở trạng thái `"Draft"`.
- JobPost chỉ có thể `Close` khi đang ở trạng thái `"Published"`.
- Được phép sửa JobPost ở trạng thái `"Draft"` và `"Published"` — **không** sửa được khi `"Closed"`.
- Khi verify ownership, so sánh `jobPost.BusinessId == callerBusinessId` (cả hai đều là `int`).

---

## Feature 3: Quản lý JobShift (Ca làm việc)

**Mục đích:** Cho phép chủ quán tạo các ca cụ thể gắn với JobPost, sinh viên sẽ ứng tuyển vào ca chứ không phải vào tin.

### 3.1 Flow tạo Shift

```
POST /api/job-posts/{jobPostId}/shifts
    │  Body: startTime, endTime, salary, slots
    ▼
[Application] CreateJobShiftCommand Handler
    │
    ├─ Validate: JobPost tồn tại và thuộc business_id hiện tại
    ├─ Validate: endTime > startTime
    ├─ Validate: salary > 0, slots >= 1
    ├─ Tạo JobShift với remaining_slots = slots
    └─ Trả về shiftId
```

### 3.2 Commands
| Command | Input | Output |
|---|---|---|
| `CreateJobShiftCommand` | jobPostId, startTime, endTime, salary, slots, createdBy | shiftId |
| `UpdateJobShiftCommand` | shiftId, startTime, endTime, salary, slots, updatedBy | bool |
| `DeleteJobShiftCommand` | shiftId, deletedBy | bool |

### 3.3 Queries
| Query | Input | Output |
|---|---|---|
| `GetShiftsByJobPostQuery` | jobPostId | `List<JobShiftDto>` |
| `GetShiftByIdQuery` | shiftId | `JobShiftDto` |

### 3.4 API Endpoints
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/job-posts/{jobPostId}/shifts` | Business (owner) | Tạo ca |
| GET | `/api/job-posts/{jobPostId}/shifts` | Authenticated | Xem các ca |
| PUT | `/api/job-posts/{jobPostId}/shifts/{shiftId}` | Business (owner) | Sửa ca |
| DELETE | `/api/job-posts/{jobPostId}/shifts/{shiftId}` | Business (owner) | Xóa ca |

### 3.5 Quy tắc nghiệp vụ
- Không thể tạo/sửa/xóa Shift khi JobPost đã ở trạng thái `"Closed"`.
- Không thể sửa/xóa Shift khi đã có **ít nhất 1 Application** với status `"Approved"` cho shift đó.
- `RemainingSlots` **không được chỉnh tay** — chỉ thay đổi tự động khi Application được `Approved` hoặc bị cancel.

---

## Feature 4: Ứng tuyển — 1-Click Apply

**Mục đích:** Sinh viên ứng tuyển nhanh vào một ca làm việc cụ thể.

### 4.1 Flow ứng tuyển

```
POST /api/shifts/{shiftId}/apply
    │  Body: introduction (optional)
    │  JWT: studentId
    ▼
[Application] ApplyShiftCommand Handler
    │
    ├─ Validate: Shift tồn tại, IsDeleted = false
    ├─ Validate: JobPost của shift đang ở trạng thái "Published"
    ├─ Validate: RemainingSlots > 0
    ├─ Validate: Sinh viên chưa ứng tuyển shift này (không có Application Pending/Approved)
    ├─ Validate: Sinh viên không có ca Approved nào trùng giờ với shift này
    ├─ Gọi gRPC tới Identity Service → lấy CvUrl từ profile sinh viên
    ├─ Tạo Application với status = "Pending", CvUrl lấy từ profile
    ├─ Tạo bản ghi ApplicationHistory (status: Pending, note: "Đã nộp đơn")
    └─ Phát RabbitMQ event: shift.applied → thông báo cho Business (chủ quán của tin)
```

### 4.2 Commands
| Command | Input | Output |
|---|---|---|
| `ApplyShiftCommand` | shiftId (int), studentId (int), introduction? (string), createdBy | applicationId (int) |
| `WithdrawApplicationCommand` | applicationId (int), studentId (int), updatedBy | bool |

### 4.3 Queries
| Query | Input | Output |
|---|---|---|
| `GetMyApplicationsQuery` | studentId (**int**), status?, page, pageSize | `PagedResult<ApplicationDto>` |
| `GetApplicationsByShiftQuery` | shiftId (int), status?, page, pageSize | `PagedResult<ApplicationDto>` |
| `GetApplicationByIdQuery` | applicationId (int) | `ApplicationDetailDto` |

### 4.4 DTOs
**`ApplicationDto`** gồm: id, shiftId, shiftStartTime, shiftEndTime, salary, jobTitle, status, createdAt

**`ApplicationDetailDto`** gồm: tất cả trên + introduction, cvUrl, histories[]

### 4.5 API Endpoints
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/shifts/{shiftId}/apply` | Student | Ứng tuyển |
| DELETE | `/api/applications/{id}/withdraw` | Student (owner) | Rút đơn |
| GET | `/api/applications/my` | Student | Đơn của tôi |
| GET | `/api/shifts/{shiftId}/applications` | Business (owner) | Xem đơn của 1 ca |
| GET | `/api/applications/{id}` | Student/Business | Xem chi tiết đơn |

### 4.6 Quy tắc nghiệp vụ
- `studentId` lấy từ JWT claim dạng **`int`**, không nhận từ body.
- `CvUrl` **không** nhận từ request — tự động lấy từ profile sinh viên qua gRPC Identity Service.
- `Introduction` là optional — sinh viên có thể để trống.
- Sinh viên được ứng tuyển **nhiều ca khác nhau** trong cùng 1 JobPost, miễn không trùng giờ.
- Kiểm tra trùng giờ: so sánh `StartTime`/`EndTime` với các shift đã `Approved` của sinh viên đó.
- Chỉ được rút đơn khi `Status = "Pending"`.
- Mỗi lần `Status` thay đổi **bắt buộc** tạo 1 bản ghi `ApplicationHistory` với `ChangedAt = DateTime.UtcNow`.

---

## Feature 5: Duyệt / Từ chối / Hủy duyệt đơn ứng tuyển

**Mục đích:** Chủ quán xem xét và ra quyết định với từng đơn ứng tuyển.

### 5.1 Flow duyệt đơn (Approve)

```
PATCH /api/applications/{id}/approve
    │
    ▼
[Application] ApproveApplicationCommand Handler
    │
    ├─ Validate: Application tồn tại, status = "Pending"
    ├─ Validate: Caller là businessId của JobPost liên quan
    ├─ Validate: RemainingSlots > 0 (kiểm tra lại lần cuối)
    ├─ Cập nhật Application.status = "Approved"
    ├─ Giảm JobShift.RemainingSlots đi 1
    ├─ Tạo ApplicationHistory (status: Approved)
    ├─ Nếu RemainingSlots = 0 → tự động Reject tất cả đơn Pending còn lại của shift đó
    │   └─ Mỗi reject tạo ApplicationHistory (note: "Đã đủ số lượng")
    └─ Phát RabbitMQ event: application.approved → thông báo cho sinh viên được duyệt
```

### 5.2 Flow từ chối đơn (Reject)

```
PATCH /api/applications/{id}/reject
    │  Body: note? (lý do từ chối — optional)
    ▼
[Application] RejectApplicationCommand Handler
    │
    ├─ Validate: Application tồn tại, status = "Pending"
    ├─ Validate: Caller là businessId của JobPost liên quan
    ├─ Cập nhật Application.status = "Rejected"
    ├─ Tạo ApplicationHistory (status: Rejected, note: lý do nếu có)
    └─ Phát RabbitMQ event: application.rejected → thông báo cho sinh viên bị từ chối
```

### 5.3 Flow hủy duyệt (Cancel Approved)

```
PATCH /api/applications/{id}/cancel
    │  Body: note (lý do hủy — bắt buộc)
    ▼
[Application] CancelApplicationCommand Handler
    │
    ├─ Validate: Application tồn tại, status = "Approved"
    ├─ Validate: Caller là businessId của JobPost liên quan
    ├─ Validate: note không được để trống
    ├─ Cập nhật Application.status = "Cancelled"
    ├─ Tăng JobShift.RemainingSlots lên 1
    ├─ Tạo ApplicationHistory (status: Cancelled, note: lý do)
    └─ Phát RabbitMQ event: application.cancelled → thông báo cho sinh viên bị hủy duyệt
```

### 5.4 Commands
| Command | Input | Output |
|---|---|---|
| `ApproveApplicationCommand` | applicationId, updatedBy | bool |
| `RejectApplicationCommand` | applicationId, note? (optional), updatedBy | bool |
| `CancelApplicationCommand` | applicationId, note (bắt buộc), updatedBy | bool |

### 5.5 API Endpoints
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| PATCH | `/api/applications/{id}/approve` | Business (owner) | Duyệt đơn |
| PATCH | `/api/applications/{id}/reject` | Business (owner) | Từ chối đơn |
| PATCH | `/api/applications/{id}/cancel` | Business (owner) | Hủy duyệt đơn |

### 5.6 Quy tắc nghiệp vụ
- Không thể approve khi `RemainingSlots = 0` → trả lỗi 409 Conflict.
- `RemainingSlots` phải được cập nhật trong cùng 1 transaction với approve/cancel.
- Reject chỉ áp dụng cho đơn đang `"Pending"`.
- Cancel chỉ áp dụng cho đơn đang `"Approved"` — bắt buộc có lý do.
- Status `"Cancelled"` cần thêm vào bảng `applications` — bổ sung vào Enum string: `Pending`, `Approved`, `Rejected`, `Cancelled`.

---

## Feature 6: Đóng JobPost

**Mục đích:** Chủ quán kết thúc tuyển dụng, gỡ tin khỏi danh sách public.

### 6.1 Flow

```
PATCH /api/job-posts/{id}/close
    │
    ▼
[Application] CloseJobPostCommand Handler
    │
    ├─ Validate: JobPost status = "Published"
    ├─ Validate: Caller là businessId của JobPost
    ├─ Cập nhật JobPost.status = "Closed" → không hiển thị trên public nữa
    ├─ Tự động Reject tất cả Application còn "Pending" thuộc các Shift của post này
    │   └─ Mỗi reject tạo ApplicationHistory (note: "Bài đăng đã đóng")
    ├─ Giữ nguyên các Application đã "Approved" — lưu trong lịch sử
    └─ Phát RabbitMQ event: job.closed → thông báo cho các sinh viên đang Pending
```

### 6.2 Commands
| Command | Input | Output |
|---|---|---|
| `CloseJobPostCommand` | jobPostId, updatedBy | bool |

### 6.3 Quy tắc nghiệp vụ
- Sau khi `Closed`, tin **không hiển thị** trong `GET /api/job-posts` (public listing).
- Tin vẫn xem được qua `GET /api/job-posts/{id}` và `GET /api/job-posts/my` (Business xem lịch sử của mình).
- Không có auto-close theo thời gian — chủ quán tự tay đóng.

---

## Feature 7: gRPC Endpoints (cho Matching Service)

**Mục đích:** Matching Service gọi vào Job Service để lấy danh sách jobs kèm tọa độ và thông tin đủ để hiển thị thông báo cho sinh viên gần đó.

### 7.1 Proto definition (đặt tại `Shared.Contract/Protos/job_service.proto`)

```
Service: JobGrpcService

RPC: GetPublishedJobs
    Request:  (không có filter — trả tất cả jobs đang Published)
    Response: List<JobPostGrpcDto>
              {
                jobPostId,
                title,
                address,
                latitude,
                longitude,
                categoryName,
                minSalary,       // lương thấp nhất trong các shift
                remainingSlots   // tổng remaining_slots của tất cả shift
              }

RPC: GetJobPostById
    Request:  jobPostId (int)
    Response: JobPostGrpcDto (đầy đủ các trường trên)
```

> **Lưu ý:** Job Service **không thực hiện spatial query**. Job Service chỉ trả `latitude` + `longitude` dạng `double`. Việc tính khoảng cách `ST_DWithin()` là trách nhiệm của **Matching Service**.

### 7.2 Infrastructure implementation
- Implement `JobGrpcService` trong `JobService.Infrastructure`
- Query: tất cả `JobPost` có `Status = "Published"` và `IsDeleted = false`, include `Location` + `Category` + `Shifts`
- `minSalary` = `Shifts.Min(s => s.Salary)`
- `remainingSlots` = `Shifts.Sum(s => s.RemainingSlots)`

---

## Feature 8: RabbitMQ Event Publishing

**Mục đích:** Thông báo cho đúng đối tượng liên quan khi có thay đổi quan trọng.

### 8.1 Danh sách Events cần publish

| Event | Publish khi | Gửi tới ai |
|---|---|---|
| `job.published` | JobPost được publish | Matching Service → tìm sinh viên gần đó → push thông báo |
| `job.closed` | JobPost đóng | Các sinh viên đang có đơn `Pending` trong tin đó |
| `job.updated` | JobPost được sửa khi đang `Published` | Các sinh viên đã `Approved` trong tin đó |
| `shift.applied` | Sinh viên nộp đơn | Chủ quán (businessId) của tin đó |
| `application.approved` | Đơn được duyệt | Sinh viên có đơn được duyệt (studentId) |
| `application.rejected` | Đơn bị từ chối | Sinh viên có đơn bị từ chối (studentId) |
| `application.cancelled` | Chủ quán hủy duyệt | Sinh viên bị hủy duyệt (studentId) |

### 8.2 Payload tối thiểu cho từng Event

| Event | Payload |
|---|---|
| `job.published` | jobPostId, businessId, title, address, lat, lng, categoryName, minSalary |
| `job.closed` | jobPostId, affectedStudentIds[] |
| `job.updated` | jobPostId, title, approvedStudentIds[] |
| `shift.applied` | applicationId, shiftId, studentId, businessId, jobTitle |
| `application.approved` | applicationId, studentId, jobTitle, shiftStartTime, shiftEndTime |
| `application.rejected` | applicationId, studentId, jobTitle, note? |
| `application.cancelled` | applicationId, studentId, jobTitle, note |

### 8.3 Cách implement
- Sử dụng **MassTransit** để publish, **không** gọi RabbitMQ client trực tiếp
- Tất cả Event class đặt tại `ProxiJob.Shared.Contract/Events/`
- Publish event **sau khi** transaction DB đã commit thành công
- Nếu publish thất bại, log lỗi và tiếp tục — không rollback transaction DB

---

## 9. Error Handling Convention

Tất cả Controller phải trả về HTTP status code đúng chuẩn:

| Tình huống | Status Code |
|---|---|
| Thành công, có data | 200 OK |
| Tạo mới thành công | 201 Created |
| Không tìm thấy resource | 404 Not Found |
| Không có quyền | 403 Forbidden |
| Validation lỗi | 400 Bad Request |
| Conflict (vd: hết slot) | 409 Conflict |
| Lỗi server | 500 Internal Server Error |

Response body lỗi chuẩn:
```json
{
  "success": false,
  "message": "Mô tả lỗi rõ ràng bằng tiếng Việt",
  "errors": []
}
```

---

## 10. Checklist trước khi merge PR

Agent cần tự kiểm tra toàn bộ danh sách này trước khi coi một Feature là "Done":

- [ ] Tất cả Entity kế thừa `BaseEntity`, có đủ audit fields + `DeletedAt` + `DeletedBy`
- [ ] Tất cả `Id`, `BusinessId`, `StudentId` đều là kiểu `int` — không dùng `Guid` ở bất kỳ đâu
- [ ] Không có raw SQL DELETE — chỉ dùng soft delete (`IsDeleted = true`, `DeletedAt = UtcNow`, `DeletedBy = currentUser`)
- [ ] Mọi query có điều kiện lọc `IsDeleted = false`
- [ ] Command và Query tách biệt hoàn toàn, dùng MediatR
- [ ] Controller không chứa business logic — chỉ gọi MediatR và trả HTTP response
- [ ] `businessId` (int) và `studentId` (int) lấy từ JWT claim, **không** từ request body
- [ ] `CvUrl` lấy từ Identity Service qua gRPC, không nhận từ request body
- [ ] Transaction DB commit trước khi publish RabbitMQ event
- [ ] Tất cả thay đổi `Application.Status` đều có bản ghi `ApplicationHistory` với `ChangedAt = UtcNow`
- [ ] `RemainingSlots` chỉ thay đổi trong transaction approve/cancel, không sửa trực tiếp qua API
- [ ] Application status có đủ 4 giá trị: `Pending`, `Approved`, `Rejected`, `Cancelled`
- [ ] `job.updated` chỉ publish khi JobPost đang ở trạng thái `Published`
- [ ] `JobCategory` và `JobPostSkill` đã được tạo Entity + EF config
- [ ] Không query hoặc hardcode tên schema nào khác ngoài `public`
- [ ] EF Core Migration đã được tạo và test `dotnet ef database update`
- [ ] Nhánh Git theo đúng format: `feature/job-service-[tên-feature]`
