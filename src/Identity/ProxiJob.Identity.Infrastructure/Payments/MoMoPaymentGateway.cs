using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Domain.Enums;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Infrastructure.Payments
{
    public class MoMoPaymentGateway : IPaymentGateway, IMoMoCallbackHandler
    {
        private readonly MoMoSettings _settings;
        private readonly HttpClient _httpClient;

        public MoMoPaymentGateway(IOptions<MoMoSettings> settings, IHttpClientFactory httpClientFactory)
        {
            _settings = settings.Value;
            _httpClient = httpClientFactory.CreateClient("MoMo");
        }

        public PaymentGatewayType GatewayType => PaymentGatewayType.MoMo;
        public bool IsEnabled => _settings.Enabled
            && !string.IsNullOrWhiteSpace(_settings.PartnerCode)
            && !string.IsNullOrWhiteSpace(_settings.AccessKey)
            && !string.IsNullOrWhiteSpace(_settings.SecretKey);

        public async Task<PaymentInitiationResult> CreatePaymentAsync(
            PaymentOrder order, string clientIp, CancellationToken cancellationToken = default)
        {
            var requestId = order.OrderCode;
            var orderId = order.OrderCode;
            var orderInfo = $"Thanh toan goi ProxiJob {order.OrderCode}";
            var amount = (long)order.Amount;
            var extraData = string.Empty;
            var requestType = "captureWallet";

            var rawSignature =
                $"accessKey={_settings.AccessKey}" +
                $"&amount={amount}" +
                $"&extraData={extraData}" +
                $"&ipnUrl={_settings.IpnUrl}" +
                $"&orderId={orderId}" +
                $"&orderInfo={orderInfo}" +
                $"&partnerCode={_settings.PartnerCode}" +
                $"&redirectUrl={_settings.ReturnUrl}" +
                $"&requestId={requestId}" +
                $"&requestType={requestType}";

            var signature = PaymentHashHelper.HmacSha256(_settings.SecretKey, rawSignature);

            var payload = new
            {
                partnerCode = _settings.PartnerCode,
                partnerName = "ProxiJob",
                storeId = "ProxiJob",
                requestId,
                amount,
                orderId,
                orderInfo,
                redirectUrl = _settings.ReturnUrl,
                ipnUrl = _settings.IpnUrl,
                lang = "vi",
                requestType,
                autoCapture = true,
                extraData,
                signature
            };

            using var response = await _httpClient.PostAsJsonAsync(_settings.ApiEndpoint, payload, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"MoMo tạo giao dịch thất bại: {body}");

            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            var resultCode = root.GetProperty("resultCode").GetInt32();
            if (resultCode != 0)
            {
                var message = root.TryGetProperty("message", out var msg) ? msg.GetString() : "Unknown";
                throw new InvalidOperationException($"MoMo từ chối: {message}");
            }

            var payUrl = root.GetProperty("payUrl").GetString() ?? string.Empty;
            var transId = root.TryGetProperty("requestId", out var rid) ? rid.GetString() : requestId;

            return new PaymentInitiationResult
            {
                PaymentUrl = payUrl,
                GatewayTransactionId = transId
            };
        }

        public PaymentCallbackResult ValidateCallback(IReadOnlyDictionary<string, string> bodyParams)
        {
            bodyParams.TryGetValue("orderId", out var orderCode);
            bodyParams.TryGetValue("transId", out var transId);
            bodyParams.TryGetValue("resultCode", out var resultCode);
            bodyParams.TryGetValue("signature", out var receivedSignature);

            if (string.IsNullOrEmpty(receivedSignature))
                return Fail("Thiếu chữ ký MoMo.");

            var rawSignature =
                $"accessKey={_settings.AccessKey}" +
                $"&amount={Get(bodyParams, "amount")}" +
                $"&extraData={Get(bodyParams, "extraData")}" +
                $"&message={Get(bodyParams, "message")}" +
                $"&orderId={orderCode}" +
                $"&orderInfo={Get(bodyParams, "orderInfo")}" +
                $"&orderType={Get(bodyParams, "orderType")}" +
                $"&partnerCode={Get(bodyParams, "partnerCode")}" +
                $"&payType={Get(bodyParams, "payType")}" +
                $"&requestId={Get(bodyParams, "requestId")}" +
                $"&responseTime={Get(bodyParams, "responseTime")}" +
                $"&resultCode={resultCode}" +
                $"&transId={transId}";

            var calculated = PaymentHashHelper.HmacSha256(_settings.SecretKey, rawSignature);
            if (!string.Equals(calculated, receivedSignature, StringComparison.OrdinalIgnoreCase))
                return Fail("Chữ ký MoMo không hợp lệ.");

            var success = resultCode == "0";
            return new PaymentCallbackResult
            {
                Success = success,
                OrderCode = orderCode,
                GatewayTransactionId = transId,
                FailureReason = success ? null : $"MoMo từ chối (mã {resultCode})."
            };
        }

        private static PaymentCallbackResult Fail(string reason) =>
            new() { Success = false, FailureReason = reason };

        private static string Get(IReadOnlyDictionary<string, string> parameters, string key)
            => parameters.TryGetValue(key, out var value) ? value : string.Empty;
    }
}
