using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Common.Interfaces
{
    public interface IStudentProfileRepository
    {
        Task<StudentProfile?> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default);
        Task<StudentProfile?> GetByUserIdWithUserAsync(int userId, CancellationToken cancellationToken = default);
        Task AddAsync(StudentProfile profile, CancellationToken cancellationToken = default);
        Task UpdateAsync(StudentProfile profile, CancellationToken cancellationToken = default);
    }
}
