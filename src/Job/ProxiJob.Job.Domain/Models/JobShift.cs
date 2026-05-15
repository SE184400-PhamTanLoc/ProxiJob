using ProxiJob.Job.Domain.Models;
using ProxiJob.Shared.Kernel;

namespace ProxiJob.Job.Domain
{
    public class JobShift : BaseEntity
    {
        public int JobPostId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public decimal Salary { get; set; }
        public int Slots { get; set; }
        public int RemainingSlots { get; set; }

        public virtual JobPost JobPost { get; set; }
        public virtual ICollection<Application> Applications { get; set; }
    }
}
