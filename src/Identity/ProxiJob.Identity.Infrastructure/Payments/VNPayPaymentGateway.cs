using Microsoft.Extensions.Options;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Domain.Enums;
using ProxiJob.Identity.Domain.Models;
namespace ProxiJob.Identity.Infrastructure.Payments
{
    public class VNPayPaymentGateway : IPaymentGateway, IVNPayCallbackHandler
    {
        private readonly VNPaySettings _settings;

        public VNPayPaymentGateway(IOptions<VNPaySettings> settings) => _settings = settings.Value;

        public PaymentGatewayType GatewayType => PaymentGatewayType.VNPay;
        public bool IsEnabled => _settings.Enabled
            && !string.IsNullOrWhiteSpace(_settings.TmnCode)
            && !string.IsNullOrWhiteSpace(_settings.HashSecret);

        public Task<PaymentInitiationResult> CreatePaymentAsync(
            PaymentOrder order, string clientIp, CancellationToken cancellationToken = default)
        {
            var amount = (long)(order.Amount * 100);
            var createDate = DateTime.UtcNow.AddHours(7).ToString("yyyyMMddHHmmss");

            var parameters = new Dictionary<string, string>
            {
                ["vnp_Version"] = "2.1.0",
                ["vnp_Command"] = "pay",
                ["vnp_TmnCode"] = _settings.TmnCode,
                ["vnp_Amount"] = amount.ToString(),
                ["vnp_CurrCode"] = "VND",
                ["vnp_TxnRef"] = order.OrderCode,
                ["vnp_OrderInfo"] = $"Thanh toan goi ProxiJob {order.OrderCode}",
                ["vnp_OrderType"] = "other",
                ["vnp_Locale"] = "vn",
                ["vnp_ReturnUrl"] = _settings.ReturnUrl,
                ["vnp_IpAddr"] = string.IsNullOrWhiteSpace(clientIp) ? "127.0.0.1" : clientIp,
                ["vnp_CreateDate"] = createDate
            };

            var signData = string.Join("&", parameters
                .Where(p => !string.IsNullOrEmpty(p.Value))
                .OrderBy(p => p.Key)
                .Select(p => $"{p.Key}={p.Value}"));

            var secureHash = PaymentHashHelper.HmacSha512(_settings.HashSecret, signData);
            parameters["vnp_SecureHash"] = secureHash;

            var paymentUrl = $"{_settings.PaymentUrl}?{PaymentHashHelper.BuildQueryString(parameters)}";

            return Task.FromResult(new PaymentInitiationResult
            {
                PaymentUrl = paymentUrl,
                GatewayTransactionId = order.OrderCode
            });
        }

        public PaymentCallbackResult ValidateCallback(IReadOnlyDictionary<string, string> queryParams)
        {
            if (!queryParams.TryGetValue("vnp_SecureHash", out var receivedHash))
                return Fail("Thiếu chữ ký VNPay.");

            var signData = string.Join("&", queryParams
                .Where(p => p.Key.StartsWith("vnp_") && p.Key != "vnp_SecureHash" && !string.IsNullOrEmpty(p.Value))
                .OrderBy(p => p.Key)
                .Select(p => $"{p.Key}={p.Value}"));

            var calculated = PaymentHashHelper.HmacSha512(_settings.HashSecret, signData);
            if (!string.Equals(calculated, receivedHash, StringComparison.OrdinalIgnoreCase))
                return Fail("Chữ ký VNPay không hợp lệ.");

            queryParams.TryGetValue("vnp_TxnRef", out var orderCode);
            queryParams.TryGetValue("vnp_TransactionNo", out var txnNo);
            queryParams.TryGetValue("vnp_ResponseCode", out var responseCode);

            var success = responseCode == "00";
            return new PaymentCallbackResult
            {
                Success = success,
                OrderCode = orderCode,
                GatewayTransactionId = txnNo,
                FailureReason = success ? null : $"VNPay từ chối (mã {responseCode})."
            };
        }

        private static PaymentCallbackResult Fail(string reason) =>
            new() { Success = false, FailureReason = reason };
    }
}
