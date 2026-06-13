# Hướng dẫn Tính năng Sản phẩm & Định vị Giá trị - ProxiJob

Tài liệu này được biên soạn bởi **Product Owner** nhằm giới thiệu về sản phẩm khởi nghiệp **ProxiJob** phục vụ cho buổi thuyết trình bảo vệ dự án **EXE201 tại Đại học FPT**. Tài liệu được trình bày bằng ngôn từ phi kỹ thuật, tập trung vào mô hình kinh doanh, giá trị mang lại và trạng thái sẵn sàng của các tính năng dành cho Hội đồng Ban giám khảo (Khối ngành Kinh tế / Marketing).

---

## 1. Sứ mệnh Sản phẩm & Định vị Giá trị (Product Mission)

**ProxiJob** là nền tảng kết nối và tìm kiếm công việc bán thời gian tức thời (on-demand part-time job matching) dành riêng cho **sinh viên thế hệ Gen-Z**, ứng dụng công nghệ định vị siêu cục bộ (hyper-local geofencing) để kết nối sinh viên với các cửa hàng, quán ăn, doanh nghiệp có nhu cầu tuyển dụng nhân sự ca trực trong phạm vi gần nhất.

### 3 Cam kết Cốt lõi trên Trang quản trị (Core Commitments):
- ⚡ **Tốc độ ghép ca 1.2 giây**: Hệ thống tự động phân phối đơn ứng tuyển của sinh viên tới chủ quán ngay lập tức, tối ưu hóa tốc độ kết nối nhân sự.
- 📍 **Quét việc trong bán kính 100m**: Giúp sinh viên tìm thấy các cơ hội việc làm ngay tại khu vực mình sinh sống hoặc học tập, giảm thiểu tối đa thời gian di chuyển.
- 💵 **98% Quyết toán lương ngay khi hết ca**: Tiền lương được tính toán tự động dựa trên giờ công thực tế và sẵn sàng chuyển về tài khoản ví điện tử của sinh viên ngay khi hoàn thành check-out.

---

## 2. Bản đồ Tính năng Sản phẩm hiện tại (App Feature Map)

Ứng dụng ProxiJob hoạt động song song hai phân hệ giao diện chuyên biệt cho **Sinh viên (Người tìm việc)** và **Chủ quán (Nhà tuyển dụng)**.

### GIAO DIỆN DÀNH CHO SINH VIÊN (STUDENT MOBILE APP)

| Nhóm Tính năng | Chức năng chi tiết | Giá trị thực tiễn mang lại | Trạng thái Demo |
| :--- | :--- | :--- | :--- |
| **Hồ sơ năng lực bảo chứng (E-Portfolio)** | - Đăng ký hồ sơ, cập nhật kỹ năng, ngành học và trường học.<br>- Xem đánh giá uy tín (Reputation Score) tích lũy qua các ca làm việc thành công. | Thay thế CV truyền thống bằng hồ sơ số trực quan, tăng độ tin cậy đối với chủ quán. | **Đã hoàn thiện (Lưu DB thật)** |
| **Tìm kiếm ca làm quanh đây** | - Quét tìm việc làm bán thời gian trực tiếp dựa trên vị trí GPS thực tế.<br>- Lọc công việc theo danh mục và mức lương mong muốn. | Tìm được việc sát gần nhà hoặc trường học chỉ trong vài cú chạm. | **Đã hoàn thiện (Lưu DB thật)** |
| **Check-in/Check-out thông minh** | - Tự động đối chiếu tọa độ định vị GPS nằm trong Geofence 100m của quán.<br>- Điểm danh vào/ra ca trực.<br>- Trình quét QR và chụp ảnh xác thực khuôn mặt (FaceID) đang hiển thị dưới dạng giả lập quy trình. | Đảm bảo tính trung thực về vị trí và thời gian của sinh viên khi đến làm việc. | **Tích hợp một phần (Định vị thật - Quét QR/Khuôn mặt giả lập)** |

---

