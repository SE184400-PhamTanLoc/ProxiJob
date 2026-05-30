namespace ProxiJob.Identity.Domain.Constants
{
    public static class SubscriptionNames
    {
        /// <summary>Chưa mua gói (chủ quán mới đăng ký).</summary>
        public const string None = "None";

        public const string PerShift = "PerShift";
        public const string Basic = "Basic";
        public const string Standard = "Standard";
        public const string Premium = "Premium";

        public static readonly string[] AllPaidPlans = { PerShift, Basic, Standard, Premium };
    }
}
