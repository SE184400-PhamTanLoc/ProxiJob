namespace ProxiJob.Identity.Application.DTOs
{
    public class PurchasePlanResponseDto
    {
        public int OrderId { get; set; }
        public string OrderCode { get; set; }
        public string Gateway { get; set; } = "BankTransfer";
        public decimal Amount { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string Message { get; set; }
        public BankTransferInstructionsDto? BankTransfer { get; set; }
    }
}

