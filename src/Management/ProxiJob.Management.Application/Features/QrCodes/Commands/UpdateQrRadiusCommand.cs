using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;

namespace ProxiJob.Management.Application.Features.QrCodes.Commands;

public class UpdateQrRadiusCommand : IRequest<bool>
{
    public int BusinessId { get; set; }
    public int AllowedRadiusMeters { get; set; }
    public string UpdatedBy { get; set; } = "System";
}

public class UpdateQrRadiusCommandHandler : IRequestHandler<UpdateQrRadiusCommand, bool>
{
    private readonly IManagementDbContext _context;

    public UpdateQrRadiusCommandHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateQrRadiusCommand request, CancellationToken cancellationToken)
    {
        if (request.AllowedRadiusMeters <= 0)
        {
            throw new Exception("Allowed radius must be greater than 0");
        }

        var qrCode = await _context.BusinessQrCodes
            .FirstOrDefaultAsync(q => q.BusinessId == request.BusinessId && q.IsActive, cancellationToken);

        if (qrCode == null)
        {
            throw new Exception("Active QR code not found for this business.");
        }

        qrCode.AllowedRadiusMeters = request.AllowedRadiusMeters;
        qrCode.UpdatedBy = request.UpdatedBy;
        qrCode.UpdatedAt = DateTime.UtcNow;

        _context.BusinessQrCodes.Update(qrCode);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
