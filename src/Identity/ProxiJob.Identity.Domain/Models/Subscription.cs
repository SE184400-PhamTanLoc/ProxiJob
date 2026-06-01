using ProxiJob.Identity.Domain.Enums;
using ProxiJob.Shared.Kernel;

namespace ProxiJob.Identity.Domain.Models
{
    public class Subscription : BaseEntity
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public decimal VariableCost { get; set; }
        public decimal GrossMargin { get; set; }
        public BillingType BillingType { get; set; }
        public int JobPostLimit { get; set; }
        public int DurationDays { get; set; }
        public bool HasPriorityDisplay { get; set; }
        public bool HasHrManagement { get; set; }
    }
}
