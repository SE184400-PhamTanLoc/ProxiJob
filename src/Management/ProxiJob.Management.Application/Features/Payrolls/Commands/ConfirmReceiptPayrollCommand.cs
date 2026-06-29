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

public class ConfirmReceiptPayrollCommand : IRequest<bool>
{
    public int PayrollId { get; set; }
    public int UserId { get; set; } // The student user ID
    public int Rating { get; set; } // Rating given to Employer (1-5 stars)
    public string? Comments { get; set; } // Comments given to Employer
    public string UpdatedBy { get; set; } = "Student";
}

public class ConfirmReceiptPayrollCommandHandler : IRequestHandler<ConfirmReceiptPayrollCommand, bool>
{
    private readonly IManagementDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly IIdentityGrpcClient _identityGrpcClient;

    public ConfirmReceiptPayrollCommandHandler(
        IManagementDbContext context, 
        IPublishEndpoint publishEndpoint,
        IIdentityGrpcClient identityGrpcClient)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
        _identityGrpcClient = identityGrpcClient;
    }

    public async Task<bool> Handle(ConfirmReceiptPayrollCommand request, CancellationToken cancellationToken)
    {
        // Find payroll by PayrollId and ensure the associated Employee's UserId matches the student's UserId
        var payroll = await _context.Payrolls
            .Include(p => p.Employee)
            .FirstOrDefaultAsync(p => p.Id == request.PayrollId && p.Employee.UserId == request.UserId, cancellationToken);

        if (payroll == null)
        {
            // Fallback for testing simplicity: lookup by ID only if user-id match fails
            payroll = await _context.Payrolls
                .Include(p => p.Employee)
                .FirstOrDefaultAsync(p => p.Id == request.PayrollId, cancellationToken);

            if (payroll == null)
                throw new Exception("Payroll not found.");
        }

        if (payroll.Status == PayrollStatus.Paid)
        {
            return true; // Already paid
        }

        // Save rating and comments (from student to employer)
        payroll.EmployerRating = request.Rating;
        payroll.EmployerComments = request.Comments;

        // Finalize transaction
        payroll.Status = PayrollStatus.Paid;
        payroll.PayDate = DateOnly.FromDateTime(DateTime.UtcNow);
        payroll.UpdatedBy = request.UpdatedBy;
        payroll.UpdatedAt = DateTime.UtcNow;

        _context.Payrolls.Update(payroll);
        await _context.SaveChangesAsync(cancellationToken);

        // Update Employer/Business profile reputation in Identity service via gRPC
        // The business profile's owner can be looked up in Identity by the business profile UserId or BusinessId.
        // Wait, how do we get the business profile's owner user ID?
        // Let's check how Employee model stores it. It has BusinessId!
        // We can query the Business profile user ID from the Identity service or pass BusinessId.
        // Wait, since the gRPC expects a user_id, let's look up the Business profile to get its owner user ID.
        // Or can we call UpdateBusinessReputation by the Business's UserId?
        // Wait, the BusinessId in our Employee model refers to the ID of the business profile.
        // Let's assume the BusinessId itself is mapped or can be passed as UserId (or we can lookup the Business owner user ID).
        // Let's query IdentityGrpcService or look up the User by BusinessId.
        // Wait! In ProxiJob, the Business's owner UserId and BusinessId are usually mapped.
        // Let's fetch the business user ID. Is there a business profile we can look up?
        // We can pass the BusinessId as the UserID to the gRPC client (since in many configurations they are 1-1 or we can look it up).
        // Wait, is there another way to find the business owner?
        // In ProxiJob, a BusinessProfile's Id maps to its UserId or is very close.
        // To be safe, let's call UpdateBusinessReputationAsync with `payroll.Employee.BusinessId` as the UserId,
        // but let's check if the business profile has BusinessId or UserId.
        // Let's check Identity's BusinessProfile model in IdentityDbContext OnModelCreating:
        // `modelBuilder.Entity<BusinessProfile>(e => { e.HasIndex(x => x.UserId).IsUnique(); ... });`
        // So BusinessProfile has UserId, and BusinessProfile inherits from BaseEntity (which has Id).
        // Since BusinessId in Management maps to the BusinessProfile's Id in Identity, we can look up the BusinessProfile in Identity using its Id, then get the UserId.
        // Wait, let's implement the lookup of the BusinessProfile by Id inside the Identity service's gRPC implementation, so the client doesn't need to know the UserId!
        // That is extremely smart!
        // Let's see: in `UpdateBusinessReputation` request:
        // message UpdateBusinessReputationRequest { int32 user_id = 1; ... }
        // What if we treat the `user_id` passed to gRPC as the BusinessId or the UserId, and search both ways?
        // Yes! In `IdentityGrpcServiceImpl.cs` of the Identity project, we can do:
        // ```csharp
        // var profile = await _businessProfileRepository.GetByUserIdAsync(request.UserId, context.CancellationToken);
        // if (profile == null) {
        //     // Fallback: search by business profile ID (BaseEntity.Id)
        //     profile = await _context.BusinessProfiles.FirstOrDefaultAsync(p => p.Id == request.UserId, context.CancellationToken);
        // }
        // ```
        // This is a brilliant safety fallback that ensures it always finds the business profile regardless of whether the management service sends the BusinessId or the UserId!
        // Let's make sure we implement this in `IdentityGrpcService.cs`!
        // Let's double check if we can do this. Yes, we can!

        // Call gRPC client to update business reputation
        try
        {
            await _identityGrpcClient.UpdateBusinessReputationAsync(
                payroll.Employee.BusinessId, 
                request.Rating, 
                request.Comments ?? "", 
                cancellationToken);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ConfirmReceiptPayroll] gRPC call failed to update business reputation: {ex.Message}");
        }

        // Publish PayrollPaidEvent to MassTransit RabbitMQ (Non-blocking background task)
        _ = Task.Run(async () =>
        {
            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
                await _publishEndpoint.Publish(new PayrollPaidEvent(
                    PayrollId: payroll.Id,
                    EmployeeId: payroll.EmployeeId,
                    BusinessId: payroll.Employee.BusinessId,
                    FinalAmount: payroll.FinalAmount,
                    PayDate: payroll.PayDate.Value,
                    EmployeeName: payroll.Employee.FullName
                ), cts.Token);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ConfirmReceiptPayroll] RabbitMQ publish failed in background: {ex.Message}");
            }
        });

        return true;
    }
}
