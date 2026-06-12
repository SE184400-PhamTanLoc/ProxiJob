namespace ProxiJob.Identity.Application.DTOs
{
    public class JobPostQuotaDto
    {
        public string SubscriptionTier { get; set; }
        public int JobPostLimit { get; set; }
        public int JobPostsUsed { get; set; }
        public int JobPostsRemaining { get; set; }
        public bool CanPostJob { get; set; }
        public bool MustPurchasePlan { get; set; }
    }
}
