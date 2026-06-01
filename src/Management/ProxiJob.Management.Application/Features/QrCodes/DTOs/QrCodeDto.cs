namespace ProxiJob.Management.Application.Features.QrCodes.DTOs;

public class QrCodeDto
{
    public int Id { get; set; }
    public int BusinessId { get; set; }
    public string QrToken { get; set; } = default!;
    public int AllowedRadiusMeters { get; set; }
    public bool IsActive { get; set; }
}
