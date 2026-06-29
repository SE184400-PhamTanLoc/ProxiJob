# NHẬT KÝ THAY ĐỔI & HOÀN THÀNH CÔNG VIỆC (TODAY)

Hôm nay chúng ta đã hoàn thành toàn bộ hệ thống quyết toán chi phí lương, đối soát 2 chiều, đánh giá chéo giữa Chủ quán - Sinh viên và sửa lỗi tính tiền lệch giờ công. Dưới đây là chi tiết các file đã sửa đổi:

---

## 1. Giao diện Điện thoại (Mobile App - React Native)

### 🗓️ Lịch làm việc Sinh viên (`StudentCalendar.js`)
* **Xác nhận nhận tiền & Đánh giá chéo**: Tích hợp phần hiển thị **"BẢNG LƯƠNG CHỜ BẠN XÁC NHẬN"** ngay dưới thẻ thu nhập. Khi sinh viên ấn xác nhận, một Modal cao cấp hiển thị yêu cầu đánh giá chủ quán (1 - 5 sao) và viết nhận xét trước khi gửi yêu cầu quyết toán cuối cùng.
* **Sửa lỗi tính sai tiền**: Loại bỏ hệ số cứng nhân 4 (`shift.hourlyRate * 4`). Thay thế bằng hàm tính thời gian thực tế `getShiftHours(shift)` lấy hiệu số giữa `startTime` và `endTime` (Ví dụ: ca 1h30p sẽ nhân đúng hệ số `1.5` thay vì mặc định `4`).

### 👤 Hồ sơ cá nhân Sinh viên (`StudentPortfolio.js`)
* **Đồng bộ đánh giá**: Gỡ bỏ dữ liệu giả lập (mock data). Kết nối trực tiếp danh sách nhận xét ở màn hình Hồ sơ cá nhân sinh viên với lịch sử bảng lương thực tế từ database (`usePayrollsQuery`). Sinh viên có thể xem trực tiếp số sao và lời bình luận từ các chủ quán đã từng làm việc.

### 📊 Phân tích Chi phí Chủ quán (`PayrollSettlementScreen.js`)
* **Bảng tính lương điều chỉnh**: Thêm khu vực tính toán chi tiết trong Modal chốt lương gồm: đơn giá đề xuất (đ/h), số giờ làm thực tế từ log điểm danh, ô nhập liệu tùy chọn số giờ chốt lương và các nút chọn nhanh ("Chuẩn 4h", "Thực tế").
* **Tính toán động**: Tự động nhân đơn giá với số giờ và cập nhật tổng tiền phải trả theo thời gian thực trên giao diện trước khi chủ quán bấm chốt lương.
* **Cải tiến Bento Card**: Thẻ **"Quỹ lương chờ chốt"** được tính toán động từ client (cộng dồn các ca đang chờ chốt thực tế + các bảng lương đã chốt đang chờ sinh viên nhận tiền) để đảm bảo số liệu đồng bộ tuyệt đối.

### 🔌 API Client & Hooks (`management.js` & `queries.js`)
* **Định tuyến vai trò**: Hook `usePayrollsQuery` tự động phát hiện vai trò `Student` để gửi yêu cầu API lấy danh sách lương phù hợp.
* **Trích xuất dữ liệu gốc**: Hook `useAttendanceLogsQuery` giữ nguyên chuỗi thời gian gốc (`rawCheckInTime`, `rawCheckOutTime`) để frontend tính toán thời lượng lệch ca làm việc chính xác.

---

## 2. API Backend & Database (.NET 8 Core)

### ⚙️ Xử lý bất đồng bộ MassTransit RabbitMQ (`ConfirmReceiptPayrollCommand.cs`, `ApproveInterimPayrollCommand.cs`, `ApprovePayrollCommand.cs`)
* **Chống treo API (Non-blocking)**: Chuyển lệnh đẩy tin nhắn sự kiện (`_publishEndpoint.Publish`) lên RabbitMQ chạy ngầm bằng `Task.Run` với thời hạn tối đa 2 giây (`CancellationTokenSource`). Đảm bảo khi RabbitMQ cục bộ bị tắt ở localhost, API vẫn phản hồi thành công ngay lập tức mà không bị xoay vòng tải lâu.

### 🧮 Sửa đổi công thức tính lương ca làm lệch giờ (`ApproveInterimPayrollCommand.cs`, `ApprovePayrollCommand.cs`, `CalculatePayrollCommand.cs`)
* **Nhân hệ số giờ**: Thay đổi công thức tính lương từ gán cứng cố định thành nhân đơn giá giờ làm việc thực tế với số giờ công (`totalHours * rate`).
* **Nhận điều chỉnh từ Mobile**: API chốt lương của chủ quán sẵn sàng nhận `TotalHours` và `FinalAmount` được gửi từ mobile để ghi đè số giờ công tùy ý của chủ quán.

### 📈 Thống kê Chi phí tức thì (`GetPayrollAnalyticsQuery.cs` & `PayrollsController.cs`)
* API Thống kê chi phí tháng và Biểu đồ chi phí hiện tại đã tính gộp cả trạng thái `PendingStudentConfirmation` (chủ quán đã chốt lương nhưng sinh viên chưa bấm nhận). Giúp chi phí phản ánh ngay lập tức trên biểu đồ phân tích của doanh nghiệp.
* Thêm API `GET /api/payrolls/student` để sinh viên lấy danh sách bảng lương của mình.
