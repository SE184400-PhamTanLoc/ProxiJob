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
    public string? EmployeeName { get; set; }
    public string? TransactionPhoto { get; set; }
    public int? Rating { get; set; }
    public string? Comments { get; set; }
    public int? EmployerRating { get; set; }
    public string? EmployerComments { get; set; }
    public string? ShopName { get; set; }
}
