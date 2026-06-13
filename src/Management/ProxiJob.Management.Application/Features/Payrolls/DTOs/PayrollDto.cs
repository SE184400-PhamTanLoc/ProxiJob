using System;

namespace ProxiJob.Management.Application.Features.Payrolls.DTOs;

public class PayrollDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public decimal TotalHours { get; set; }
    public decimal FinalAmount { get; set; }
    public DateOnly? PayDate { get; set; }
    public string Status { get; set; } = default!;
}
