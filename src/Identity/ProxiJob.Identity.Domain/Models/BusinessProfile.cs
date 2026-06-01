using ProxiJob.Shared.Kernel;

namespace ProxiJob.Identity.Domain.Models
{
    public class BusinessProfile : BaseEntity
    {
        public int UserId { get; set; }
        public string ReadinessStatus { get; set; } = Constants.ProfileReadinessStatus.Incomplete;
        public string? BusinessName { get; set; }
        public string? BusinessType { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? TaxCode { get; set; }
        public string? Description { get; set; }
        public decimal ReputationScore { get; set; }
        public int ReviewCount { get; set; }
        public DateTime? ProfileCompleteAt { get; set; }

        public User User { get; set; } = null!;
    }
}
