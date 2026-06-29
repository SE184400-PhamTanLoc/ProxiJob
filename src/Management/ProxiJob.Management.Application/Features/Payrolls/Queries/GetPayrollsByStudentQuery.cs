using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Application.Features.Payrolls.DTOs;

namespace ProxiJob.Management.Application.Features.Payrolls.Queries;

public class GetPayrollsByStudentQuery : IRequest<List<PayrollDto>>
{
    public int UserId { get; set; }
    public string? Status { get; set; }
}

public class GetPayrollsByStudentQueryHandler : IRequestHandler<GetPayrollsByStudentQuery, List<PayrollDto>>
{
    private readonly IManagementDbContext _context;
    private readonly IIdentityGrpcClient _identityGrpcClient;

    public GetPayrollsByStudentQueryHandler(IManagementDbContext context, IIdentityGrpcClient identityGrpcClient)
    {
        _context = context;
        _identityGrpcClient = identityGrpcClient;
    }

    public async Task<List<PayrollDto>> Handle(GetPayrollsByStudentQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Payrolls
            .Include(p => p.Employee)
            .Where(p => p.Employee.UserId == request.UserId);

        if (!string.IsNullOrEmpty(request.Status))
        {
            if (System.Enum.TryParse<ProxiJob.Management.Domain.Enums.PayrollStatus>(request.Status, true, out var statusEnum))
            {
                query = query.Where(p => p.Status == statusEnum);
            }
        }

        var payrollList = await query
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        // Fetch unique BusinessIds
        var businessIds = payrollList.Select(p => p.Employee.BusinessId).Distinct().ToList();

        // Fetch store/business names from Identity service via gRPC
        var shopNames = new Dictionary<int, string>();
        foreach (var busId in businessIds)
        {
            try
            {
                var bizSnapshot = await _identityGrpcClient.GetUserByIdAsync(busId, cancellationToken);
                if (bizSnapshot != null && !string.IsNullOrEmpty(bizSnapshot.FullName))
                {
                    shopNames[busId] = bizSnapshot.FullName;
                }
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"[GetPayrollsByStudent] gRPC business name fetch failed for businessId {busId}: {ex.Message}");
            }
        }

        return payrollList.Select(p => new PayrollDto
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
            EmployerComments = p.EmployerComments,
            ShopName = shopNames.TryGetValue(p.Employee.BusinessId, out var name) ? name : "Cửa hàng ProxiJob"
        }).ToList();
    }
}
