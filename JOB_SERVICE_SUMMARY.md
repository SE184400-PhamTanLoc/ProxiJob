# PROXIJOB - JOB SERVICE IMPLEMENTATION SUMMARY & HANDOVER NOTE

Tài liệu này tổng hợp toàn bộ các công việc đã thực hiện, cấu trúc mã nguồn, quyết định kiến trúc và lưu ý quan trọng để **AI kế tiếp** có thể dễ dàng nắm bắt bối cảnh và tiếp tục phát triển hoặc gỡ lỗi mà không gặp bất kỳ khó khăn nào.

---

## 1. Trạng Thái Hiện Tại (Current Status)
*   **Trạng thái Build:** Thành công 100% (**0 Errors, 0 Warnings**).
*   **Các tính năng hoàn thành:** Toàn bộ **8 Features** cốt lõi của Job Service theo đặc tả kỹ thuật.
*   **Môi trường công nghệ:** .NET 8, Entity Framework Core (PostgreSQL), MediatR (CQRS Pattern), gRPC (giao tiếp đồng bộ), MassTransit + RabbitMQ (giao tiếp bất đồng bộ).

---

## 2. Chi Tiết Triển Khai 8 Tính Năng (Feature Details)

### 📌 Khởi tạo Foundation & Feature 1: Categories & Skills
*   **BaseEntity:** Bổ sung `DeletedAt` và `DeletedBy` hỗ trợ Soft Delete toàn hệ thống.
*   **Entity Identity:** Đổi kiểu dữ liệu của `BusinessId` và `StudentId` sang kiểu `int`.
*   **Categories & Skills CRUD:** Viết đầy đủ Command/Query và expose REST API qua `CategoriesController` và `SkillsController`.
*   **Database Migration:** Đã chạy migration thành công tạo cấu trúc bảng PostgreSQL với tiền tố `job_` (ví dụ: `job_jobcategories`).

### 📌 Feature 2: JobPost Lifecycle
*   Hỗ trợ đầy đủ các Use Cases: Tạo, sửa, xóa, xuất bản (Publish), đóng (Close), xem chi tiết, và lấy danh sách có phân trang (`PagedResult<T>`).
*   **Location:** Thông tin địa điểm làm việc (`JobLocation`) được lưu trữ chuẩn hóa và đồng bộ với tin tuyển dụng.

### 📌 Feature 3: Job Shifts (Ca làm việc)
*   Ca làm việc (`JobShift`) gắn với từng JobPost.
*   **Ràng buộc nghiệp vụ (Business Rules):**
    *   Tự động gán `RemainingSlots = Slots` khi tạo mới.
    *   Không cho phép chỉnh sửa/xóa ca làm việc nếu đã có đơn ứng tuyển của sinh viên được duyệt (`Status = "Approved"`).

### 📌 Feature 4: Shift Application & gRPC Identity Client
*   **ApplyShiftCommand:** Cho phép sinh viên ứng tuyển (1-Click Apply) vào một ca làm việc cụ thể.
*   **gRPC Integration:** Tích hợp `IdentityServiceGrpcClient` để gọi sang Identity Service lấy URL CV mặc định của sinh viên.
*   **Ràng buộc nghiệp vụ:** Ngăn chặn sinh viên ứng tuyển ca làm việc bị trùng thời gian biểu (conflict schedule) với một ca khác đã được phê duyệt (`Approved`) của cùng sinh viên đó.

### 📌 Feature 5: Duyệt/Từ chối/Hủy đơn ứng tuyển
*   **ApproveApplicationCommand:** 
    *   Khi duyệt đơn, `RemainingSlots` của Ca đó tự động trừ đi 1.
    *   **Auto-Reject:** Nếu số slot còn lại bằng 0, hệ thống tự động chuyển toàn bộ đơn ở trạng thái `Pending` còn lại của ca đó sang `Rejected` với lý do *"Đã đủ số lượng"*.
*   **Reject & Cancel:** Cập nhật trạng thái đơn ứng tuyển và ghi chép lại chi tiết lịch sử vào bảng lịch sử đơn (`ApplicationHistory`).

