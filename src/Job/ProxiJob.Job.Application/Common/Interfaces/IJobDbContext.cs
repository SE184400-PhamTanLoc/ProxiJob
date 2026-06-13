using Microsoft.EntityFrameworkCore;
using ProxiJob.Job.Domain.Models;

namespace ProxiJob.Job.Application.Common.Interfaces
{
    public interface IJobDbContext
    {
        DbSet<JobPost> JobPosts { get; }
        DbSet<JobLocation> JobLocations { get; }
        DbSet<JobShift> JobShifts { get; }
        DbSet<Skill> Skills { get; }
        DbSet<Domain.Models.Application> Applications { get; }
        DbSet<ApplicationHistory> ApplicationHistories { get; }
        DbSet<JobCategory> JobCategories { get; }
        DbSet<JobPostSkill> JobPostSkills { get; }

        Task<int> SaveChangesAsync(CancellationToken cancellationToken);
    }
}
