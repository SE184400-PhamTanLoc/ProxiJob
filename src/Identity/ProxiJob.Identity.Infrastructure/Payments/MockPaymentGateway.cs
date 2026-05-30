using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Domain.Enums;
using ProxiJob.Identity.Domain.Models;
namespace ProxiJob.Identity.Infrastructure.Payments
{
    public class MockPaymentGateway : IPaymentGateway
    {
        private readonly PaymentSettings _settings;
        private readonly bool _enabled;

        public MockPaymentGateway(IConfiguration configuration, IHostEnvironment environment)
        {
            _settings = configuration.GetSection("PaymentSettings").Get<PaymentSettings>() ?? new PaymentSettings();
            _enabled = environment.IsDevelopment()
                || configuration.GetValue("PaymentSettings:EnableMockGateway", true);
        }

        public PaymentGatewayType GatewayType => PaymentGatewayType.Mock;
        public bool IsEnabled => _enabled;

        public Task<PaymentInitiationResult> CreatePaymentAsync(
            PaymentOrder order, string clientIp, CancellationToken cancellationToken = default)
        {
            var baseUrl = _settings.PublicBaseUrl.TrimEnd('/');
            var paymentUrl = $"{baseUrl}/api/payments/mock/confirm/{order.Id}";

            return Task.FromResult(new PaymentInitiationResult
            {
                PaymentUrl = paymentUrl,
                GatewayTransactionId = order.OrderCode
            });
        }
    }
}
