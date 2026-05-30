using MediatR;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Application.Services;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.Application.Features.Students.Queries.GetMyStudentProfile
{
    public class GetMyStudentProfileQueryHandler : IRequestHandler<GetMyStudentProfileQuery, StudentProfileDto>
    {
        private readonly ICurrentUserService _currentUser;
        private readonly IStudentProfileRepository _profileRepository;

        public GetMyStudentProfileQueryHandler(
            ICurrentUserService currentUser,
            IStudentProfileRepository profileRepository)
        {
            _currentUser = currentUser;
            _profileRepository = profileRepository;
        }

        public async Task<StudentProfileDto> Handle(GetMyStudentProfileQuery request, CancellationToken cancellationToken)
        {
            EnsureStudent();

            var profile = await _profileRepository.GetByUserIdWithUserAsync(_currentUser.UserId!.Value, cancellationToken)
                ?? throw new InvalidOperationException(BusinessMessages.StudentProfileNotFound);

            return StudentProfileMapper.ToDto(profile);
        }

        private void EnsureStudent()
        {
            if (_currentUser.UserId is null)
                throw new UnauthorizedAccessException(BusinessMessages.NotAuthenticated);
            if (_currentUser.Role != RoleNames.Student)
                throw new UnauthorizedAccessException(BusinessMessages.StudentProfileOnly);
        }
    }
}
