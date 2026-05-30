namespace ProxiJob.Identity.Infrastructure.Payments
{
    public class PaymentSettings
    {
        public string PublicBaseUrl { get; set; } = "https://localhost:7159";
        public int OrderExpirationMinutes { get; set; } = 15;
    }

    public class VNPaySettings
    {
        public bool Enabled { get; set; }
        public string TmnCode { get; set; } = string.Empty;
        public string HashSecret { get; set; } = string.Empty;
        public string PaymentUrl { get; set; } = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
        public string ReturnUrl { get; set; } = string.Empty;
        public string IpnUrl { get; set; } = string.Empty;
    }

    public class MoMoSettings
    {
        public bool Enabled { get; set; }
        public string PartnerCode { get; set; } = string.Empty;
        public string AccessKey { get; set; } = string.Empty;
        public string SecretKey { get; set; } = string.Empty;
        public string ApiEndpoint { get; set; } = "https://test-payment.momo.vn/v2/gateway/api/create";
        public string ReturnUrl { get; set; } = string.Empty;
        public string IpnUrl { get; set; } = string.Empty;
    }
}
