namespace ProxiJob.Identity.Application.DTOs
{
    public class SubscriptionDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public decimal Price { get; set; }
        public int JobPostLimit { get; set; }
        public int DurationDays { get; set; }
    }
}
