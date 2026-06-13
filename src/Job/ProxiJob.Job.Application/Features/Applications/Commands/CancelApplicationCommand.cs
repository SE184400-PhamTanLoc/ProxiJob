using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using MassTransit;
using ProxiJob.Shared.Contract.Events;

namespace ProxiJob.Job.Application.Features.Applications.Commands
{
    public class CancelApplicationCommand : IRequest<bool>
    {
        public int ApplicationId { get; set; }
        public int BusinessId { get; set; }
        public string Note { get; set; }
        public string UpdatedBy { get; set; }
    }

    public class CancelApplicationCommandHandler : IRequestHandler<CancelApplicationCommand, bool>
    {
        private readonly IJobDbContext _context;
        private readonly IPublishEndpoint _publishEndpoint;

        public CancelApplicationCommandHandler(IJobDbContext context, IPublishEndpoint publishEndpoint)
        {
            _context = context;
            _publishEndpoint = publishEndpoint;
        }

        public async Task<bool> Handle(CancelApplicationCommand request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Note))
                throw new Exception("Note is required when cancelling an approved application.");

            var application = await _context.Applications
                .Include(a => a.JobShift).ThenInclude(s => s.JobPost)
                .Include(a => a.Histories)
                .FirstOrDefaultAsync(a => a.Id == request.ApplicationId, cancellationToken);

            if (application == null || application.JobShift.JobPost.BusinessId != request.BusinessId)
                throw new Exception("Application not found or you don't have permission.");

            if (application.Status != "Approved")
                throw new Exception("Only Approved applications can be cancelled.");

            application.Status = "Cancelled";
            application.UpdatedAt = DateTime.UtcNow;
            application.UpdatedBy = request.UpdatedBy;

            application.Histories.Add(new Domain.Models.ApplicationHistory
            {
                Status = "Cancelled",
                Note = request.Note,
                ChangedAt = DateTime.UtcNow,
                CreatedBy = request.UpdatedBy
            });

            application.JobShift.RemainingSlots += 1;

            await _context.SaveChangesAsync(cancellationToken);

            try 
            {
                await _publishEndpoint.Publish(new ApplicationCancelledEvent(
                    application.Id,
                    application.StudentId,
                    application.JobShift.JobPost.BusinessId,
                    application.JobShiftId,
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
