namespace ProxiJob.Identity.Application.DTOs
{
    public class MyFeaturesDto
    {
        public int? PlanId { get; set; }
        public string Role { get; set; }
        public string SubscriptionTier { get; set; }
        public int JobPostLimit { get; set; }
        public decimal Price { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string Status { get; set; }
        public bool HasPriorityDisplay { get; set; }
        public bool HasHrManagement { get; set; }
    }
}
