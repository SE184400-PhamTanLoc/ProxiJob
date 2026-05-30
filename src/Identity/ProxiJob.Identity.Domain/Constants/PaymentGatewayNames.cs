using ProxiJob.Identity.Domain.Enums;

namespace ProxiJob.Identity.Domain.Constants
{
    public static class PaymentGatewayNames
    {
        public const string Mock = "Mock";
        public const string VNPay = "VNPay";
        public const string MoMo = "MoMo";

        public static readonly string[] All = { Mock, VNPay, MoMo };

        public static bool TryParse(string? value, out PaymentGatewayType gateway)
        {
            gateway = PaymentGatewayType.Mock;
            if (string.IsNullOrWhiteSpace(value))
                return false;

            switch (value.Trim().ToUpperInvariant())
            {
                case "MOCK":
                    gateway = PaymentGatewayType.Mock;
                    return true;
                case "VNPAY":
                    gateway = PaymentGatewayType.VNPay;
                    return true;
                case "MOMO":
                    gateway = PaymentGatewayType.MoMo;
                    return true;
                default:
                    return false;
            }
        }

        public static string ToName(PaymentGatewayType gateway) => gateway switch
        {
            PaymentGatewayType.VNPay => VNPay,
            PaymentGatewayType.MoMo => MoMo,
            _ => Mock
        };
    }
}
