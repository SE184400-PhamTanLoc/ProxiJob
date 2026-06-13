using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using ProxiJob.Job.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.Categories.Commands
{
    public class CreateCategoryCommand : IRequest<int>
    {
        public string Name { get; set; }
        public string? Description { get; set; }
        public string CreatedBy { get; set; }
    }

    public class CreateCategoryCommandHandler : IRequestHandler<CreateCategoryCommand, int>
    {
        private readonly IJobDbContext _context;

        public CreateCategoryCommandHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<int> Handle(CreateCategoryCommand request, CancellationToken cancellationToken)
        {
            // Business Rule: No duplicate name
            bool exists = await _context.JobCategories
                .AnyAsync(c => c.Name.ToLower() == request.Name.ToLower(), cancellationToken);
            
            if (exists)
            {
                throw new Exception("Category name already exists.");
            }

            var category = new JobCategory
            {
                Name = request.Name,
                Description = request.Description,
                CreatedBy = request.CreatedBy,
                CreatedAt = DateTime.UtcNow
            };

            _context.JobCategories.Add(category);
            await _context.SaveChangesAsync(cancellationToken);

            return category.Id;
        }
    }
}
