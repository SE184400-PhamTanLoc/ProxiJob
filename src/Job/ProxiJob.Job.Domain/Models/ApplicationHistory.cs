using ProxiJob.Shared.Kernel;

namespace ProxiJob.Job.Domain.Models
{
    public class ApplicationHistory : BaseEntity
    {
        public int ApplicationId { get; set; }
        public string Status { get; set; }
        public string? Note { get; set; }
        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

        public virtual Application Application { get; set; }
    }
}
