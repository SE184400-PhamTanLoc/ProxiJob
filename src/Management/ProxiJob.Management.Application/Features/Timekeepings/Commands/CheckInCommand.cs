using System;
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

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var workSchedule = await _context.WorkSchedules
            .FirstOrDefaultAsync(ws => ws.EmployeeId == employee.Id && ws.Date == today, cancellationToken);

        if (workSchedule == null)
        {
            throw new Exception("No work schedule found for today.");
        }

        var hasTimekeeping = await _context.Timekeepings
            .AnyAsync(t => t.WorkScheduleId == workSchedule.Id, cancellationToken);

        if (hasTimekeeping)
        {
            throw new Exception("You have already checked in for this schedule.");
        }

        TimekeepingStatus status = TimekeepingStatus.OnTime;
        var now = DateTime.UtcNow;

        if (now > workSchedule.StartTime.AddMinutes(15))
        {
            status = TimekeepingStatus.Late;
        }

        // Check GPS Distance
        if (qrCode.Latitude.HasValue && qrCode.Longitude.HasValue)
        {
            var distance = CalculateDistance(request.Latitude, request.Longitude, qrCode.Latitude.Value, qrCode.Longitude.Value);
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
