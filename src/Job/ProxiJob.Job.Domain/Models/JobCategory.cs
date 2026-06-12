using ProxiJob.Shared.Kernel;

namespace ProxiJob.Job.Domain.Models
{
    public class JobCategory : BaseEntity
    {
        public string Name { get; set; }
        public string? Description { get; set; }

        public virtual ICollection<JobPost> JobPosts { get; set; }
    }
}