### GIAO DIỆN DÀNH CHO CHỦ QUÁN / DOANH NGHIỆP (EMPLOYER MOBILE APP)

| Nhóm Tính năng | Chức năng chi tiết | Giá trị thực tiễn mang lại | Trạng thái Demo |
| :--- | :--- | :--- | :--- |
| **Trang quản trị Doanh nghiệp (Enterprise Dashboard)** | - Giao diện dành riêng cho chủ quán đăng ký gói doanh nghiệp Enterprise.<br>- Menu Avatar góc phải hỗ trợ bật tắt nhanh các lựa chọn (Xem gói dịch vụ, Xem thông tin quán, Nút Đóng nhanh/Đăng xuất). | Quản trị tài khoản tối giản, hiện đại và bảo mật cao. | **Đã hoàn thiện (Đồng bộ UI & Menu tương tác)** |
| **Quản lý đăng tin tuyển dụng** | - Trình tạo tin tuyển dụng nhanh (Wizard) gồm Tiêu đề, Ca làm, Mức lương theo giờ, Yêu cầu kỹ năng.<br>- Hỗ trợ Chỉnh sửa và Xóa tin tuyển dụng trực tiếp từ danh sách quản lý. | Chủ quán linh hoạt thay đổi ca làm việc hoặc xóa tin đăng khi đã đủ người trực. | **Đã hoàn thiện (Liên kết DB gỡ tin/sửa tin)** |
| **Quản lý danh sách nhân sự (HRM Panel)** | - Phân loại rõ ràng giữa **Nhân viên cố định (Nội bộ)** và **Nhân viên ca lẻ (Vãng lai)**.<br>- Tích hợp phím tắt nhắn tin (Chat) hoặc Gọi điện trực tiếp cho nhân viên từ danh sách (hiện nút bấm chỉ phản hồi giả lập, chưa cấu hình server chat/VoIP). | Nắm bắt thông tin nhân sự tức thời, liên lạc nhanh khi có sự cố phát sinh. | **Đã hoàn thiện UI (Nút Chat/Gọi đang giả lập)** |
| **Giám sát vị trí GPS Live Radar** | - Xem bản đồ Radar hiển thị chấm xanh (Vùng an toàn) và chấm đỏ (Vùng nghi vấn).<br>- Hệ thống tự động cảnh báo nếu nhân viên đi ra khỏi bán kính 100m của quán. | Đảm bảo nhân sự vãng lai đang túc trực làm việc đúng vị trí, bảo vệ chất lượng vận hành quán. | **Đã hoàn thiện (Radar GPS thời gian thực)** |
| **Quyết toán lương ca trực (Payroll)** | - Tự động cộng dồn giờ công thực tế từ Check-in/Check-out để tính thành tiền.<br>- Nút bấm Quyết toán ⚡ hỗ trợ chuyển lương tức thì qua cổng ví MoMo Sandbox. | Giảm tải thủ tục tính lương thủ công cuối tháng, trả lương minh bạch cho nhân sự. | **Sẵn sàng Demo (Giao diện Sandbox)** |

---

## 3. Định hướng phát triển & Cột mốc Tiếp theo (Product Roadmap)

Sau buổi thuyết trình bảo vệ dự án EXE201, sản phẩm sẽ tập trung phát triển các hạng mục chiến lược sau:

1. **Thương mại hóa Cổng thanh toán**: Chuyển đổi cổng thanh toán MoMo và ngân hàng từ tài khoản thử nghiệm (Sandbox) sang tài khoản doanh nghiệp thực tế để xử lý dòng tiền thật.
2. **Hệ thống cảnh báo tự động bằng AI**: Ứng dụng trí tuệ nhân tạo phát hiện các hành vi gian lận giả lập GPS (Fake GPS) nâng cao của sinh viên trên thiết bị di động.
3. **Mở rộng tệp khách hàng chuỗi FnB**: Tối ưu hóa tính năng quản lý nhiều chi nhánh trên cùng một tài khoản doanh nghiệp để tiếp cận các chuỗi cửa hàng tiện lợi và đồ uống lớn.
