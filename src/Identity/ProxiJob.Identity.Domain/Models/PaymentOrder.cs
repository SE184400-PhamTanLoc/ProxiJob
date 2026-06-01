using ProxiJob.Identity.Domain.Enums;
using ProxiJob.Shared.Kernel;

namespace ProxiJob.Identity.Domain.Models
{
    public class PaymentOrder : BaseEntity
    {
        public string OrderCode { get; set; } = string.Empty;
        public int UserId { get; set; }
        public int SubscriptionId { get; set; }
        public decimal Amount { get; set; }
        public PaymentGatewayType Gateway { get; set; }
        public PaymentOrderStatus Status { get; set; } = PaymentOrderStatus.Pending;
        public string? PaymentUrl { get; set; }
        public string? GatewayTransactionId { get; set; }
        public string? FailureReason { get; set; }
        public DateTime ExpiresAt { get; set; }
        public DateTime? PaidAt { get; set; }
        public string? ConfirmedBy { get; set; }
        public string? AdminNote { get; set; }
    }
}

