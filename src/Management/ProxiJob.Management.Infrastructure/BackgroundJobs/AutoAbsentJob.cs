using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ProxiJob.Management.Domain.Enums;
using ProxiJob.Management.Domain.Models;
using ProxiJob.Management.Infrastructure.Data;
using ProxiJob.Shared.Contract.Events;

namespace ProxiJob.Management.Infrastructure.BackgroundJobs;

public class AutoAbsentJob : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<AutoAbsentJob> _logger;

    public AutoAbsentJob(IServiceProvider serviceProvider, ILogger<AutoAbsentJob> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AutoAbsentJob is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessAbsentRecordsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing AutoAbsentJob.");
            }

            // Run every 30 minutes
            await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
        }

        _logger.LogInformation("AutoAbsentJob is stopping.");
    }

    private async Task ProcessAbsentRecordsAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ManagementDbContext>();
        var publishEndpoint = scope.ServiceProvider.GetRequiredService<IPublishEndpoint>();

        var thresholdTime = DateTime.UtcNow.AddHours(-2);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Find schedules where start time + 2 hours < now and no timekeeping exists
        var missedSchedules = await context.WorkSchedules
            .Include(ws => ws.Employee)
            .Where(ws => ws.Date == today && ws.StartTime < thresholdTime)
            .Where(ws => !context.Timekeepings.Any(t => t.WorkScheduleId == ws.Id))
            .ToListAsync(stoppingToken);

        if (!missedSchedules.Any()) return;

        var now = DateTime.UtcNow;
        var absentRecords = missedSchedules.Select(ws => new Timekeeping
        {
            EmployeeId = ws.EmployeeId,
            WorkScheduleId = ws.Id,
            Status = TimekeepingStatus.Absent,
            IsManual = false,
            CreatedBy = "AutoAbsentJob",
            CreatedAt = now,
            Note = "Auto-marked as absent by system."
        }).ToList();

        context.Timekeepings.AddRange(absentRecords);
        await context.SaveChangesAsync(stoppingToken);

        _logger.LogInformation("AutoAbsentJob: Marked {Count} employees as absent.", absentRecords.Count);

        // Publish EmployeeAbsentEvent for each absent record
        foreach (var ws in missedSchedules)
        {
            await publishEndpoint.Publish(new EmployeeAbsentEvent(
                EmployeeId: ws.EmployeeId,
                BusinessId: ws.Employee.BusinessId,
                WorkScheduleId: ws.Id,
                Date: today,
                EmployeeName: ws.Employee.FullName
            ), stoppingToken);
        }

        _logger.LogInformation("AutoAbsentJob: Published {Count} EmployeeAbsentEvent(s).", missedSchedules.Count);
    }
}

