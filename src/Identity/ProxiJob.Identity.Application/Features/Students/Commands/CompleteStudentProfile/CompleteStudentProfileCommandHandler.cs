using MediatR;
using ProxiJob.Identity.Application.Common.Exceptions;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ValidationMessages = ProxiJob.Identity.Application.Common.Messages.ValidationMessages;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Application.Services;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.Application.Features.Students.Commands.CompleteStudentProfile
{
    public class CompleteStudentProfileCommandHandler : IRequestHandler<CompleteStudentProfileCommand, CompleteStudentProfileResultDto>
    {
        private readonly ICurrentUserService _currentUser;
        private readonly IStudentProfileRepository _profileRepository;
        private readonly IAuthRepository _authRepository;
        private readonly IAuthSessionService _authSessionService;
        private readonly IUnitOfWork _unitOfWork;

        public CompleteStudentProfileCommandHandler(
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

        public async Task<CompleteStudentProfileResultDto> Handle(CompleteStudentProfileCommand request, CancellationToken cancellationToken)
        {
            if (_currentUser.UserId is not int userId)
                throw new UnauthorizedAccessException(BusinessMessages.NotAuthenticated);
            if (_currentUser.Role != RoleNames.Student)
                throw new ForbiddenAccessException(BusinessMessages.StudentProfileOnly);

            var profile = await _profileRepository.GetByUserIdWithUserAsync(userId, cancellationToken)
                ?? throw new InvalidOperationException(BusinessMessages.StudentProfileNotFound);

            if (!StudentProfileMapper.IsRegistered(profile))
                throw new InvalidOperationException(BusinessMessages.ProfileNotRegistered);

            if (profile.ReadinessStatus == ProfileReadinessStatus.ReadyForWork)
                throw new InvalidOperationException(BusinessMessages.ProfileAlreadyReady);

            var missing = StudentProfileCompletion.GetMissingFields(profile.User, profile);
            if (missing.Count > 0)
                throw new InvalidOperationException(string.Format(BusinessMessages.ProfileIncomplete, string.Join(", ", missing)));

            var validationErrors = StudentProfileFieldValidator.Validate(profile.User, profile);
            if (validationErrors.Count > 0)
                throw new InvalidOperationException(string.Format(ValidationMessages.ProfileValidationFailed, string.Join("; ", validationErrors)));

            profile.ReadinessStatus = ProfileReadinessStatus.ReadyForWork;
            profile.ReadyForWorkAt = DateTime.UtcNow;
            profile.UpdatedAt = DateTime.UtcNow;
            profile.UpdatedBy = profile.User.Email;

            await _profileRepository.UpdateAsync(profile, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var user = await _authRepository.GetUserByIdAsync(userId, cancellationToken)
                ?? throw new UnauthorizedAccessException(BusinessMessages.UserNotFound);

            var tokens = await _authSessionService.IssueSessionAsync(user, cancellationToken);

            return new CompleteStudentProfileResultDto
            {
                Message = BusinessMessages.ProfileReadyForWork,
                ReadinessStatus = ProfileReadinessStatus.ReadyForWork,
                Tokens = tokens
            };
        }
    }
}
