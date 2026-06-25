using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Domain.Models;

namespace ProxiJob.Management.Application.Features.QrCodes.Commands;

public class GenerateQrCodeCommand : IRequest<string>
{
    public int BusinessId { get; set; }
    public string CreatedBy { get; set; } = "System";
}

public class GenerateQrCodeCommandHandler : IRequestHandler<GenerateQrCodeCommand, string>
{
    private readonly IManagementDbContext _context;

    public GenerateQrCodeCommandHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<string> Handle(GenerateQrCodeCommand request, CancellationToken cancellationToken)
    {
        var existingQr = await _context.BusinessQrCodes
            .FirstOrDefaultAsync(q => q.BusinessId == request.BusinessId, cancellationToken);

        var newQrToken = Guid.NewGuid().ToString();

        if (existingQr != null)
        {
            existingQr.QrToken = newQrToken;
            existingQr.IsActive = true;
            existingQr.UpdatedBy = request.CreatedBy;
            existingQr.UpdatedAt = DateTime.UtcNow;
            _context.BusinessQrCodes.Update(existingQr);
        }
        else
        {
            var newQr = new BusinessQrCode
            {
                BusinessId = request.BusinessId,
                QrToken = newQrToken,
                AllowedRadiusMeters = 100, // default
                IsActive = true,
                CreatedBy = request.CreatedBy,
                CreatedAt = DateTime.UtcNow
            };
            _context.BusinessQrCodes.Add(newQr);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return newQrToken;
    }
}
