using ProxiJob.Shared.Kernel;

namespace ProxiJob.Identity.Domain.Models
{
    public class Transaction : BaseEntity
    {
        public int WalletId { get; set; }
        public decimal Amount { get; set; }
        public string Type { get; set; } // Nạp, Trừ, Nhận lương
        public string? Description { get; set; }
    }
}
