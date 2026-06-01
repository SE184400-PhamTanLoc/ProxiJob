using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Domain.Enums;

namespace ProxiJob.Management.Application.Features.Employees.Commands;

public class UpdateEmployeeCommand : IRequest<bool>
{
    public int EmployeeId { get; set; }
    public string FullName { get; set; } = default!;
    public string? PhoneNumber { get; set; }
    public string? Position { get; set; }
    public PaymentType PaymentType { get; set; }
    public decimal? HourlyRate { get; set; }
    public decimal? MonthlySalary { get; set; }
}

public class UpdateEmployeeCommandHandler : IRequestHandler<UpdateEmployeeCommand, bool>
{
    private readonly IManagementDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public UpdateEmployeeCommandHandler(IManagementDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<bool> Handle(UpdateEmployeeCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.BusinessId == null)
            throw new InvalidOperationException("BusinessId is required.");

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId && e.BusinessId == _currentUser.BusinessId.Value, cancellationToken);

        if (employee == null) return false;

        if (string.IsNullOrWhiteSpace(request.FullName))
            throw new ArgumentException("FullName is required.");

        if (request.PaymentType == PaymentType.PerShift && request.HourlyRate == null)
            throw new ArgumentException("HourlyRate is required for PerShift employees.");

        if (request.PaymentType == PaymentType.Monthly && request.MonthlySalary == null)
            throw new ArgumentException("MonthlySalary is required for Monthly employees.");

        employee.FullName = request.FullName.Trim();
        employee.PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();
        employee.Position = string.IsNullOrWhiteSpace(request.Position) ? null : request.Position.Trim();
        employee.PaymentType = request.PaymentType;
        employee.HourlyRate = request.HourlyRate;
        employee.MonthlySalary = request.MonthlySalary;
        employee.UpdatedAt = DateTime.UtcNow;
        employee.UpdatedBy = _currentUser.UserName;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

