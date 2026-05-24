using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.Categories.Commands
{
    public class DeleteCategoryCommand : IRequest<bool>
    {
        public int CategoryId { get; set; }
        public string DeletedBy { get; set; }
    }

    public class DeleteCategoryCommandHandler : IRequestHandler<DeleteCategoryCommand, bool>
    {
        private readonly IJobDbContext _context;

        public DeleteCategoryCommandHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(DeleteCategoryCommand request, CancellationToken cancellationToken)
        {
            var category = await _context.JobCategories
                .FirstOrDefaultAsync(c => c.Id == request.CategoryId, cancellationToken);

            if (category == null)
            {
                return false;
            }

            // Validate: Không thể xóa khi còn JobPost đang dùng và chưa Closed/IsDeleted
            bool hasActiveJobPosts = await _context.JobPosts
                .AnyAsync(jp => jp.CategoryId == request.CategoryId && jp.Status != "Closed", cancellationToken);

            if (hasActiveJobPosts)
            {
                throw new Exception("Cannot delete category because it is being used by active JobPosts.");
            }

            category.IsDeleted = true;
            category.DeletedAt = DateTime.UtcNow;
            category.DeletedBy = request.DeletedBy;

            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
