using ProxiJob.Identity.Domain.Enums;

namespace ProxiJob.Identity.Domain.Constants
{
    public static class PaymentGatewayNames
    {
        public const string BankTransfer = "BankTransfer";

        public static readonly string[] All = { BankTransfer };

        public static bool TryParse(string? value, out PaymentGatewayType gateway)
        {
            gateway = PaymentGatewayType.BankTransfer;
            if (string.IsNullOrWhiteSpace(value))
                return true;

            return value.Trim().ToUpperInvariant() is
                "BANKTRANSFER" or "BANK_TRANSFER" or "TRANSFER" or "CK";
        }

        public static string ToName(PaymentGatewayType gateway) => BankTransfer;
    }
}
