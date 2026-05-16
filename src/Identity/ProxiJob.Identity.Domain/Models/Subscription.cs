using ProxiJob.Shared.Kernel;

namespace ProxiJob.Identity.Domain.Models
{
    public class Subscription : BaseEntity
    {
        public string Name { get; set; }
        public decimal Price { get; set; }
        public int JobPostLimit { get; set; }
        public int DurationDays { get; set; }
    }
}
