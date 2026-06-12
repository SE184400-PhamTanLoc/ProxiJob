using ProxiJob.Shared.Kernel;

namespace ProxiJob.Identity.Domain.Models
{
    public class Permission : BaseEntity
    {
        public string Code { get; set; } // Vd: JOB_POST
        public string? Description { get; set; }
    }
}
