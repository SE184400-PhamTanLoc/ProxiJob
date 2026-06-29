using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Application.Features.Payrolls.DTOs;

namespace ProxiJob.Management.Application.Features.Payrolls.Queries;

public class GetPayrollsByBusinessQuery : IRequest<List<PayrollDto>>
{
    public int BusinessId { get; set; }
    public string? Status { get; set; }
}

public class GetPayrollsByBusinessQueryHandler : IRequestHandler<GetPayrollsByBusinessQuery, List<PayrollDto>>
{
    private readonly IManagementDbContext _context;

    public GetPayrollsByBusinessQueryHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<List<PayrollDto>> Handle(GetPayrollsByBusinessQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Payrolls
            .Include(p => p.Employee)
            .Where(p => p.Employee.BusinessId == request.BusinessId);

        if (!string.IsNullOrEmpty(request.Status))
        {
            if (System.Enum.TryParse<ProxiJob.Management.Domain.Enums.PayrollStatus>(request.Status, true, out var statusEnum))
            {
                query = query.Where(p => p.Status == statusEnum);
            }
        }

        return await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PayrollDto
            {
                Id = p.Id,
                EmployeeId = p.EmployeeId,
                TotalHours = p.TotalHours,
                FinalAmount = p.FinalAmount,
                PayDate = p.PayDate,
                Status = p.Status.ToString(),
                EmployeeName = p.Employee.FullName,
                TransactionPhoto = p.TransactionPhoto,
                Rating = p.Rating,
                Comments = p.Comments,
                EmployerRating = p.EmployerRating,
                EmployerComments = p.EmployerComments
            })
            .ToListAsync(cancellationToken);
    }
}
