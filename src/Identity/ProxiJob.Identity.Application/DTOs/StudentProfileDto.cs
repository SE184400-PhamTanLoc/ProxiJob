namespace ProxiJob.Identity.Application.DTOs
{
    public class StudentProfileDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? AvatarUrl { get; set; }
        public string ReadinessStatus { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string? School { get; set; }
        public string? Major { get; set; }
        public int? YearOfStudy { get; set; }
        public string? Bio { get; set; }
        public string? Skills { get; set; }
        public decimal ReputationScore { get; set; }
        public int ReviewCount { get; set; }
        public DateTime? ReadyForWorkAt { get; set; }
        public int CompletionPercent { get; set; }
        public IReadOnlyList<string> MissingFields { get; set; } = Array.Empty<string>();
    }
}
