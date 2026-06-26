using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Domain.Models;
using ProxiJob.Management.Domain.Enums;

namespace ProxiJob.Management.Application.Features.Timekeepings.Commands;

public class CheckInCommand : IRequest<int>
{
    public string QrToken { get; set; } = default!;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? CheckInPhoto { get; set; }
    public int UserId { get; set; }
    public string CreatedBy { get; set; } = "System";
    public double? TargetLatitude { get; set; }
    public double? TargetLongitude { get; set; }
}

public class CheckInCommandHandler : IRequestHandler<CheckInCommand, int>
{
    private readonly IManagementDbContext _context;

    public CheckInCommandHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CheckInCommand request, CancellationToken cancellationToken)
    {
        var qrCode = await _context.BusinessQrCodes
            .FirstOrDefaultAsync(q => q.QrToken == request.QrToken && q.IsActive, cancellationToken);

        if (qrCode == null)
        {
            throw new Exception("Invalid or inactive QR code.");
        }

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.UserId == request.UserId && e.BusinessId == qrCode.BusinessId, cancellationToken);

        if (employee == null)
        {
            throw new Exception("Employee not found for this business.");
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        var schedules = await _context.WorkSchedules
            .Where(ws => ws.EmployeeId == employee.Id && ws.Date == today)
            .ToListAsync(cancellationToken);

        if (schedules == null || !schedules.Any())
        {
            throw new Exception($"No work schedule found for today ({today:yyyy-MM-dd}).");
        }

        WorkSchedule workSchedule;
        if (schedules.Count == 1)
        {
            workSchedule = schedules.First();
        }
        else
        {
            var nowUtc = DateTime.UtcNow;
            
            // 1. Find schedule where now falls within [StartTime - 30m, EndTime]
            var activeSchedules = schedules
                .Where(ws => nowUtc >= ws.StartTime.AddMinutes(-30) && nowUtc <= ws.EndTime)
                .ToList();

            if (activeSchedules.Count == 1)
            {
                workSchedule = activeSchedules.First();
            }
            else
            {
                // 2. Otherwise, find the schedule closest to its StartTime
                workSchedule = schedules
                    .OrderBy(ws => Math.Abs((ws.StartTime - nowUtc).Ticks))
                    .First();
            }
        }

        var hasTimekeeping = await _context.Timekeepings
            .AnyAsync(t => t.WorkScheduleId == workSchedule.Id, cancellationToken);

        if (hasTimekeeping)
        {
            throw new Exception("You have already checked in for this schedule.");
        }

        TimekeepingStatus status = TimekeepingStatus.OnTime;
        var now = DateTime.UtcNow;
        var nowLocal = now.AddHours(7);

        if (nowLocal > workSchedule.StartTime.AddMinutes(15))
        {
            status = TimekeepingStatus.Late;
        }

        // Check GPS Distance
        double? targetLat = request.TargetLatitude ?? qrCode.Latitude;
        double? targetLng = request.TargetLongitude ?? qrCode.Longitude;

        if (targetLat.HasValue && targetLng.HasValue)
        {
            var distance = CalculateDistance(request.Latitude, request.Longitude, targetLat.Value, targetLng.Value);
            if (distance > qrCode.AllowedRadiusMeters)
            {
                status = TimekeepingStatus.Suspicious;
            }
        }

        var timekeeping = new Timekeeping
        {
            EmployeeId = employee.Id,
            WorkScheduleId = workSchedule.Id,
            CheckInTime = now,
            InLatitude = request.Latitude,
            InLongitude = request.Longitude,
            CheckInPhoto = request.CheckInPhoto, // Assuming URL after uploading to Supabase
            Status = status,
            IsManual = false,
            CreatedBy = request.CreatedBy,
            CreatedAt = now
        };

        _context.Timekeepings.Add(timekeeping);
        await _context.SaveChangesAsync(cancellationToken);

        return timekeeping.Id;
    }

    private double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        var R = 6371e3; // metres
        var f1 = lat1 * Math.PI / 180;
        var f2 = lat2 * Math.PI / 180;
        var df = (lat2 - lat1) * Math.PI / 180;
        var dl = (lon2 - lon1) * Math.PI / 180;

        var a = Math.Sin(df / 2) * Math.Sin(df / 2) +
                Math.Cos(f1) * Math.Cos(f2) *
                Math.Sin(dl / 2) * Math.Sin(dl / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        var d = R * c;
        return d;
    }
}
