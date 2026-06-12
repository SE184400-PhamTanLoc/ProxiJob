using MediatR;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Domain.Enums;
using ProxiJob.Management.Domain.Models;

namespace ProxiJob.Management.Application.Features.Employees.Commands;

public class CreateEmployeeCommand : IRequest<int>
{
    public string FullName { get; set; } = default!;
    public string? PhoneNumber { get; set; }
    public string? Position { get; set; }
    public PaymentType PaymentType { get; set; }
    public decimal? HourlyRate { get; set; }
    public decimal? MonthlySalary { get; set; }
    public int? UserId { get; set; }
}

public class CreateEmployeeCommandHandler : IRequestHandler<CreateEmployeeCommand, int>
{
    private readonly IManagementDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CreateEmployeeCommandHandler(IManagementDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<int> Handle(CreateEmployeeCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.BusinessId == null)
            throw new InvalidOperationException("BusinessId is required.");

        if (string.IsNullOrWhiteSpace(request.FullName))
            throw new ArgumentException("FullName is required.");

        if (request.PaymentType == PaymentType.PerShift && request.HourlyRate == null)
            throw new ArgumentException("HourlyRate is required for PerShift employees.");

        if (request.PaymentType == PaymentType.Monthly && request.MonthlySalary == null)
            throw new ArgumentException("MonthlySalary is required for Monthly employees.");

        var employee = new Employee
        {
            BusinessId = _currentUser.BusinessId.Value,
            UserId = request.UserId,
            FullName = request.FullName.Trim(),
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim(),
            Position = string.IsNullOrWhiteSpace(request.Position) ? null : request.Position.Trim(),
            Status = EmployeeStatus.Active,
            IsExternal = false,
            PaymentType = request.PaymentType,
            HourlyRate = request.HourlyRate,
            MonthlySalary = request.MonthlySalary,
            CreatedBy = _currentUser.UserName
        };

        _context.Employees.Add(employee);
        await _context.SaveChangesAsync(cancellationToken);
        return employee.Id;
    }
}

