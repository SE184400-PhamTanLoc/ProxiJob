using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;

namespace ProxiJob.Management.Application.Features.WorkSchedules.Commands;

public class DeleteWorkScheduleCommand : IRequest<bool>
{
    public int ScheduleId { get; set; }
    public int BusinessId { get; set; }
    public string DeletedBy { get; set; } = "System";
}

public class DeleteWorkScheduleCommandHandler : IRequestHandler<DeleteWorkScheduleCommand, bool>
{
    private readonly IManagementDbContext _context;

    public DeleteWorkScheduleCommandHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteWorkScheduleCommand request, CancellationToken cancellationToken)
    {
        var schedule = await _context.WorkSchedules
            .Include(ws => ws.Employee)
            .FirstOrDefaultAsync(ws => ws.Id == request.ScheduleId && ws.Employee.BusinessId == request.BusinessId, cancellationToken);

        if (schedule == null)
        {
            throw new Exception("Work schedule not found or access denied.");
        }

        // Cannot delete if there is an associated Timekeeping record
        var hasTimekeeping = await _context.Timekeepings
            .AnyAsync(t => t.WorkScheduleId == request.ScheduleId, cancellationToken);

        if (hasTimekeeping)
        {
            throw new Exception("Cannot delete WorkSchedule because a Timekeeping record already exists.");
        }

        schedule.IsDeleted = true;
        schedule.DeletedBy = request.DeletedBy;
        schedule.DeletedAt = DateTime.UtcNow;

        _context.WorkSchedules.Update(schedule);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
