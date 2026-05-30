using ProxiJob.Shared.Kernel;

namespace ProxiJob.Identity.Domain.Models
{
    public class StudentProfile : BaseEntity
    {
        public int UserId { get; set; }
        public string ReadinessStatus { get; set; } = Constants.ProfileReadinessStatus.Incomplete;
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? School { get; set; }
        public string? Major { get; set; }
        public int? YearOfStudy { get; set; }
        public string? Bio { get; set; }
        public string? Skills { get; set; }
        public decimal ReputationScore { get; set; }
        public int ReviewCount { get; set; }
        public DateTime? ReadyForWorkAt { get; set; }

        public User User { get; set; } = null!;
    }
}
