namespace ProxiJob.Identity.Domain.Constants
{
    public static class BusinessTypes
    {
        public const string Cafe = "Cafe";
        public const string NhaHang = "NhaHang";
        public const string Bar = "Bar";
        public const string FastFood = "FastFood";
        public const string Bakery = "Bakery";
        public const string Khac = "Khac";

        public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
        {
            Cafe, NhaHang, Bar, FastFood, Bakery, Khac
        };
    }
}
