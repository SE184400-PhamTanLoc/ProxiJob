using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Domain.Models;

namespace ProxiJob.Management.Application.Features.WorkSchedules.Commands;

public class CreateWorkScheduleCommand : IRequest<int>
{
    public int EmployeeId { get; set; }
    public int BusinessId { get; set; }
    public DateOnly Date { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string? Note { get; set; }
    public int? JobShiftId { get; set; }
    public string CreatedBy { get; set; } = "System";
}

public class CreateWorkScheduleCommandHandler : IRequestHandler<CreateWorkScheduleCommand, int>
{
    private readonly IManagementDbContext _context;

    public CreateWorkScheduleCommandHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateWorkScheduleCommand request, CancellationToken cancellationToken)
    {
        if (request.EndTime <= request.StartTime)
        {
            throw new Exception("EndTime must be greater than StartTime");
        }

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId && e.BusinessId == request.BusinessId, cancellationToken);

        if (employee == null)
        {
            throw new Exception("Employee not found or does not belong to this business.");
        }

        // Check for duplicate schedule
        var isDuplicate = await _context.WorkSchedules
            .AnyAsync(ws => ws.EmployeeId == request.EmployeeId &&
                            ((request.StartTime >= ws.StartTime && request.StartTime < ws.EndTime) ||
                             (request.EndTime > ws.StartTime && request.EndTime <= ws.EndTime) ||
                             (request.StartTime <= ws.StartTime && request.EndTime >= ws.EndTime)), cancellationToken);

        if (isDuplicate)
        {
            throw new Exception("There is an overlapping work schedule for this employee.");
        }

        var schedule = new WorkSchedule
        {
            EmployeeId = request.EmployeeId,
            Date = request.Date,
            StartTime = request.StartTime.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(request.StartTime, DateTimeKind.Utc)
                : request.StartTime.ToUniversalTime(),
            EndTime = request.EndTime.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(request.EndTime, DateTimeKind.Utc)
                : request.EndTime.ToUniversalTime(),
            Note = request.Note,
            JobShiftId = request.JobShiftId,
            CreatedBy = request.CreatedBy,
            CreatedAt = DateTime.UtcNow
        };

        _context.WorkSchedules.Add(schedule);
        await _context.SaveChangesAsync(cancellationToken);

        return schedule.Id;
    }
}
