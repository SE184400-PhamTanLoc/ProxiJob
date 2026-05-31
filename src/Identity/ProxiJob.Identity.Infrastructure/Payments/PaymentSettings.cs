namespace ProxiJob.Identity.Infrastructure.Payments
{
    public class PaymentSettings
    {
        public string PublicBaseUrl { get; set; } = "https://localhost:7159";
        public int OrderExpirationMinutes { get; set; } = 1440;
    }

    public class BankTransferSettings
    {
        public bool Enabled { get; set; } = true;
        public string BankName { get; set; } = "MB Bank";
        public string AccountNumber { get; set; } = "0783629758";
        public string AccountHolder { get; set; } = "";
        /// <summary>Đường dẫn QR tĩnh (file trong wwwroot), ví dụ /images/payment-qr.jpg</summary>
        public string QrImagePath { get; set; } = "/images/payment-qr.jpg";
        public int OrderExpirationMinutes { get; set; } = 1440;
    }
}
