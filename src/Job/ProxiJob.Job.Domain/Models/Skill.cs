using ProxiJob.Shared.Kernel;

namespace ProxiJob.Job.Domain.Models
{
    public class Skill : BaseEntity
    {
        public string Name { get; set; }
        public string Description { get; set; }
    }
}
