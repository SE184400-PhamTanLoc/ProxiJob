namespace ProxiJob.Identity.Application.DTOs
{
    public class AuthResponseDto
    {
        public string AccessToken { get; set; }
        public string RefreshToken { get; set; }
        public DateTime Expiration { get; set; }
        public int UserId { get; set; }
        public string Email { get; set; }
        public string FullName { get; set; }
        public string Role { get; set; }
        public string SubscriptionTier { get; set; }
        public int JobPostLimit { get; set; }
    }
}
