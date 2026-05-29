namespace ProxiJob.Identity.Application.DTOs
{
    public class UserSubscriptionDto
    {
        public string PlanName { get; set; }
        public decimal Price { get; set; }
        public int JobPostLimit { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Status { get; set; }
    }
}
