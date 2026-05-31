using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Common.Interfaces
{
    public class PaymentInitiationResult
    {
        public string? QrImageUrl { get; set; }
        public string? GatewayTransactionId { get; set; }
        public BankTransferInstructionsDto? BankTransfer { get; set; }
    }

    public interface IBankTransferPaymentService
    {
        bool IsConfigured { get; }
        IReadOnlyList<string> GetConfigurationErrors();
        PaymentInitiationResult CreateInstructions(PaymentOrder order, string publicBaseUrl);
    }
}
