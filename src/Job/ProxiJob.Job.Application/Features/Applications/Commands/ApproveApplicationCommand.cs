using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using MassTransit;
using ProxiJob.Shared.Contract.Events;

namespace ProxiJob.Job.Application.Features.Applications.Commands
{
    public class ApproveApplicationCommand : IRequest<bool>
    {
        public int ApplicationId { get; set; }
        public int BusinessId { get; set; }
        public string UpdatedBy { get; set; }
    }

    public class ApproveApplicationCommandHandler : IRequestHandler<ApproveApplicationCommand, bool>
    {
        private readonly IJobDbContext _context;
        private readonly IPublishEndpoint _publishEndpoint;

        public ApproveApplicationCommandHandler(IJobDbContext context, IPublishEndpoint publishEndpoint)
        {
            _context = context;
            _publishEndpoint = publishEndpoint;
        }

        public async Task<bool> Handle(ApproveApplicationCommand request, CancellationToken cancellationToken)
        {
            var application = await _context.Applications
                .Include(a => a.JobShift).ThenInclude(s => s.JobPost)
                .Include(a => a.Histories)
                .FirstOrDefaultAsync(a => a.Id == request.ApplicationId, cancellationToken);

            if (application == null || application.JobShift.JobPost.BusinessId != request.BusinessId)
                throw new Exception("Application not found or you don't have permission.");

            if (application.Status != "Pending" && application.Status != "Cancelled")
                throw new Exception("Only Pending or Cancelled applications can be approved.");

            if (application.Status == "Cancelled")
            {
                application.Status = "CancelledApproved";
                application.UpdatedAt = DateTime.UtcNow;
                application.UpdatedBy = request.UpdatedBy;
                application.Histories.Add(new Domain.Models.ApplicationHistory
                {
                    Status = "CancelledApproved",
                    Note = "Đã chấp thuận yêu cầu hủy ca/xin nghỉ",
                    ChangedAt = DateTime.UtcNow,
                    CreatedBy = request.UpdatedBy
                });
                await _context.SaveChangesAsync(cancellationToken);
                return true;
            }

            if (application.JobShift.RemainingSlots <= 0)
                throw new Exception("No remaining slots.");

            application.Status = "Approved";
            application.UpdatedAt = DateTime.UtcNow;
            application.UpdatedBy = request.UpdatedBy;

            application.Histories.Add(new Domain.Models.ApplicationHistory
            {
                Status = "Approved",
                Note = "Đã được duyệt",
                ChangedAt = DateTime.UtcNow,
                CreatedBy = request.UpdatedBy
            });

            application.JobShift.RemainingSlots -= 1;

            var otherPendings = new List<Domain.Models.Application>();

            if (application.JobShift.RemainingSlots == 0)
            {
                otherPendings = await _context.Applications
                    .Include(a => a.Histories)
                    .Where(a => a.JobShiftId == application.JobShiftId && a.Status == "Pending" && a.Id != application.Id)
                    .ToListAsync(cancellationToken);

                foreach (var pending in otherPendings)
                {
                    pending.Status = "Rejected";
                    pending.UpdatedAt = DateTime.UtcNow;
                    pending.UpdatedBy = "System";

                    pending.Histories.Add(new Domain.Models.ApplicationHistory
                    {
                        Status = "Rejected",
                        Note = "Đã đủ số lượng",
                        ChangedAt = DateTime.UtcNow,
                        CreatedBy = "System"
                    });
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            try 
            {
                await _publishEndpoint.Publish(new ApplicationApprovedEvent(
                    application.Id,
                    application.StudentId,
                    application.JobShift.JobPost.BusinessId,
                    application.JobShiftId,
                    application.JobShift.JobPost.Title,
                    application.JobShift.StartTime,
                    application.JobShift.EndTime,
                    application.JobShift.Salary
                ), cancellationToken);

                if (application.JobShift.RemainingSlots == 0)
                {
                    foreach (var pending in otherPendings)
                    {
                        await _publishEndpoint.Publish(new ApplicationRejectedEvent(
                            pending.Id,
                            pending.StudentId,
                            application.JobShift.JobPost.Title,
                            "Đã đủ số lượng"
                        ), cancellationToken);
                    }
                }
            }
            catch 
            {
                // Ignore
            }

            return true;
        }
    }
}
