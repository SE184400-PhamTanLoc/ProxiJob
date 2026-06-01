namespace ProxiJob.Identity.Application.DTOs
{
    public class AdminPaymentOrderDto
    {
        public int OrderId { get; set; }
        public string OrderCode { get; set; } = "";
        public string Status { get; set; } = "";
        public decimal Amount { get; set; }
        public int PlanId { get; set; }
        public string? PlanName { get; set; }
        public int UserId { get; set; }
        public string UserEmail { get; set; } = "";
        public string UserFullName { get; set; } = "";
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public DateTime? PaidAt { get; set; }
        public string? ConfirmedBy { get; set; }
        public string? AdminNote { get; set; }
    }
}
