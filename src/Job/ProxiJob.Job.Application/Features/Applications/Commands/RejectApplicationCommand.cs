using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using MassTransit;
using ProxiJob.Shared.Contract.Events;

namespace ProxiJob.Job.Application.Features.Applications.Commands
{
    public class RejectApplicationCommand : IRequest<bool>
    {
        public int ApplicationId { get; set; }
        public int BusinessId { get; set; }
        public string Note { get; set; }
        public string UpdatedBy { get; set; }
    }

    public class RejectApplicationCommandHandler : IRequestHandler<RejectApplicationCommand, bool>
    {
        private readonly IJobDbContext _context;
        private readonly IPublishEndpoint _publishEndpoint;

        public RejectApplicationCommandHandler(IJobDbContext context, IPublishEndpoint publishEndpoint)
        {
            _context = context;
            _publishEndpoint = publishEndpoint;
        }

        public async Task<bool> Handle(RejectApplicationCommand request, CancellationToken cancellationToken)
        {
            var application = await _context.Applications
                .Include(a => a.JobShift).ThenInclude(s => s.JobPost)
                .Include(a => a.Histories)
                .FirstOrDefaultAsync(a => a.Id == request.ApplicationId, cancellationToken);

            if (application == null || application.JobShift.JobPost.BusinessId != request.BusinessId)
                throw new Exception("Application not found or you don't have permission.");

            if (application.Status != "Pending" && application.Status != "Cancelled")
                throw new Exception("Only Pending or Cancelled applications can be rejected.");

            if (application.Status == "Cancelled")
            {
                application.Status = "CancelledRejected";
                application.UpdatedAt = DateTime.UtcNow;
                application.UpdatedBy = request.UpdatedBy;
                application.Histories.Add(new Domain.Models.ApplicationHistory
                {
                    Status = "CancelledRejected",
                    Note = "Từ chối yêu cầu hủy ca/xin nghỉ",
                    ChangedAt = DateTime.UtcNow,
                    CreatedBy = request.UpdatedBy
                });
                await _context.SaveChangesAsync(cancellationToken);
                return true;
            }

            application.Status = "Rejected";
            application.UpdatedAt = DateTime.UtcNow;
            application.UpdatedBy = request.UpdatedBy;

            application.Histories.Add(new Domain.Models.ApplicationHistory
            {
                Status = "Rejected",
                Note = request.Note ?? "Bị từ chối",
                ChangedAt = DateTime.UtcNow,
                CreatedBy = request.UpdatedBy
            });

            await _context.SaveChangesAsync(cancellationToken);

            try 
            {
                await _publishEndpoint.Publish(new ApplicationRejectedEvent(
                    application.Id,
                    application.StudentId,
                    application.JobShift.JobPost.Title,
                    request.Note
                ), cancellationToken);
            }
            catch 
            {
                // Ignore
            }

            return true;
        }
    }
}
