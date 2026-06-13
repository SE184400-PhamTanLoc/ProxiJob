using System;
using System.Threading;
using System.Threading.Tasks;
using MassTransit;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Domain.Enums;
using ProxiJob.Shared.Contract.Events;

namespace ProxiJob.Management.Application.Features.Payrolls.Commands;

public class ApprovePayrollCommand : IRequest<bool>
{
    public int PayrollId { get; set; }
    public decimal? Adjustment { get; set; }
    public string? AdjustmentNote { get; set; }
    public int BusinessId { get; set; }
    public string UpdatedBy { get; set; } = "System";
}

public class ApprovePayrollCommandHandler : IRequestHandler<ApprovePayrollCommand, bool>
{
    private readonly IManagementDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;

    public ApprovePayrollCommandHandler(IManagementDbContext context, IPublishEndpoint publishEndpoint)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
    }

    public async Task<bool> Handle(ApprovePayrollCommand request, CancellationToken cancellationToken)
    {
        var payroll = await _context.Payrolls
            .Include(p => p.Employee)
            .FirstOrDefaultAsync(p => p.Id == request.PayrollId && p.Employee.BusinessId == request.BusinessId, cancellationToken);

        if (payroll == null)
        {
            throw new Exception("Payroll not found or access denied.");
        }

        if (payroll.Status == PayrollStatus.Paid)
        {
            throw new Exception("Payroll is already paid and cannot be modified.");
        }

        if (request.Adjustment.HasValue)
        {
            payroll.Adjustment = request.Adjustment;
            payroll.AdjustmentNote = request.AdjustmentNote;
        }

        payroll.FinalAmount = payroll.BaseAmount + (payroll.Adjustment ?? 0);

        if (payroll.FinalAmount < 0)
        {
            throw new Exception("Final amount cannot be negative.");
        }

        payroll.Status = PayrollStatus.Paid;
        payroll.PayDate = DateOnly.FromDateTime(DateTime.UtcNow);
        payroll.UpdatedBy = request.UpdatedBy;
        payroll.UpdatedAt = DateTime.UtcNow;

        _context.Payrolls.Update(payroll);
        await _context.SaveChangesAsync(cancellationToken);

        // Publish PayrollPaidEvent to RabbitMQ for Notification Service
        await _publishEndpoint.Publish(new PayrollPaidEvent(
            PayrollId: payroll.Id,
            EmployeeId: payroll.EmployeeId,
            BusinessId: payroll.Employee.BusinessId,
            FinalAmount: payroll.FinalAmount,
            PayDate: payroll.PayDate!.Value,
            EmployeeName: payroll.Employee.FullName
        ), cancellationToken);

        return true;
    }
}

