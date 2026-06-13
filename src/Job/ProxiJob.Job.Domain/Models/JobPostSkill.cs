using ProxiJob.Shared.Kernel;

namespace ProxiJob.Job.Domain.Models
{
    public class JobPostSkill : BaseEntity
    {
        public int JobPostId { get; set; }
        public int SkillId { get; set; }

        public virtual JobPost JobPost { get; set; }
        public virtual Skill Skill { get; set; }
    }
}
