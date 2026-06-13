using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.JobPosts.Commands
{
    public class DeleteJobPostCommand : IRequest<bool>
    {
        public int Id { get; set; }
        public int BusinessId { get; set; }
        public string DeletedBy { get; set; }
    }

    public class DeleteJobPostCommandHandler : IRequestHandler<DeleteJobPostCommand, bool>
    {
        private readonly IJobDbContext _context;

        public DeleteJobPostCommandHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(DeleteJobPostCommand request, CancellationToken cancellationToken)
        {
            var jobPost = await _context.JobPosts.FirstOrDefaultAsync(j => j.Id == request.Id && j.BusinessId == request.BusinessId, cancellationToken);

            if (jobPost == null) throw new Exception("JobPost not found or you don't have permission.");

            if (jobPost.Status != "Draft" && jobPost.Status != "Published") throw new Exception("Only Draft or Published job posts can be deleted.");

            jobPost.IsDeleted = true;
            jobPost.DeletedBy = request.DeletedBy;
            jobPost.DeletedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
