using ProxiJob.Shared.Kernel;

namespace ProxiJob.Job.Domain.Models
{
    public class JobLocation : BaseEntity
    {
        public int JobPostId { get; set; }
        public string Address { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }

        public virtual JobPost JobPost { get; set; }
    }
}
