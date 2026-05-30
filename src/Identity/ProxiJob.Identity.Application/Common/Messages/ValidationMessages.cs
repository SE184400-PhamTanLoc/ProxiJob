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
        public const string PhoneInvalid = "Số điện thoại phải có 10 chữ số và bắt đầu bằng 0.";
        public const string YearOfStudyInvalid = "Năm học phải từ 1 đến 6.";
        public const string DateOfBirthRequired = "Ngày sinh không được để trống.";
        public const string DateOfBirthInvalid = "Ngày sinh không hợp lệ (sinh viên từ 16–60 tuổi).";
        public const string GenderInvalid = "Giới tính phải là: Nam, Nữ hoặc Khác.";
        public const string CityRequired = "Thành phố không được để trống.";
        public const string CityMaxLength = "Thành phố tối đa 100 ký tự.";
        public const string AddressRequired = "Địa chỉ không được để trống.";
        public const string AddressMaxLength = "Địa chỉ tối đa 300 ký tự.";
        public const string SchoolRequired = "Trường học không được để trống.";
        public const string SchoolMaxLength = "Trường học tối đa 200 ký tự.";
        public const string MajorRequired = "Chuyên ngành không được để trống.";
        public const string MajorMaxLength = "Chuyên ngành tối đa 150 ký tự.";
        public const string BioMinLength = "Giới thiệu bản thân phải có ít nhất 20 ký tự.";
        public const string BioMaxLength = "Giới thiệu tối đa 2000 ký tự.";
        public const string SkillsRequired = "Kỹ năng không được để trống.";
        public const string SkillsMaxLength = "Kỹ năng tối đa 500 ký tự.";
        public const string AvatarUrlMaxLength = "Link ảnh đại diện tối đa 500 ký tự.";
        public const string ProfileValidationFailed = "Thông tin hồ sơ chưa hợp lệ: {0}";
    }
}
