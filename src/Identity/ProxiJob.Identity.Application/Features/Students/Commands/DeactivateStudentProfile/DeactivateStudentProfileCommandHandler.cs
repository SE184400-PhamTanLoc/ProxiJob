using MediatR;
using ProxiJob.Identity.Application.Common.Exceptions;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Application.Services;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.Application.Features.Students.Commands.DeactivateStudentProfile
{
    public class DeactivateStudentProfileCommandHandler : IRequestHandler<DeactivateStudentProfileCommand, CompleteStudentProfileResultDto>
    {
        private readonly ICurrentUserService _currentUser;
        private readonly IStudentProfileRepository _profileRepository;
        private readonly IAuthRepository _authRepository;
        private readonly IAuthSessionService _authSessionService;
        private readonly IUnitOfWork _unitOfWork;

        public DeactivateStudentProfileCommandHandler(
            ICurrentUserService currentUser,
            IStudentProfileRepository profileRepository,
            IAuthRepository authRepository,
            IAuthSessionService authSessionService,
            IUnitOfWork unitOfWork)
        {
            _currentUser = currentUser;
            _profileRepository = profileRepository;
            _authRepository = authRepository;
            _authSessionService = authSessionService;
            _unitOfWork = unitOfWork;
        }

        public async Task<CompleteStudentProfileResultDto> Handle(DeactivateStudentProfileCommand request, CancellationToken cancellationToken)
        {
            if (_currentUser.UserId is not int userId)
                throw new UnauthorizedAccessException(BusinessMessages.NotAuthenticated);
            if (_currentUser.Role != RoleNames.Student)
                throw new ForbiddenAccessException(BusinessMessages.StudentProfileOnly);

            var profile = await _profileRepository.GetByUserIdWithUserAsync(userId, cancellationToken)
                ?? throw new InvalidOperationException(BusinessMessages.StudentProfileNotFound);

            if (profile.ReadinessStatus != ProfileReadinessStatus.ReadyForWork)
                throw new InvalidOperationException("Hồ sơ chưa ở trạng thái sẵn sàng nhận việc.");

            profile.ReadinessStatus = ProfileReadinessStatus.Incomplete;
            profile.UpdatedAt = DateTime.UtcNow;
            profile.UpdatedBy = profile.User.Email;

            await _profileRepository.UpdateAsync(profile, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var user = await _authRepository.GetUserByIdAsync(userId, cancellationToken)
                ?? throw new UnauthorizedAccessException(BusinessMessages.UserNotFound);

            var tokens = await _authSessionService.IssueSessionAsync(user, cancellationToken);

            return new CompleteStudentProfileResultDto
            {
                Message = "Đã tạm ngưng nhận việc.",
                ReadinessStatus = ProfileReadinessStatus.Incomplete,
                Tokens = tokens
            };
        }
    }
}
