using MediatR;
using ProxiJob.Identity.Application.Common.Exceptions;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Application.Services;
using ProxiJob.Identity.Domain.Constants;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Features.Business.Commands.RegisterBusinessProfile
{
    public class RegisterBusinessProfileCommandHandler : IRequestHandler<RegisterBusinessProfileCommand, BusinessProfileDto>
    {
        private readonly ICurrentUserService _currentUser;
        private readonly IBusinessProfileRepository _profileRepository;
        private readonly IAuthRepository _authRepository;
        private readonly IUnitOfWork _unitOfWork;

        public RegisterBusinessProfileCommandHandler(
            ICurrentUserService currentUser,
            IBusinessProfileRepository profileRepository,
            IAuthRepository authRepository,
            IUnitOfWork unitOfWork)
        {
            _currentUser = currentUser;
            _profileRepository = profileRepository;
            _authRepository = authRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<BusinessProfileDto> Handle(RegisterBusinessProfileCommand request, CancellationToken cancellationToken)
        {
            if (_currentUser.UserId is not int userId)
                throw new UnauthorizedAccessException(BusinessMessages.NotAuthenticated);
            if (_currentUser.Role != RoleNames.Business)
                throw new ForbiddenAccessException(BusinessMessages.BusinessProfileOnly);

            var user = await _authRepository.GetUserByIdAsync(userId, cancellationToken)
                ?? throw new UnauthorizedAccessException(BusinessMessages.UserNotFound);

            var profile = await _profileRepository.GetByUserIdWithUserAsync(userId, cancellationToken);
            var isNew = profile == null;

            if (profile != null)
            {
                if (profile.ReadinessStatus == ProfileReadinessStatus.ProfileComplete)
                    throw new InvalidOperationException(BusinessMessages.BusinessProfileAlreadyComplete);

                if (BusinessProfileMapper.IsRegistered(profile))
                    throw new InvalidOperationException(BusinessMessages.BusinessProfileAlreadyRegistered);
            }
            else
            {
                profile = new BusinessProfile
                {
                    UserId = userId,
                    ReadinessStatus = ProfileReadinessStatus.Incomplete,
                    CreatedBy = user.Email,
                    User = user
                };
            }

            BusinessProfileMapper.ApplyFull(
                user, profile,
                request.PhoneNumber, request.AvatarUrl,
                request.BusinessName, request.BusinessType,
                request.Address, request.City, request.TaxCode, request.Description);

            profile.UpdatedAt = DateTime.UtcNow;
            profile.UpdatedBy = user.Email;

            if (isNew)
                await _profileRepository.AddAsync(profile, cancellationToken);
            else
                await _profileRepository.UpdateAsync(profile, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            profile.User = user;
            return BusinessProfileMapper.ToDto(profile);
        }
    }
}
