using ProxiJob.Management.Domain.Enums;
using ProxiJob.Shared.Kernel;

namespace ProxiJob.Management.Domain.Models;

public class Timekeeping : BaseEntity
{
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = default!;

    public int WorkScheduleId { get; set; }
    public WorkSchedule WorkSchedule { get; set; } = default!;

    public DateTime? CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }

    public double? InLatitude { get; set; }
    public double? InLongitude { get; set; }
    public double? OutLatitude { get; set; }
    public double? OutLongitude { get; set; }

    public string? CheckInPhoto { get; set; }
    public string? CheckOutPhoto { get; set; }

    public TimekeepingStatus Status { get; set; }
    public bool IsManual { get; set; } = false;
    public string? Note { get; set; }
}

