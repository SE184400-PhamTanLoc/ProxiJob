using ProxiJob.Shared.Kernel;

namespace ProxiJob.Management.Domain.Models;

public class BusinessQrCode : BaseEntity
{
    public int BusinessId { get; set; }
    public string QrToken { get; set; } = default!;

    public int AllowedRadiusMeters { get; set; } = 100;
    public bool IsActive { get; set; } = true;

    // Out-of-spec but required to compute GPS distance:
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}

