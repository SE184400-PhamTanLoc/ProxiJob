using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Domain.Enums;

namespace ProxiJob.Management.Application.Features.Timekeepings.Commands;

public class ConfirmSuspiciousCommand : IRequest<bool>
{
    public int TimekeepingId { get; set; }
    public string Note { get; set; } = default!;
    public int BusinessId { get; set; }
    public string UpdatedBy { get; set; } = "System";
}

public class ConfirmSuspiciousCommandHandler : IRequestHandler<ConfirmSuspiciousCommand, bool>
{
    private readonly IManagementDbContext _context;

    public ConfirmSuspiciousCommandHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(ConfirmSuspiciousCommand request, CancellationToken cancellationToken)
    {
        var timekeeping = await _context.Timekeepings
            .Include(t => t.WorkSchedule)
            .Include(t => t.Employee)
            .FirstOrDefaultAsync(t => t.Id == request.TimekeepingId && t.Employee.BusinessId == request.BusinessId, cancellationToken);

        if (timekeeping == null)
        {
            throw new Exception("Timekeeping not found or access denied.");
        }

        if (timekeeping.Status != TimekeepingStatus.Suspicious)
        {
            throw new Exception("Only Suspicious timekeeping records can be confirmed.");
        }

        TimekeepingStatus newStatus = TimekeepingStatus.OnTime;
        if (timekeeping.CheckInTime.HasValue && timekeeping.CheckInTime.Value > timekeeping.WorkSchedule.StartTime.AddMinutes(15))
        {
            newStatus = TimekeepingStatus.Late;
        }

        timekeeping.Status = newStatus;
        timekeeping.Note = string.IsNullOrEmpty(timekeeping.Note) ? request.Note : $"{timekeeping.Note} | Confirmed: {request.Note}";
        
        timekeeping.UpdatedBy = request.UpdatedBy;
        timekeeping.UpdatedAt = DateTime.UtcNow;

        _context.Timekeepings.Update(timekeeping);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
