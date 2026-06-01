using MediatR;
using ProxiJob.Identity.Application.Common.Exceptions;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ValidationMessages = ProxiJob.Identity.Application.Common.Messages.ValidationMessages;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Application.Services;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.Application.Features.Business.Commands.CompleteBusinessProfile
{
    public class CompleteBusinessProfileCommandHandler : IRequestHandler<CompleteBusinessProfileCommand, CompleteBusinessProfileResultDto>
    {
        private readonly ICurrentUserService _currentUser;
        private readonly IBusinessProfileRepository _profileRepository;
        private readonly IAuthRepository _authRepository;
        private readonly IAuthSessionService _authSessionService;
        private readonly IUnitOfWork _unitOfWork;

        public CompleteBusinessProfileCommandHandler(
            ICurrentUserService currentUser,
            IBusinessProfileRepository profileRepository,
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

        public async Task<CompleteBusinessProfileResultDto> Handle(CompleteBusinessProfileCommand request, CancellationToken cancellationToken)
        {
            if (_currentUser.UserId is not int userId)
                throw new UnauthorizedAccessException(BusinessMessages.NotAuthenticated);
            if (_currentUser.Role != RoleNames.Business)
                throw new ForbiddenAccessException(BusinessMessages.BusinessProfileOnly);

            var profile = await _profileRepository.GetByUserIdWithUserAsync(userId, cancellationToken)
                ?? throw new InvalidOperationException(BusinessMessages.BusinessProfileNotFound);

            if (!BusinessProfileMapper.IsRegistered(profile))
                throw new InvalidOperationException(BusinessMessages.BusinessProfileNotRegistered);

            if (profile.ReadinessStatus == ProfileReadinessStatus.ProfileComplete)
                throw new InvalidOperationException(BusinessMessages.BusinessProfileAlreadyComplete);

            var missing = BusinessProfileCompletion.GetMissingFields(profile.User, profile);
            if (missing.Count > 0)
                throw new InvalidOperationException(string.Format(BusinessMessages.ProfileIncomplete, string.Join(", ", missing)));

            var validationErrors = BusinessProfileFieldValidator.Validate(profile.User, profile);
            if (validationErrors.Count > 0)
                throw new InvalidOperationException(string.Format(ValidationMessages.ProfileValidationFailed, string.Join("; ", validationErrors)));

            profile.ReadinessStatus = ProfileReadinessStatus.ProfileComplete;
            profile.ProfileCompleteAt = DateTime.UtcNow;
            profile.UpdatedAt = DateTime.UtcNow;
            profile.UpdatedBy = profile.User.Email;

            await _profileRepository.UpdateAsync(profile, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var user = await _authRepository.GetUserByIdAsync(userId, cancellationToken)
                ?? throw new UnauthorizedAccessException(BusinessMessages.UserNotFound);

            var tokens = await _authSessionService.IssueSessionAsync(user, cancellationToken);

            return new CompleteBusinessProfileResultDto
            {
                Message = BusinessMessages.BusinessProfileComplete,
                ReadinessStatus = ProfileReadinessStatus.ProfileComplete,
                Tokens = tokens
            };
        }
    }
}
