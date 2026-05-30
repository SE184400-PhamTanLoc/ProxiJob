using ProxiJob.Identity.Domain.Enums;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Common.Interfaces
{
    public class PaymentInitiationResult
    {
        public string PaymentUrl { get; set; } = string.Empty;
        public string? GatewayTransactionId { get; set; }
    }

    public class PaymentCallbackResult
    {
        public bool Success { get; set; }
        public string? OrderCode { get; set; }
        public string? GatewayTransactionId { get; set; }
        public string? FailureReason { get; set; }
    }

    public interface IPaymentGateway
    {
        PaymentGatewayType GatewayType { get; }
        bool IsEnabled { get; }
        Task<PaymentInitiationResult> CreatePaymentAsync(PaymentOrder order, string clientIp, CancellationToken cancellationToken = default);
    }

    public interface IVNPayCallbackHandler
    {
        PaymentCallbackResult ValidateCallback(IReadOnlyDictionary<string, string> queryParams);
    }

    public interface IMoMoCallbackHandler
    {
        PaymentCallbackResult ValidateCallback(IReadOnlyDictionary<string, string> bodyParams);
    }
}
