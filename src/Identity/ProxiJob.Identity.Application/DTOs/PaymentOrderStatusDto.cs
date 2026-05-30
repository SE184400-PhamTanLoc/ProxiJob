namespace ProxiJob.Identity.Application.DTOs
{
    public class PaymentOrderStatusDto
    {
        public int OrderId { get; set; }
        public string OrderCode { get; set; }
        public string Gateway { get; set; }
        public string Status { get; set; }
        public decimal Amount { get; set; }
        public int PlanId { get; set; }
        public string? PlanName { get; set; }
        public DateTime ExpiresAt { get; set; }
        public DateTime? PaidAt { get; set; }
        public string? FailureReason { get; set; }
    }
}
