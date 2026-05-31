using MediatR;
using ProxiJob.Identity.Application.Common.Exceptions;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Application.Services;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.Application.Features.Business.Commands.UpdateMyBusinessProfile
{
    public class UpdateMyBusinessProfileCommandHandler : IRequestHandler<UpdateMyBusinessProfileCommand, BusinessProfileDto>
    {
        private readonly ICurrentUserService _currentUser;
        private readonly IBusinessProfileRepository _profileRepository;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateMyBusinessProfileCommandHandler(
            ICurrentUserService currentUser,
            IBusinessProfileRepository profileRepository,
            IUnitOfWork unitOfWork)
        {
            _currentUser = currentUser;
            _profileRepository = profileRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<BusinessProfileDto> Handle(UpdateMyBusinessProfileCommand request, CancellationToken cancellationToken)
        {
            if (_currentUser.UserId is not int userId)
                throw new UnauthorizedAccessException(BusinessMessages.NotAuthenticated);
            if (_currentUser.Role != RoleNames.Business)
                throw new ForbiddenAccessException(BusinessMessages.BusinessProfileOnly);

            var profile = await _profileRepository.GetByUserIdWithUserAsync(userId, cancellationToken)
                ?? throw new InvalidOperationException(BusinessMessages.BusinessProfileNotFound);

            if (!BusinessProfileMapper.IsRegistered(profile))
                throw new InvalidOperationException(BusinessMessages.BusinessProfileNotRegistered);

            if (request.PhoneNumber != null)
                profile.User.PhoneNumber = request.PhoneNumber.Trim();
            if (request.AvatarUrl != null)
                profile.User.AvatarUrl = request.AvatarUrl.Trim();
            if (request.BusinessName != null)
                profile.BusinessName = request.BusinessName.Trim();
            if (request.BusinessType != null)
                profile.BusinessType = request.BusinessType.Trim();
            if (request.Address != null)
                profile.Address = request.Address.Trim();
            if (request.City != null)
                profile.City = request.City.Trim();
            if (request.TaxCode != null)
                profile.TaxCode = string.IsNullOrWhiteSpace(request.TaxCode) ? null : request.TaxCode.Trim();
            if (request.Description != null)
                profile.Description = request.Description.Trim();

            profile.UpdatedAt = DateTime.UtcNow;
            profile.UpdatedBy = profile.User.Email;

            await _profileRepository.UpdateAsync(profile, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return BusinessProfileMapper.ToDto(profile);
        }
    }
}
