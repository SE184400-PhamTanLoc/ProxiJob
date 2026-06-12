using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using MassTransit;
using ProxiJob.Shared.Contract.Events;

namespace ProxiJob.Job.Application.Features.JobPosts.Commands
{
    public class CloseJobPostCommand : IRequest<bool>
    {
        public int Id { get; set; }
        public int BusinessId { get; set; }
        public string UpdatedBy { get; set; }
    }

    public class CloseJobPostCommandHandler : IRequestHandler<CloseJobPostCommand, bool>
    {
        private readonly IJobDbContext _context;
        private readonly IPublishEndpoint _publishEndpoint;

        public CloseJobPostCommandHandler(IJobDbContext context, IPublishEndpoint publishEndpoint)
        {
            _context = context;
            _publishEndpoint = publishEndpoint;
        }

        public async Task<bool> Handle(CloseJobPostCommand request, CancellationToken cancellationToken)
        {
            var jobPost = await _context.JobPosts
                .Include(j => j.Shifts)
                .ThenInclude(s => s.Applications)
                .ThenInclude(a => a.Histories)
                .FirstOrDefaultAsync(j => j.Id == request.Id && j.BusinessId == request.BusinessId, cancellationToken);

            if (jobPost == null) throw new Exception("JobPost not found or you don't have permission.");

            if (jobPost.Status != "Published") throw new Exception("Only Published job posts can be closed.");

            jobPost.Status = "Closed";
            jobPost.UpdatedBy = request.UpdatedBy;
            jobPost.UpdatedAt = DateTime.UtcNow;

            var affectedStudentIds = new List<int>();

            // Reject all pending applications across all shifts
            if (jobPost.Shifts != null)
            {
                foreach (var shift in jobPost.Shifts)
                {
                    if (shift.Applications != null)
                    {
                        var pendings = shift.Applications.Where(a => a.Status == "Pending").ToList();
                        foreach (var pending in pendings)
                        {
                            pending.Status = "Rejected";
                            pending.UpdatedAt = DateTime.UtcNow;
                            pending.UpdatedBy = "System";

                            pending.Histories.Add(new Domain.Models.ApplicationHistory
                            {
                                Status = "Rejected",
                                Note = "Bài đăng đã đóng",
                                ChangedAt = DateTime.UtcNow,
                                CreatedBy = "System"
                            });

                            affectedStudentIds.Add(pending.StudentId);
                        }
                    }
                }
            }

            await _context.SaveChangesAsync(cancellationToken);
            
            try 
            {
                await _publishEndpoint.Publish(new JobClosedEvent(
                    jobPost.Id,
                    affectedStudentIds.Distinct().ToList()
                ), cancellationToken);
            }
            catch 
            {
                // Log and continue if publish fails
            }

            return true;
        }
    }
}
