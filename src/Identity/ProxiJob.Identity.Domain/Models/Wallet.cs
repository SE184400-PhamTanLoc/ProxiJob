using ProxiJob.Shared.Kernel;

namespace ProxiJob.Identity.Domain.Models
{
    public class Wallet : BaseEntity
    {
        public int UserId { get; set; }
        public decimal Balance { get; set; } = 0;
    }
}
