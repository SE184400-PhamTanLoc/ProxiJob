namespace ProxiJob.Identity.Application.Common.Messages
{
    public static class ValidationMessages
    {
        public const string FullNameRequired = "Họ tên không được để trống.";
        public const string EmailRequired = "Email không được để trống.";
        public const string EmailInvalid = "Email không hợp lệ.";
        public const string PasswordRequired = "Mật khẩu không được để trống.";
        public const string PasswordMinLength = "Mật khẩu phải có ít nhất 8 ký tự.";
        public const string ConfirmPasswordRequired = "Xác nhận mật khẩu không được để trống.";
        public const string PasswordsDoNotMatch = "Mật khẩu xác nhận không khớp.";
        public const string UserTypeInvalid = "Loại tài khoản phải là Sinh viên (0) hoặc Chủ quán (1).";
        public const string RefreshTokenRequired = "Phiên đăng nhập không được để trống.";
    }
}
