using ProxiJob.Shared.Kernel;

namespace ProxiJob.Job.Domain.Models
{
    public class Application : BaseEntity
    {
        public int JobShiftId { get; set; }
        public Guid StudentId { get; set; } // ID từ Supabase Auth
        public string? CVUrl { get; set; }
        public string? Introduction { get; set; }
        public string Status { get; set; } // Pending, Approved, Rejected

        public virtual JobShift JobShift { get; set; }
        public virtual ICollection<ApplicationHistory> Histories { get; set; }
    }
}
