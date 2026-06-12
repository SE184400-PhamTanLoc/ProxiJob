using Microsoft.Extensions.Options;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Infrastructure.Payments
{
    public class BankTransferPaymentService : IBankTransferPaymentService
    {
        private readonly BankTransferSettings _settings;

        public BankTransferPaymentService(IOptions<BankTransferSettings> settings)
            => _settings = settings.Value;

        public bool IsConfigured => GetConfigurationErrors().Count == 0;

        public IReadOnlyList<string> GetConfigurationErrors()
        {
            var errors = new List<string>();
            if (!_settings.Enabled)
                errors.Add("BankTransfer:Enabled = false");
            if (string.IsNullOrWhiteSpace(_settings.AccountNumber))
                errors.Add("BankTransfer:AccountNumber (STK)");
            if (string.IsNullOrWhiteSpace(_settings.AccountHolder))
                errors.Add("BankTransfer:AccountHolder (tên chủ TK — hay bị thiếu)");
            if (string.IsNullOrWhiteSpace(_settings.QrImagePath))
                errors.Add("BankTransfer:QrImagePath");
            return errors;
        }

        public PaymentInitiationResult CreateInstructions(PaymentOrder order, string publicBaseUrl)
        {
            var transferContent = order.OrderCode;
            var qrUrl = BuildAbsoluteUrl(publicBaseUrl, _settings.QrImagePath);

            var instructions = new BankTransferInstructionsDto
            {
                BankName = _settings.BankName,
                AccountNumber = _settings.AccountNumber,
                AccountHolder = _settings.AccountHolder,
                TransferContent = transferContent,
                Amount = order.Amount,
                QrImageUrl = qrUrl
            };

            return new PaymentInitiationResult
            {
                QrImageUrl = qrUrl,
                GatewayTransactionId = transferContent,
                BankTransfer = instructions
            };
        }

        private static string BuildAbsoluteUrl(string publicBaseUrl, string path)
        {
            var baseUrl = publicBaseUrl.TrimEnd('/');
            var relative = path.StartsWith('/') ? path : $"/{path}";
            return $"{baseUrl}{relative}";
        }
    }
}
