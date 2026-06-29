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
    public string? TransactionPhoto { get; set; }

    public int? Rating { get; set; } // Rating given to Student (1-5 stars)
    public string? Comments { get; set; } // Feedback comments given to Student
    
    public int? EmployerRating { get; set; } // Rating given to Employer (1-5 stars)
    public string? EmployerComments { get; set; } // Feedback comments given to Employer
}

