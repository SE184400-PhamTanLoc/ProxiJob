namespace ProxiJob.Identity.Application.DTOs
{
    public class BankTransferInstructionsDto
    {
        public string BankName { get; set; } = "";
        public string AccountNumber { get; set; } = "";
        public string AccountHolder { get; set; } = "";
        public string TransferContent { get; set; } = "";
        public decimal Amount { get; set; }
        public string? QrImageUrl { get; set; }
    }
}
