using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Domain.Models;
using ProxiJob.Management.Domain.Enums;

namespace ProxiJob.Management.Application.Features.Timekeepings.Commands;

public class ManualTimekeepingCommand : IRequest<int>
{
    public int EmployeeId { get; set; }
    public int WorkScheduleId { get; set; }
    public DateTime CheckInTime { get; set; }
    public DateTime CheckOutTime { get; set; }
    public string? Note { get; set; }
    public int BusinessId { get; set; }
    public string CreatedBy { get; set; } = "System";
}

public class ManualTimekeepingCommandHandler : IRequestHandler<ManualTimekeepingCommand, int>
{
    private readonly IManagementDbContext _context;

    public ManualTimekeepingCommandHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(ManualTimekeepingCommand request, CancellationToken cancellationToken)
    {
        if (request.CheckOutTime <= request.CheckInTime)
        {
            throw new Exception("CheckOutTime must be greater than CheckInTime.");
        }

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId && e.BusinessId == request.BusinessId, cancellationToken);

        if (employee == null)
        {
            throw new Exception("Employee not found or access denied.");
        }

        var workSchedule = await _context.WorkSchedules
            .FirstOrDefaultAsync(ws => ws.Id == request.WorkScheduleId && ws.EmployeeId == request.EmployeeId, cancellationToken);

        if (workSchedule == null)
        {
            throw new Exception("Work schedule not found for this employee.");
        }

        var hasTimekeeping = await _context.Timekeepings
            .AnyAsync(t => t.WorkScheduleId == workSchedule.Id, cancellationToken);

        if (hasTimekeeping)
        {
            throw new Exception("A timekeeping record already exists for this schedule.");
        }

        TimekeepingStatus status = TimekeepingStatus.OnTime;
        if (request.CheckInTime > workSchedule.StartTime.AddMinutes(15))
        {
            status = TimekeepingStatus.Late;
        }

        var timekeeping = new Timekeeping
        {
            EmployeeId = employee.Id,
            WorkScheduleId = workSchedule.Id,
            CheckInTime = request.CheckInTime,
            CheckOutTime = request.CheckOutTime,
            Status = status,
            IsManual = true,
            Note = request.Note,
            CreatedBy = request.CreatedBy,
            CreatedAt = DateTime.UtcNow
        };

        _context.Timekeepings.Add(timekeeping);
        await _context.SaveChangesAsync(cancellationToken);

        return timekeeping.Id;
    }
}
