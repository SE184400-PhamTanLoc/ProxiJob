using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Application.Features.Payrolls.DTOs;

namespace ProxiJob.Management.Application.Features.Payrolls.Queries;

public class GetPayrollByIdQuery : IRequest<PayrollDetailDto?>
{
    public int PayrollId { get; set; }
    public int BusinessId { get; set; }
}

public class GetPayrollByIdQueryHandler : IRequestHandler<GetPayrollByIdQuery, PayrollDetailDto?>
{
    private readonly IManagementDbContext _context;

    public GetPayrollByIdQueryHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<PayrollDetailDto?> Handle(GetPayrollByIdQuery request, CancellationToken cancellationToken)
    {
        var payroll = await _context.Payrolls
            .Include(p => p.Employee)
            .FirstOrDefaultAsync(p => p.Id == request.PayrollId && p.Employee.BusinessId == request.BusinessId, cancellationToken);

        if (payroll == null) return null;

        return new PayrollDetailDto
        {
            Id = payroll.Id,
            EmployeeId = payroll.EmployeeId,
            TotalHours = payroll.TotalHours,
            FinalAmount = payroll.FinalAmount,
            PayDate = payroll.PayDate,
            Status = payroll.Status.ToString(),
            BaseAmount = payroll.BaseAmount,
            Adjustment = payroll.Adjustment,
            AdjustmentNote = payroll.AdjustmentNote,
            CreatedAt = payroll.CreatedAt,
            EmployeeName = payroll.Employee.FullName,
            TransactionPhoto = payroll.TransactionPhoto
        };
    }
}
