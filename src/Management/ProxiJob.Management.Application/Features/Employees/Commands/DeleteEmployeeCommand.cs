using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;

namespace ProxiJob.Management.Application.Features.Employees.Commands;

public class DeleteEmployeeCommand : IRequest<bool>
{
    public int EmployeeId { get; set; }
}

public class DeleteEmployeeCommandHandler : IRequestHandler<DeleteEmployeeCommand, bool>
{
    private readonly IManagementDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public DeleteEmployeeCommandHandler(IManagementDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<bool> Handle(DeleteEmployeeCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.BusinessId == null)
            throw new InvalidOperationException("BusinessId is required.");

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId && e.BusinessId == _currentUser.BusinessId.Value, cancellationToken);

        if (employee == null) return false;

        // Spec rule: cannot delete if has incomplete schedules or pending payroll.
        // We'll implement "pending payroll" check now; schedule completion requires timekeeping logic (implemented later).
        var hasPendingPayroll = await _context.Payrolls
            .AnyAsync(p => p.EmployeeId == employee.Id && p.Status == Domain.Enums.PayrollStatus.Pending, cancellationToken);
        if (hasPendingPayroll)
            throw new InvalidOperationException("Cannot delete employee with pending payroll.");

        employee.IsDeleted = true;
        employee.DeletedAt = DateTime.UtcNow;
        employee.DeletedBy = _currentUser.UserName;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

