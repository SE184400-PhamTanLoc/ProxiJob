namespace ProxiJob.Identity.Application.DTOs
{
    public class PlanComparisonDto
    {
        public int Id { get; set; }
        public string PlanName { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public decimal VariableCost { get; set; }
        public decimal GrossMargin { get; set; }
        public string BillingType { get; set; }
        public int JobPostLimit { get; set; }
        public int DurationDays { get; set; }
        public bool HasPriorityDisplay { get; set; }
        public bool HasHrManagement { get; set; }
    }
}
