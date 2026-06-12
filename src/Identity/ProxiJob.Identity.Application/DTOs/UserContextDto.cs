namespace ProxiJob.Identity.Application.DTOs
{
    /// <summary>
    /// Thông tin user sau đăng nhập — dùng cho gRPC nội bộ giữa các service.
    /// </summary>
    public class UserContextDto
    {
        public int UserId { get; set; }
        /// <summary>Chủ quán: trùng UserId. Sinh viên: 0.</summary>
        public int BusinessId { get; set; }
        public string Email { get; set; } = default!;
        public string FullName { get; set; } = default!;
        public string? PhoneNumber { get; set; }
        public string? AvatarUrl { get; set; }
        public string Role { get; set; } = default!;
        public string SubscriptionTier { get; set; } = default!;
        public int JobPostLimit { get; set; }
        public int JobPostsUsed { get; set; }
        public string? ProfileStatus { get; set; }
        public decimal ReputationScore { get; set; }
        public bool IsActive { get; set; }
        public IReadOnlyList<string> Features { get; set; } = Array.Empty<string>();
    }
}
