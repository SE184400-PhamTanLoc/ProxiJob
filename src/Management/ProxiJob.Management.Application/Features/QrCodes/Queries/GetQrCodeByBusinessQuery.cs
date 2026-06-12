using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Application.Features.QrCodes.DTOs;

namespace ProxiJob.Management.Application.Features.QrCodes.Queries;

public class GetQrCodeByBusinessQuery : IRequest<QrCodeDto?>
{
    public int BusinessId { get; set; }
}

public class GetQrCodeByBusinessQueryHandler : IRequestHandler<GetQrCodeByBusinessQuery, QrCodeDto?>
{
    private readonly IManagementDbContext _context;

    public GetQrCodeByBusinessQueryHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<QrCodeDto?> Handle(GetQrCodeByBusinessQuery request, CancellationToken cancellationToken)
    {
        var qrCode = await _context.BusinessQrCodes
            .FirstOrDefaultAsync(q => q.BusinessId == request.BusinessId && q.IsActive, cancellationToken);

        if (qrCode == null) return null;

        return new QrCodeDto
        {
            Id = qrCode.Id,
            BusinessId = qrCode.BusinessId,
            QrToken = qrCode.QrToken,
            AllowedRadiusMeters = qrCode.AllowedRadiusMeters,
            IsActive = qrCode.IsActive
        };
    }
}
