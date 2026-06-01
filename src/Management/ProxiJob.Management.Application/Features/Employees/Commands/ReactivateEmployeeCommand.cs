using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Domain.Enums;

namespace ProxiJob.Management.Application.Features.Employees.Commands;

public class ReactivateEmployeeCommand : IRequest<bool>
{
    public int EmployeeId { get; set; }
}

public class ReactivateEmployeeCommandHandler : IRequestHandler<ReactivateEmployeeCommand, bool>
{
    private readonly IManagementDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ReactivateEmployeeCommandHandler(IManagementDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<bool> Handle(ReactivateEmployeeCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.BusinessId == null)
            throw new InvalidOperationException("BusinessId is required.");

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId && e.BusinessId == _currentUser.BusinessId.Value, cancellationToken);

        if (employee == null) return false;

        employee.Status = EmployeeStatus.Active;
        employee.UpdatedAt = DateTime.UtcNow;
        employee.UpdatedBy = _currentUser.UserName;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

