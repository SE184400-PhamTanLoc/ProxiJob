using System;
using System.Linq;
using System.Threading.Tasks;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ProxiJob.Management.Domain.Models;
using ProxiJob.Management.Domain.Enums;
using ProxiJob.Management.Infrastructure.Data;
using ProxiJob.Shared.Contract.Events;

namespace ProxiJob.Management.Infrastructure.Messaging.Consumers;

public class ApplicationApprovedConsumer : IConsumer<ApplicationApprovedEvent>
{
    private readonly ManagementDbContext _context;
    private readonly ILogger<ApplicationApprovedConsumer> _logger;

    public ApplicationApprovedConsumer(ManagementDbContext context, ILogger<ApplicationApprovedConsumer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ApplicationApprovedEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Received ApplicationApprovedEvent: ApplicationId={ApplicationId}, StudentId={StudentId}", msg.ApplicationId, msg.StudentId);

        // 1. Idempotent: Check if Employee exists
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.UserId == msg.StudentId && e.BusinessId == msg.BusinessId);

        if (employee == null)
        {
            employee = new Employee
            {
                UserId = msg.StudentId,
                BusinessId = msg.BusinessId,
                FullName = msg.JobTitle, // Placeholder: ideally fetched via gRPC from Identity Service
                IsExternal = true,
                PaymentType = PaymentType.PerShift,
                Status = EmployeeStatus.Active,
                CreatedBy = "RabbitMQ",
                CreatedAt = DateTime.UtcNow
            };
            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Created new external Employee UserId={UserId}", msg.StudentId);
        }

        // 2. Idempotent: Check if WorkSchedule for this JobShiftId already exists
        var exists = await _context.WorkSchedules
            .AnyAsync(ws => ws.EmployeeId == employee.Id && ws.JobShiftId == msg.JobShiftId);

        if (!exists)
        {
            var schedule = new WorkSchedule
            {
                EmployeeId = employee.Id,
                JobShiftId = msg.JobShiftId,
                JobShiftSalary = msg.Salary,
                Date = DateOnly.FromDateTime(msg.ShiftStartTime),
                StartTime = msg.ShiftStartTime,
                EndTime = msg.ShiftEndTime,
                CreatedBy = "RabbitMQ",
                CreatedAt = DateTime.UtcNow
            };
            _context.WorkSchedules.Add(schedule);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Created WorkSchedule for JobShiftId={JobShiftId}", msg.JobShiftId);
        }
    }
}
