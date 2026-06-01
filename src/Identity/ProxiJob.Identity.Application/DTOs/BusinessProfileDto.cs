namespace ProxiJob.Identity.Application.DTOs
{
    public class BusinessProfileDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string? PhoneNumber { get; set; }
        public string? AvatarUrl { get; set; }
        public string ReadinessStatus { get; set; } = "";
        public string? BusinessName { get; set; }
        public string? BusinessType { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? TaxCode { get; set; }
        public string? Description { get; set; }
        public decimal ReputationScore { get; set; }
        public int ReviewCount { get; set; }
        public DateTime? ProfileCompleteAt { get; set; }
        public int CompletionPercent { get; set; }
        public IReadOnlyList<string> MissingFields { get; set; } = Array.Empty<string>();
    }
}
