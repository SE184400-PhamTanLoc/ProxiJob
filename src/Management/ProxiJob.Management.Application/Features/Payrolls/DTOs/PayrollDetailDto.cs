using System;

namespace ProxiJob.Management.Application.Features.Payrolls.DTOs;

public class PayrollDetailDto : PayrollDto
{
    public decimal BaseAmount { get; set; }
    public decimal? Adjustment { get; set; }
    public string? AdjustmentNote { get; set; }
    public DateTime CreatedAt { get; set; }
}
