using Microsoft.EntityFrameworkCore;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Domain.Models;
using ProxiJob.Identity.Infrastructure.Data;
using ProxiJob.Identity.Domain.Constants;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ProxiJob.Identity.Infrastructure.Repositories
{
    public class StudentProfileRepository : IStudentProfileRepository
    {
        private readonly IdentityDbContext _context;

        public StudentProfileRepository(IdentityDbContext context) => _context = context;

        public async Task<StudentProfile?> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default)
            => await _context.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

        public async Task<StudentProfile?> GetByUserIdWithUserAsync(int userId, CancellationToken cancellationToken = default)
            => await _context.StudentProfiles
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

        public async Task AddAsync(StudentProfile profile, CancellationToken cancellationToken = default)
            => await _context.StudentProfiles.AddAsync(profile, cancellationToken);

        public Task UpdateAsync(StudentProfile profile, CancellationToken cancellationToken = default)
        {
            _context.StudentProfiles.Update(profile);
            return Task.CompletedTask;
        }

        public async Task<List<StudentProfile>> GetActiveProfilesAsync(CancellationToken cancellationToken = default)
            => await _context.StudentProfiles
                .Include(p => p.User)
                .Where(p => p.ReadinessStatus == ProfileReadinessStatus.ReadyForWork)
                .ToListAsync(cancellationToken);
    }
}
