using ProxiJob.Management.Domain.Enums;
using ProxiJob.Shared.Kernel;

namespace ProxiJob.Management.Domain.Models;

public class Payroll : BaseEntity
{
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = default!;

    public decimal TotalHours { get; set; }
    public decimal BaseAmount { get; set; }
    public decimal? Adjustment { get; set; }
    public string? AdjustmentNote { get; set; }
    public decimal FinalAmount { get; set; }
    public DateOnly? PayDate { get; set; }
    public PayrollStatus Status { get; set; } = PayrollStatus.Pending;
}

