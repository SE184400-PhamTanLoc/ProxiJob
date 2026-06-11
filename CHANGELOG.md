# Báo cáo thay đổi toàn diện (Git Changelog) - ProxiJob Suite

Tài liệu này tổng hợp toàn bộ các thay đổi mã nguồn đã thực hiện trên toàn hệ thống **ProxiJob** (bao gồm .NET Backend APIs và React Native Mobile App) từ ngày **09/06/2026** đến nay để chuẩn bị push Git.

---

## 📂 Tổng quan số lượng thay đổi
- **Tổng số tệp thay đổi**: 36 tệp (5570 dòng thêm mới, 1661 dòng xóa).
- **Các thành phần ảnh hưởng**: 
  - **Backend**: Identity API, Job API, Management API.
  - **Database & gRPC**: Dữ liệu mẫu (seeding), grpc client, Grpc Authentication.
  - **Mobile App**: App.js, AppContext, API services, Hệ thống màn hình Chủ doanh nghiệp & Sinh viên.

---

## 🛠️ Chi tiết thay đổi theo từng thành phần

### I. NET BACKEND SERVICES (C# APIs)

#### 1. Dịch vụ Định danh (Identity API)
*   **[Program.cs](file:///d:/ProxiJob/src/Identity/ProxiJob.Identity.API/Program.cs)**: Cấu hình và tinh chỉnh các dịch vụ xác thực JWT, gRPC endpoint phục vụ liên lạc nội bộ giữa các microservices.
*   **[launchSettings.json](file:///d:/ProxiJob/src/Identity/ProxiJob.Identity.API/Properties/launchSettings.json)**: Đồng bộ cổng port gRPC và HTTP để chạy cục bộ mượt mà.

#### 2. Dịch vụ Tuyển dụng (Job API)
*   **Controllers ([ApplicationsController.cs](file:///d:/ProxiJob/src/Job/ProxiJob.Job.API/Controllers/ApplicationsController.cs))**: Bổ sung/cập nhật API phê duyệt và từ chối hồ sơ ứng tuyển từ sinh viên.
*   **Application Commands & Queries**:
    *   `ApproveApplicationCommand.cs`: Xử lý logic nghiệp vụ khi chủ quán duyệt sinh viên vào ca trực.
    *   `RejectApplicationCommand.cs`: Xử lý logic từ chối hồ sơ và tự động thông báo trạng thái ca làm.
    *   `GetApplicationsByShiftQuery.cs` & `GetMyApplicationsQuery.cs`: Tìm kiếm danh sách hồ sơ ứng tuyển theo ca làm việc hoặc theo thông tin sinh viên đăng nhập.
*   **gRPC Client ([IdentityGrpcClient.cs](file:///d:/ProxiJob/src/Job/ProxiJob.Job.Infrastructure/Services/IdentityGrpcClient.cs))**: Cải tiến luồng lấy thông tin người dùng từ Identity Service qua giao thức gRPC tốc độ cao.

#### 3. Dịch vụ Quản lý & Chấm công (Management API)
*   **Controllers**:
    *   `PayrollsController.cs`: Cung cấp API tính toán và phê duyệt thanh toán lương (Quyết toán lương).
    *   `QrCodesController.cs`: Quản lý sinh mã QR token điểm danh tại từng cửa hàng.
    *   `TimekeepingController.cs`: Xử lý logic chấm công vào ca (Check-in) và kết thúc ca (Check-out) kèm tọa độ GPS.
    *   `WorkSchedulesController.cs`: API quản lý ca trực mẫu và phân công lịch trình làm việc.
*   **Xác thực gRPC Middleware**:
    *   **[NEW] [GrpcAuthenticationHandler.cs](file:///d:/ProxiJob/src/Management/ProxiJob.Management.API/Middleware/GrpcAuthenticationHandler.cs)**: Middleware xử lý kiểm tra Token JWT của các cuộc gọi gRPC nội bộ để đảm bảo an toàn dữ liệu.
*   **Logic Nghiệp vụ (Commands & Queries)**:
    *   `CreateWorkScheduleCommand.cs`: Sửa đổi cấu trúc phân công ca làm mẫu của chủ doanh nghiệp.
    *   `GetEmployeesByBusinessQuery.cs`: Truy vấn danh sách nhân sự thuộc sở hữu của một doanh nghiệp cụ thể.
*   **Cơ sở dữ liệu**:
    *   **[NEW] [05_management_employees_test.sql](file:///d:/ProxiJob/docs/seed/05_management_employees_test.sql)**: SQL seed tạo dữ liệu mẫu nhân viên thử nghiệm nhằm test các tính năng chấm công/quyết toán trực quan.

---

### II. REACT NATIVE / EXPO MOBILE APP

#### 1. Cấu hình & Định tuyến (Routing & Config)
*   **[package.json](file:///d:/ProxiJob/src/ProxiJob_Mobile/package.json)** & **[package-lock.json](file:///d:/ProxiJob/src/ProxiJob_Mobile/package-lock.json)**: Cài đặt thêm thư viện `react-native-webview` hỗ trợ nhúng Leaflet Map API.
*   **[App.js](file:///d:/ProxiJob/src/ProxiJob_Mobile/App.js)**: Định cấu hình tổng thể, thiết lập các bộ Provider và cổng định tuyến màn hình.
*   **[MainTabNavigator.js](file:///d:/ProxiJob/src/ProxiJob_Mobile/src/navigation/MainTabNavigator.js)**: Tổ chức lại cấu trúc Tab Bar dành cho Doanh nghiệp, bao gồm các mục: *Tin tuyển, Nhân sự, Xếp lịch, GPS Live, Quyết toán*.

#### 2. Kết nối API & Quản lý Trạng thái (Context & API Services)
*   **[jobs.js](file:///d:/ProxiJob/src/ProxiJob_Mobile/src/api/jobs.js)** & **[management.js](file:///d:/ProxiJob/src/ProxiJob_Mobile/src/api/management.js)**: Bổ sung các hàm call API endpoint Backend (.NET APIs) liên quan đến ứng tuyển ca, điểm danh và thanh toán.
*   **[AppContext.js](file:///d:/ProxiJob/src/ProxiJob_Mobile/src/context/AppContext.js)**:
    *   Tích hợp toàn bộ state điều phối định vị GPS: `studentCoords`, `setStudentCoords`, `simulatedDistanceToActive`, `setSimulatedDistanceToActive`.
    *   Bổ sung các hàm nghiệp vụ toàn cục: `loadStaffList`, `loadEmployerJobs`, `loadAttendanceLogs`, `runApprovePayroll`, `checkInShift`, `checkOutShift`.

#### 3. Hệ thống Màn hình Doanh nghiệp (Employer Screens Redesign)
*   **[CandidateListScreen.js](file:///d:/ProxiJob/src/ProxiJob_Mobile/src/screens/employer/CandidateListScreen.js)** & **[EmployerApprovals.js](file:///d:/ProxiJob/src/ProxiJob_Mobile/src/screens/employer/EmployerApprovals.js)**:
    *   Giao diện hiển thị danh sách hồ sơ ứng tuyển của sinh viên.
    *   Hỗ trợ duyệt và từ chối ứng viên thời gian thực.
*   **[EmployerHRM.js](file:///d:/ProxiJob/src/ProxiJob_Mobile/src/screens/employer/EmployerHRM.js)**:
    *   Quản lý thông tin hồ sơ nhân viên nội bộ và vãng lai.
    *   Tối ưu hóa bento style hiển thị danh thiếp nhân viên cao cấp.
*   **[EmployerScheduling.js](file:///d:/ProxiJob/src/ProxiJob_Mobile/src/screens/employer/EmployerScheduling.js)**:
    *   Hệ thống ma trận xếp lịch làm việc trực quan.
    *   Hỗ trợ phân công nhanh sinh viên vào ca trống dưới dạng Bottom Sheet.
*   **[EmployerEmergencyPost.js](file:///d:/ProxiJob/src/ProxiJob_Mobile/src/screens/employer/EmployerEmergencyPost.js)**:
    *   Màn hình đăng tin tuyển dụng khẩn cấp (Emergency Job Post) thu hút nhân lực Hyperlocal tức thì.
*   **[EmployerMonitor.js](file:///d:/ProxiJob/src/ProxiJob_Mobile/src/screens/employer/EmployerMonitor.js)**:
    *   Tích hợp bản đồ Leaflet Map (WebView) giám sát GPS Live thời gian thực.
    *   Sửa lỗi khóa vuốt bản đồ, tự động khóa cuộn trang khi phóng to.
    *   Marker cửa hàng 🏪 nhấp nháy động, nhân viên hiển thị dạng badge icon xanh `👤` / đỏ `⚠️` (ngoài 100m).
*   **[PayrollSettlementScreen.js](file:///d:/ProxiJob/src/ProxiJob_Mobile/src/screens/employer/PayrollSettlementScreen.js)**:
    *   Trang quyết toán lương Bento style với nền trắng đồng bộ các màn hình trước.
    *   Đẩy sát các góc ngoặc viewfinder cam (`bracketTL/TR/BL/BR`) ra sát biên góc `8px`.
    *   Card nhân viên thu gọn cực sạch, tích hợp nút bấm toggle **`Xem chi tiết ca làm ▼` / `Thu gọn chi tiết ▲`** để xem giờ giấc công nhật.

#### 4. Hệ thống Màn hình Sinh viên (Student Screens Redesign)
*   **[StudentCheckIn.js](file:///d:/ProxiJob/src/ProxiJob_Mobile/src/screens/student/StudentCheckIn.js)**:
    *   Tích hợp bản đồ Leaflet hiển thị bán kính điểm danh an toàn 100m.
    *   Sử dụng công thức Haversine xác thực khoảng cách chấm công.
    *   Tích hợp mô phỏng giả lập GPS và quét khuôn mặt camera để demo đầy đủ tính năng.
