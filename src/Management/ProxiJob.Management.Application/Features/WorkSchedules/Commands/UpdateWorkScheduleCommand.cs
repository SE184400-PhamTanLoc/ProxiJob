using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;

namespace ProxiJob.Management.Application.Features.WorkSchedules.Commands;

public class UpdateWorkScheduleCommand : IRequest<bool>
{
    public int ScheduleId { get; set; }
    public int BusinessId { get; set; }
    public DateOnly Date { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string? Note { get; set; }
    public string UpdatedBy { get; set; } = "System";
}

public class UpdateWorkScheduleCommandHandler : IRequestHandler<UpdateWorkScheduleCommand, bool>
{
    private readonly IManagementDbContext _context;

    public UpdateWorkScheduleCommandHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateWorkScheduleCommand request, CancellationToken cancellationToken)
    {
        if (request.EndTime <= request.StartTime)
        {
            throw new Exception("EndTime must be greater than StartTime");
        }

        var schedule = await _context.WorkSchedules
            .Include(ws => ws.Employee)
            .FirstOrDefaultAsync(ws => ws.Id == request.ScheduleId && ws.Employee.BusinessId == request.BusinessId, cancellationToken);

        if (schedule == null)
        {
            throw new Exception("Work schedule not found or access denied.");
        }

        // Check overlapping (excluding self)
        var isDuplicate = await _context.WorkSchedules
            .AnyAsync(ws => ws.Id != request.ScheduleId &&
                            ws.EmployeeId == schedule.EmployeeId &&
                            ((request.StartTime >= ws.StartTime && request.StartTime < ws.EndTime) ||
                             (request.EndTime > ws.StartTime && request.EndTime <= ws.EndTime) ||
                             (request.StartTime <= ws.StartTime && request.EndTime >= ws.EndTime)), cancellationToken);

        if (isDuplicate)
        {
            throw new Exception("There is an overlapping work schedule for this employee.");
        }

        schedule.Date = request.Date;
        schedule.StartTime = request.StartTime;
        schedule.EndTime = request.EndTime;
        schedule.Note = request.Note;
        
        schedule.UpdatedBy = request.UpdatedBy;
        schedule.UpdatedAt = DateTime.UtcNow;

        _context.WorkSchedules.Update(schedule);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
