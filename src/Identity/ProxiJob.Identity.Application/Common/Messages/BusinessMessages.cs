namespace ProxiJob.Identity.Application.Common.Messages
{
    public static class BusinessMessages
    {
        public const string RegisterSuccess = "Tạo tài khoản thành công. Bạn được đăng tối đa 3 tin miễn phí, sau đó cần mua gói dịch vụ.";
        public const string RegisterBusinessSuccess = "Tạo tài khoản thành công. Vui lòng đăng nhập và đăng ký hồ sơ doanh nghiệp (POST /api/business/profile/register).";
        public const string BusinessProfileRegistered = "Đăng ký hồ sơ doanh nghiệp thành công. Gọi POST /api/business/profile/activate khi đã đủ thông tin.";
        public const string BusinessProfileAlreadyRegistered = "Hồ sơ doanh nghiệp đã được đăng ký. Dùng PUT /api/business/profile để sửa hoặc POST /api/business/profile/activate.";
        public const string BusinessProfileNotRegistered = "Chưa đăng ký hồ sơ doanh nghiệp. Vui lòng gọi POST /api/business/profile/register trước.";
        public const string BusinessProfileNotFound = "Không tìm thấy hồ sơ doanh nghiệp.";
        public const string BusinessProfileOnly = "Chỉ tài khoản chủ quán mới sử dụng được tính năng này.";
        public const string BusinessProfileComplete = "Hồ sơ doanh nghiệp đã hoàn thiện.";
        public const string BusinessProfileAlreadyComplete = "Hồ sơ doanh nghiệp đã ở trạng thái hoàn thiện.";
        public const string BusinessProfileNotComplete = "Hồ sơ doanh nghiệp chưa hoàn thiện. Vui lòng hoàn thiện hồ sơ trước.";
        public const string BusinessJobPostOnly = "Chỉ tài khoản chủ quán mới sử dụng được tính năng này.";
        public const string FreeTrialExhausted = "Bạn đã dùng hết 3 lần đăng tin miễn phí. Vui lòng mua gói dịch vụ tại POST /api/plans/purchase.";
        public const string JobPostLimitReached = "Đã đạt giới hạn số tin đăng của gói hiện tại. Vui lòng nâng cấp gói.";
        public const string RegisterStudentSuccess = "Tạo tài khoản thành công. Vui lòng đăng nhập và đăng ký hồ sơ năng lực (POST /api/student/profile/register).";
        public const string ProfileRegistered = "Đăng ký hồ sơ năng lực thành công. Gọi POST /api/student/profile/activate khi sẵn sàng nhận việc.";
        public const string ProfileAlreadyRegistered = "Hồ sơ đã được đăng ký. Dùng PUT /api/student/profile để sửa hoặc POST /api/student/profile/activate.";
        public const string ProfileNotRegistered = "Chưa đăng ký hồ sơ. Vui lòng gọi POST /api/student/profile/register trước.";
        public const string StudentProfileNotFound = "Không tìm thấy hồ sơ sinh viên.";
        public const string StudentProfileOnly = "Chỉ tài khoản sinh viên mới sử dụng được tính năng này.";
        public const string ProfileReadyForWork = "Hồ sơ đã sẵn sàng nhận việc.";
        public const string ProfileAlreadyReady = "Hồ sơ đã ở trạng thái sẵn sàng nhận việc.";
        public const string ProfileIncomplete = "Vui lòng bổ sung đủ thông tin: {0}.";
        public const string ProfileNotReadyForWork = "Hồ sơ chưa sẵn sàng nhận việc. Vui lòng hoàn thiện hồ sơ trước.";
        public const string EmailInUse = "Email này đã được sử dụng.";
        public const string InvalidUserType = "Loại tài khoản không hợp lệ.";
        public const string InvalidCredentials = "Tài khoản hoặc mật khẩu không chính xác.";
        public const string AccountInactive = "Tài khoản đã bị vô hiệu hóa.";
        public const string NotAuthenticated = "Bạn cần đăng nhập để thực hiện thao tác này.";
        public const string BusinessSubscribeOnly = "Chỉ tài khoản chủ quán mới được mua gói dịch vụ.";
        public const string AlreadyOnPlan = "Tài khoản đang sử dụng gói này.";
        public const string PlanIdRequired = "Vui lòng chọn gói dịch vụ (planId).";
        public const string InvalidPlanId = "Gói dịch vụ không hợp lệ hoặc không được phép mua.";
        public const string InvalidPlanName = "Gói dịch vụ không hợp lệ. Chọn: PerShift, Basic, Standard, Premium.";
        public const string UserNotFound = "Không tìm thấy tài khoản.";
        public const string PlanNotFound = "Không tìm thấy gói dịch vụ.";
        public const string InvalidRefreshToken = "Phiên đăng nhập không hợp lệ.";
        public const string RefreshTokenRevoked = "Phiên đăng nhập đã bị thu hồi.";
        public const string RefreshTokenExpired = "Phiên đăng nhập đã hết hạn.";
        public const string UserNotFoundOrInactive = "Không tìm thấy tài khoản hoặc tài khoản đã bị vô hiệu hóa.";
        public const string LogoutSuccess = "Đăng xuất thành công.";
        public const string LogoutFailed = "Phiên đăng nhập không hợp lệ hoặc đã bị thu hồi.";
        public const string RoleNotConfigured = "Vai trò hệ thống chưa được cấu hình.";
        public const string SubscriptionNotConfigured = "Gói dịch vụ chưa được cấu hình.";
        public const string FeatureNotAllowed = "Gói dịch vụ hiện tại không bao gồm tính năng này.";
        public const string GatewayRequired = "Vui lòng chọn cổng thanh toán (Mock, VNPay, MoMo).";
        public const string InvalidGateway = "Cổng thanh toán không hợp lệ. Chọn: Mock, VNPay, MoMo.";
        public const string GatewayNotEnabled = "Cổng thanh toán chưa được cấu hình hoặc chưa bật.";
        public const string PaymentOrderCreated = "Vui lòng hoàn tất thanh toán tại liên kết bên dưới.";
        public const string PaymentOrderNotFound = "Không tìm thấy đơn thanh toán.";
        public const string PaymentOrderAccessDenied = "Bạn không có quyền xem đơn thanh toán này.";
        public const string PaymentNotCompleted = "Đơn thanh toán chưa được hoàn tất.";
        public const string PaymentOrderExpired = "Đơn thanh toán đã hết hạn.";
        public const string MockPaymentOnly = "Chỉ áp dụng cho đơn thanh toán Mock.";
    }
}
