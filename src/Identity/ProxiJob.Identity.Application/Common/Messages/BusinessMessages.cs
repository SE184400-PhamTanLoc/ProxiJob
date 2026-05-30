namespace ProxiJob.Identity.Application.Common.Messages
{
    public static class BusinessMessages
    {
        public const string RegisterSuccess = "Tạo tài khoản thành công.";
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
    }
}
