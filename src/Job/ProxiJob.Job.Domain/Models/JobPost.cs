using ProxiJob.Shared.Kernel;

namespace ProxiJob.Job.Domain.Models
{
    public class JobPost : BaseEntity
    {
        public Guid BusinessId { get; set; } // ID từ Supabase Auth
        public int CategoryId { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Requirements { get; set; }
        public string Status { get; set; } // Draft, Published, Closed

        // Quan hệ 1-1 với Location
        public virtual JobLocation Location { get; set; }
        // Quan hệ 1-N với Shifts
        public virtual ICollection<JobShift> Shifts { get; set; }
    }
}
