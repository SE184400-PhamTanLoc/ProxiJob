using ProxiJob.Shared.Kernel;

namespace ProxiJob.Identity.Domain.Models
{
    public class Role : BaseEntity
    {
        public string Name { get; set; } // Admin, Business, Student
        public string? Description { get; set; }
    }
}
