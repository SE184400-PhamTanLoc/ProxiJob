using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.Categories.Commands
{
    public class UpdateCategoryCommand : IRequest<bool>
    {
        public int CategoryId { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public string UpdatedBy { get; set; }
    }

    public class UpdateCategoryCommandHandler : IRequestHandler<UpdateCategoryCommand, bool>
    {
        private readonly IJobDbContext _context;

        public UpdateCategoryCommandHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(UpdateCategoryCommand request, CancellationToken cancellationToken)
        {
            var category = await _context.JobCategories
                .FirstOrDefaultAsync(c => c.Id == request.CategoryId, cancellationToken);

            if (category == null)
            {
                return false;
            }

            bool exists = await _context.JobCategories
                .AnyAsync(c => c.Id != request.CategoryId && c.Name.ToLower() == request.Name.ToLower(), cancellationToken);
            
            if (exists)
            {
                throw new Exception("Category name already exists.");
            }

            category.Name = request.Name;
            category.Description = request.Description;
            category.UpdatedBy = request.UpdatedBy;
            category.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
