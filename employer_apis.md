# Tài liệu API dành cho Chủ quán (Employer/Recruiter) - ProxiJob

Tài liệu này tổng hợp toàn bộ các API được sử dụng bởi phân hệ **Chủ quán (Employer)** trong ứng dụng ProxiJob, được trích xuất từ các file API ở thư mục `src/api` của dự án Mobile.

---

## 1. Phân hệ Xác thực & Gói dịch vụ (Authentication & Subscription)
*File định nghĩa: [auth.js](file:///c:/EXE201/ProxiJob/src/ProxiJob_Mobile/src/api/auth.js)*

### Đăng nhập (Login)
* **Tên hàm:** `loginApi(email, password, role)`
* **HTTP Method:** `POST`
* **Endpoint:** `/auth/login`
* **Tham số:** `{ email, password }`
* **Mô tả:** Đăng nhập vào hệ thống. Giải mã JWT token để lấy thông tin `role` (đối với chủ quán là `employer`), `subscriptionTier` và `userId`.

### Đăng ký tài khoản (Register)
* **Tên hàm:** `registerApi(fullName, email, password, confirmPassword, userType)`
* **HTTP Method:** `POST`
* **Endpoint:** `/auth/register`
* **Tham số:** `{ fullName, email, password, confirmPassword, userType: 1 }` (với `userType = 1` là Employer/Business)
* **Mô tả:** Đăng ký tài khoản chủ quán mới.

### Kiểm tra trạng thái đăng nhập (Check Auth)
* **Tên hàm:** `checkAuthApi(token)`
* **Mô tả:** Hàm nội bộ kiểm tra tính hợp lệ và thời hạn của JWT token được lưu ở Local Storage của thiết bị.

### Lấy danh sách gói nâng cấp VIP/Premium
* **Tên hàm:** `getPlansApi()`
* **HTTP Method:** `GET`
* **Endpoint:** `/plans`
* **Mô tả:** Lấy danh sách các gói dịch vụ tin tuyển dụng & tính năng HRM (PerShift, Basic, Standard, Premium).

### Mua gói nâng cấp (Purchase Plan)
* **Tên hàm:** `purchasePlanApi(planId)`
* **HTTP Method:** `POST`
* **Endpoint:** `/plans/purchase`
* **Tham số:** `{ planId }` (Kèm Header `Authorization: Bearer <token>`)
* **Mô tả:** Tạo đơn hàng mua gói nâng cấp dịch vụ cho chủ quán.

### Lấy trạng thái đơn thanh toán mua gói
* **Tên hàm:** `getPaymentStatusApi(orderId)`
* **HTTP Method:** `GET`
* **Endpoint:** `/api/payments/{orderId}`
* **Mô tả:** Kiểm tra trạng thái đơn hàng (Pending/Paid/Expired) và lấy thông tin tài khoản ngân hàng chuyển khoản kèm mã QR Pay.

### Kích hoạt session mới sau khi thanh toán gói thành công
* **Tên hàm:** `createPaymentSessionApi(orderId)`
* **HTTP Method:** `POST`
* **Endpoint:** `/api/payments/{orderId}/session`
* **Mô tả:** Cập nhật lại quyền hạn/role token của session hiện tại của chủ quán sau khi hệ thống xác nhận đã thanh toán thành công.

---

## 2. Phân hệ Quản lý Tin tuyển dụng & Ca làm (Job & Shift Management)
*File định nghĩa: [jobs.js](file:///c:/EXE201/ProxiJob/src/ProxiJob_Mobile/src/api/jobs.js)*

### Tạo tin tuyển dụng mới
* **Tên hàm:** `createJobPost(payload)`
* **HTTP Method:** `POST`
* **Endpoint:** `/job-posts`
* **Tham số:** `{ title, description, categoryId, businessId, ... }`
* **Mô tả:** Tạo mới tin tuyển dụng (tin thường hoặc tin khẩn cấp Emergency).

### Lấy danh sách tin tuyển dụng của chủ quán
* **Tên hàm:** `getJobPostsByBusiness(businessId, pageNumber = 1, pageSize = 20)`
* **HTTP Method:** `GET`
* **Endpoint:** `/job-posts/business/{businessId}?pageNumber={pageNumber}&pageSize={pageSize}`
* **Mô tả:** Lấy toàn bộ các tin tuyển dụng do chủ quán này đăng.

### Cập nhật tin tuyển dụng
* **Tên hàm:** `updateJobPostApi(id, payload)`
* **HTTP Method:** `PUT`
* **Endpoint:** `/job-posts/{id}`
* **Tham số:** `{ title, description, ... }`
* **Mô tả:** Sửa thông tin bài đăng tuyển dụng.

### Xóa tin tuyển dụng
* **Tên hàm:** `deleteJobPostApi(id, businessId, deletedBy = 'Business')`
* **HTTP Method:** `DELETE`
* **Endpoint:** `/job-posts/{id}`
* **Tham số:** `{ id, businessId, deletedBy }` (gửi trong Body)
* **Mô tả:** Xóa bài đăng tuyển dụng khỏi hệ thống.

### Đăng tin tuyển dụng (Publish)
* **Tên hàm:** `publishJobPost(id, businessId, updatedBy = 'System')`
* **HTTP Method:** `PATCH`
* **Endpoint:** `/job-posts/{id}/publish`
* **Tham số:** `{ id, businessId, updatedBy }` (gửi trong Body)
* **Mô tả:** Kích hoạt hiển thị công khai bài tuyển dụng cho sinh viên nhìn thấy.

### Lấy danh sách các ca làm việc của một bài đăng
* **Tên hàm:** `getJobPostShifts(jobPostId)`
* **HTTP Method:** `GET`
* **Endpoint:** `/job-posts/{jobPostId}/shifts`
* **Mô tả:** Lấy danh sách các ca làm (Shifts) thuộc bài đăng tuyển dụng đó.

### Thêm ca làm việc vào bài đăng
* **Tên hàm:** `createJobShift(jobPostId, payload)`
* **HTTP Method:** `POST`
* **Endpoint:** `/job-posts/{jobPostId}/shifts`
* **Tham số:** `{ jobPostId, startTime, endTime, salary, ... }`
* **Mô tả:** Tạo mới ca làm việc cụ thể gán vào bài đăng tuyển dụng.

---

## 3. Phân hệ Duyệt đơn & Ứng viên (Applications & Candidates)
*File định nghĩa: [jobs.js](file:///c:/EXE201/ProxiJob/src/ProxiJob_Mobile/src/api/jobs.js) và [studentApi.js](file:///c:/EXE201/ProxiJob/src/ProxiJob_Mobile/src/api/studentApi.js)*

### Lấy danh sách đơn ứng tuyển của một ca làm
* **Tên hàm:** `getApplicationsByShift(shiftId, businessId, status = '')`
* **HTTP Method:** `GET`
* **Endpoint:** `/shifts/{shiftId}/applications?businessId={businessId}&status={status}`
* **Mô tả:** Lấy danh sách sinh viên ứng tuyển vào ca làm cụ thể để chủ quán phê duyệt.

### Duyệt nhận việc sinh viên ứng tuyển
* **Tên hàm:** `approveApplication(id, businessId, updatedBy = 'Employer')`
* **HTTP Method:** `PATCH`
* **Endpoint:** `/applications/{id}/approve`
* **Tham số:** `{ applicationId: id, businessId, updatedBy }` (gửi trong Body)
* **Mô tả:** Chấp thuận đơn ứng tuyển, sinh viên sẽ được nhận vào ca và chuyển trạng thái sang Ready to Work.

### Từ chối đơn ứng tuyển
* **Tên hàm:** `rejectApplication(id, businessId, updatedBy = 'Employer')`
* **HTTP Method:** `PATCH`
* **Endpoint:** `/applications/{id}/reject`
* **Tham số:** `{ applicationId: id, businessId, updatedBy }` (gửi trong Body)
* **Mô tả:** Từ chối đơn ứng tuyển của sinh viên.

### Tìm kiếm quét ứng viên lân cận (Ready to Work)
* **Tên hàm:** `getActiveStudentProfilesApi()`
* **HTTP Method:** `GET`
* **Endpoint:** `/student/profile/active`
* **Mô tả:** Lấy danh sách hồ sơ sinh viên đang ở trạng thái "Sẵn sàng nhận việc" để hiển thị trên bản đồ hoặc quét lân cận theo bán kính định vị GPS.

---

## 4. Phân hệ Quản lý Nhân sự & Lịch làm (HRM & Scheduling)
*File định nghĩa: [management.js](file:///c:/EXE201/ProxiJob/src/ProxiJob_Mobile/src/api/management.js)*

### Lấy danh sách nhân viên của cửa hàng
* **Tên hàm:** `getEmployees(status = '')`
* **HTTP Method:** `GET`
* **Endpoint:** `/employees?status={status}`
* **Mô tả:** Lấy danh sách nhân viên (nội bộ và bên ngoài) đang làm việc tại quán.

### Thêm nhân viên thủ công vào danh sách
* **Tên hàm:** `createEmployee(payload)`
* **HTTP Method:** `POST`
* **Endpoint:** `/employees`
* **Tham số:** `{ businessId, fullName, position, phoneNumber, isExternal: false, hourlyRate, ... }`
* **Mô tả:** Thêm một nhân viên nội bộ mới vào hệ thống quản lý nhân sự (HRM) của quán.

### Xóa/Cho thôi việc nhân viên
* **Tên hàm:** `deleteEmployee(id)`
* **HTTP Method:** `DELETE`
* **Endpoint:** `/employees/{id}`
* **Mô tả:** Xóa nhân viên ra khỏi danh sách HRM của quán.

### Lấy lịch làm việc của toàn quán theo ngày
* **Tên hàm:** `getSchedules(date)`
* **HTTP Method:** `GET`
* **Endpoint:** `/schedules?date={date}` (Format ngày: `YYYY-MM-DD`)
* **Mô tả:** Lấy danh sách phân ca làm việc trong ngày đã chọn của cửa hàng.

### Phân ca làm việc cho nhân viên
* **Tên hàm:** `createSchedule(employeeId, payload)`
* **HTTP Method:** `POST`
* **Endpoint:** `/employees/{employeeId}/schedules`
* **Tham số:** `{ date, startTime, endTime, note }`
* **Mô tả:** Tạo lịch/phân ca làm việc mới cho một nhân viên cụ thể.

### Hủy ca làm việc đã phân
* **Tên hàm:** `deleteSchedule(id)`
* **HTTP Method:** `DELETE`
* **Endpoint:** `/schedules/{id}`
* **Mô tả:** Hủy ca làm việc đã phân cho nhân viên.

---

## 5. Phân hệ QR Code & Điểm danh chấm công (QR & Attendance Monitor)
*File định nghĩa: [management.js](file:///c:/EXE201/ProxiJob/src/ProxiJob_Mobile/src/api/management.js)*

### Lấy thông tin QR Code điểm danh hiện tại của quán
* **Tên hàm:** `getQrCode()`
* **HTTP Method:** `GET`
* **Endpoint:** `/qr-code`
* **Mô tả:** Lấy thông tin mã token QR Code hiện tại đang active cùng giới hạn bán kính GPS cho phép điểm danh của quán.

### Tạo mới/Làm mới mã QR điểm danh (Anti-Cheat)
* **Tên hàm:** `generateQrCode()`
* **HTTP Method:** `POST`
* **Endpoint:** `/qr-code/generate`
* **Mô tả:** Sinh mã token QR mới ngẫu nhiên để phục vụ điểm danh thời gian thực, ngăn sinh viên chụp ảnh mã QR cũ mang về nhà điểm danh khống.

### Thay đổi bán kính GPS cho phép điểm danh
* **Tên hàm:** `updateQrRadius(allowedRadiusMeters)`
* **HTTP Method:** `PATCH`
* **Endpoint:** `/qr-code/radius`
* **Tham số:** `{ allowedRadiusMeters }` (gửi trong Body)
* **Mô tả:** Thiết lập bán kính cho phép (ví dụ: 20m, 50m quanh vị trí GPS quán) mà sinh viên phải đứng trong vùng đó mới quét mã QR điểm danh thành công.

### Lấy lịch sử log chấm công/giám sát thời gian thực
* **Tên hàm:** `getTimekeepingLogs(date)`
* **HTTP Method:** `GET`
* **Endpoint:** `/timekeeping?date={date}` (Format ngày: `YYYY-MM-DD`)
* **Mô tả:** Lấy danh sách các lượt Check-in/Check-out của sinh viên trong ngày kèm theo tọa độ GPS, hình ảnh tự sướng để chủ quán đối chiếu thực tế (Real-time Monitor).

---

## 6. Phân hệ Kết toán Lương (Payroll)
*File định nghĩa: [management.js](file:///c:/EXE201/ProxiJob/src/ProxiJob_Mobile/src/api/management.js)*

### Lấy danh sách bảng tính lương
* **Tên hàm:** `getPayrolls(status = '')`
* **HTTP Method:** `GET`
* **Endpoint:** `/payrolls?status={status}`
* **Mô tả:** Lấy danh sách các bảng thanh toán lương đã kết toán hoặc đang chờ thanh toán của quán.

### Tính toán kết toán lương nhân viên
* **Tên hàm:** `calculatePayroll(command)`
* **HTTP Method:** `POST`
* **Endpoint:** `/payrolls/calculate`
* **Tham số:** `{ employeeId, businessId, createdBy }`
* **Mô tả:** Thực hiện quét lịch sử ca làm thực tế và log chấm công để tính tổng lương thực nhận của nhân viên đó.

### Phê duyệt và thanh toán bảng lương
* **Tên hàm:** `approvePayroll(id, command = {})`
* **HTTP Method:** `PATCH`
* **Endpoint:** `/payrolls/{id}/approve`
* **Tham số:** `{ payrollId: id, businessId, updatedBy }`
* **Mô tả:** Xác nhận đã chuyển khoản/trả lương thành công cho nhân viên và đóng bảng lương tháng/kỳ đó.
