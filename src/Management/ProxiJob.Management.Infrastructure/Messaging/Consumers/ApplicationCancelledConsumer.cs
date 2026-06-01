using System;
using System.Linq;
using System.Threading.Tasks;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProxiJob.Management.Infrastructure.Data;
using ProxiJob.Shared.Contract.Events;

namespace ProxiJob.Management.Infrastructure.Messaging.Consumers;

public class ApplicationCancelledConsumer : IConsumer<ApplicationCancelledEvent>
{
    private readonly ManagementDbContext _context;
    private readonly ILogger<ApplicationCancelledConsumer> _logger;

    public ApplicationCancelledConsumer(ManagementDbContext context, ILogger<ApplicationCancelledConsumer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ApplicationCancelledEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Received ApplicationCancelledEvent: ApplicationId={ApplicationId}, JobShiftId={JobShiftId}", msg.ApplicationId, msg.JobShiftId);

        // 1. Find Employee by UserId + BusinessId
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.UserId == msg.StudentId && e.BusinessId == msg.BusinessId);

        if (employee == null)
        {
            _logger.LogWarning("No employee found for StudentId={StudentId}, BusinessId={BusinessId}. Skipping.", msg.StudentId, msg.BusinessId);
            return;
        }

        // 2. Find WorkSchedule by EmployeeId + JobShiftId
        var schedule = await _context.WorkSchedules
            .FirstOrDefaultAsync(ws => ws.EmployeeId == employee.Id && ws.JobShiftId == msg.JobShiftId);

        if (schedule == null)
        {
            _logger.LogWarning("No WorkSchedule found for EmployeeId={EmployeeId}, JobShiftId={JobShiftId}. Skipping.", employee.Id, msg.JobShiftId);
            return;
        }

        // 3. Soft delete the WorkSchedule
        schedule.IsDeleted = true;
        schedule.DeletedAt = DateTime.UtcNow;
        schedule.DeletedBy = "RabbitMQ";

        // 4. Soft delete any pending Timekeeping tied to this schedule
        var pendingTimekeeping = await _context.Timekeepings
            .Where(t => t.WorkScheduleId == schedule.Id && !t.CheckInTime.HasValue)
            .ToListAsync();

        foreach (var t in pendingTimekeeping)
        {
            t.IsDeleted = true;
            t.DeletedAt = DateTime.UtcNow;
            t.DeletedBy = "RabbitMQ";
        }

        _context.WorkSchedules.Update(schedule);
        if (pendingTimekeeping.Any())
        {
            _context.Timekeepings.UpdateRange(pendingTimekeeping);
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Soft-deleted WorkScheduleId={ScheduleId} and {Count} timekeeping record(s).", schedule.Id, pendingTimekeeping.Count);
    }
}
