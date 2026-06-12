using ProxiJob.Shared.Kernel;

namespace ProxiJob.Identity.Domain.Models
{
    public class SubscriptionFeature : BaseEntity
    {
        public int SubscriptionId { get; set; }
        public string Code { get; set; }
        public string Description { get; set; }
        public string ClientChannel { get; set; }
        public Subscription? Subscription { get; set; }
    }
}