### 📌 Feature 6: Đóng JobPost
*   **CloseJobPostCommand:** Khi doanh nghiệp chủ động đóng tin tuyển dụng, toàn bộ đơn ứng tuyển ở trạng thái `Pending` trên toàn bộ các ca làm việc của tin đó đều được tự động chuyển sang `Rejected` với lý do *"Bài đăng đã đóng"*.

### 📌 Feature 7: gRPC Service (cho Matching Service)
*   Định nghĩa protobuf contract tại `common/ProxiJob.Shared.Contract/Protos/job_service.proto`.
*   Triển khai `JobGrpcService` trong `Infrastructure/Services` cung cấp 2 endpoints đồng bộ:
    *   `GetPublishedJobs`: Trả về danh sách tin đang Published phục vụ Matching Service.
    *   `GetJobPostById`: Trả về thông tin chi tiết của một tin theo ID.

### 📌 Feature 8: RabbitMQ & MassTransit Event Publishing
*   Cài đặt `MassTransit.RabbitMQ` và cấu hình Bus kết nối RabbitMQ trong [Program.cs](file:///d:/ProxiJob/src/Job/ProxiJob.Job.API/Program.cs).
*   Định nghĩa các Event Records dùng chung tại [Events.cs](file:///d:/ProxiJob/common/ProxiJob.Shared.Contract/Events/Events.cs).
*   Inject `IPublishEndpoint` vào các MediatR Command Handlers để tự động bắn các sự kiện (`JobPublishedEvent`, `JobClosedEvent`, `JobUpdatedEvent`, `ShiftAppliedEvent`, `ApplicationApprovedEvent`, `ApplicationRejectedEvent`, `ApplicationCancelledEvent`) ngay khi lưu cơ sở dữ liệu thành công.

---

## 3. Lưu Ý Đặc Biệt Cho AI Kế Tiếp (Crucial Notes for Next AI)

### ⚠️ Quy tắc Casing & Tên thuộc tính trong Domain Model
Khi thao tác với Model `Application`, hãy chú ý các thuộc tính cụ thể sau để tránh lỗi biên dịch (C# Compiler Errors):
1.  **CVUrl:** Thuộc tính lưu trữ link CV của ứng viên được viết hoa hoàn toàn là **`CVUrl`** (không phải `CvUrl`).
2.  **Histories:** Collection lưu trữ lịch sử thay đổi trạng thái của đơn ứng tuyển được đặt tên là **`Histories`** (không phải `ApplicationHistories`).

### ⚠️ Kiến trúc dự án (Architectural Decisions)
*   Dự án sử dụng mô hình **Clean Architecture + CQRS với MediatR**.
*   **Sử dụng trực tiếp `IJobDbContext`:** Dự án không sử dụng thêm lớp bọc Repository ở tầng Infrastructure để tối ưu hóa hiệu năng truy vấn LINQ linh hoạt ngay trong các Handlers, đồng thời giữ kiến trúc gọn nhẹ, dễ bảo trì.
*   **Soft Delete:** Cấu hình toàn cục thông qua `HasQueryFilter` kiểm tra thuộc tính `IsDeleted == false` trong [JobDbContext.cs](file:///d:/ProxiJob/src/Job/ProxiJob.Job.Infrastructure/Data/JobDbContext.cs). Khi thực hiện xóa, chỉ cần đặt `IsDeleted = true` và `DeletedAt = DateTime.UtcNow`.

---

## 4. Các Lệnh Hữu Ích Khi Làm Việc (Useful Commands)

*   **Lệnh Build dự án:**
    ```powershell
    dotnet build d:\ProxiJob\src\Job\ProxiJob.Job.API
    ```
*   **Lệnh Tạo Migration mới (nếu cập nhật Entity):**
    ```powershell
    dotnet ef migrations add <MigrationName> --project d:\ProxiJob\src\Job\ProxiJob.Job.Infrastructure --startup-project d:\ProxiJob\src\Job\ProxiJob.Job.API
    ```
*   **Lệnh Update Database:**
    ```powershell
    dotnet ef database update --project d:\ProxiJob\src\Job\ProxiJob.Job.Infrastructure --startup-project d:\ProxiJob\src\Job\ProxiJob.Job.API
    ```

---
*Chúc AI tiếp theo làm việc hiệu quả cùng ProxiJob! Hệ thống hiện tại đang ở trạng thái hoàn hảo nhất.*
