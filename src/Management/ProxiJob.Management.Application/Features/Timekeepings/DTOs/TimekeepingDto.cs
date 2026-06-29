using System;

namespace ProxiJob.Management.Application.Features.Timekeepings.DTOs;

public class TimekeepingDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public int WorkScheduleId { get; set; }
    public int? JobShiftId { get; set; }
    public DateTime? CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public double? InLatitude { get; set; }
    public double? InLongitude { get; set; }
    public double? OutLatitude { get; set; }
    public double? OutLongitude { get; set; }
    public string? CheckInPhoto { get; set; }
    public string? CheckOutPhoto { get; set; }
    public string? EmployeeName { get; set; }
    public string? Position { get; set; }
    public string? ShiftName { get; set; }
    public string? StudentPhone { get; set; }
    public string Status { get; set; } = default!;
    public bool IsManual { get; set; }
    public string? Note { get; set; }
}
