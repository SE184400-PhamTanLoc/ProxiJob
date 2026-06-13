using MediatR;
using ProxiJob.Identity.Application.Common.Exceptions;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Application.Services;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.Application.Features.Students.Commands.UpdateMyStudentProfile
{
    public class UpdateMyStudentProfileCommandHandler : IRequestHandler<UpdateMyStudentProfileCommand, StudentProfileDto>
    {
        private readonly ICurrentUserService _currentUser;
        private readonly IStudentProfileRepository _profileRepository;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateMyStudentProfileCommandHandler(
            ICurrentUserService currentUser,
            IStudentProfileRepository profileRepository,
            IUnitOfWork unitOfWork)
        {
            _currentUser = currentUser;
            _profileRepository = profileRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<StudentProfileDto> Handle(UpdateMyStudentProfileCommand request, CancellationToken cancellationToken)
        {
            if (_currentUser.UserId is not int userId)
                throw new UnauthorizedAccessException(BusinessMessages.NotAuthenticated);
            if (_currentUser.Role != RoleNames.Student)
                throw new ForbiddenAccessException(BusinessMessages.StudentProfileOnly);

            var profile = await _profileRepository.GetByUserIdWithUserAsync(userId, cancellationToken)
                ?? throw new InvalidOperationException(BusinessMessages.StudentProfileNotFound);

            if (!StudentProfileMapper.IsRegistered(profile))
                throw new InvalidOperationException(BusinessMessages.ProfileNotRegistered);

            ApplyUpdates(profile.User, profile, request);
            profile.UpdatedAt = DateTime.UtcNow;
            profile.UpdatedBy = profile.User.Email;

            await _profileRepository.UpdateAsync(profile, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return StudentProfileMapper.ToDto(profile);
        }

        private static void ApplyUpdates(
            Domain.Models.User user,
            Domain.Models.StudentProfile profile,
            UpdateMyStudentProfileCommand request)
        {
            if (request.PhoneNumber != null)
                user.PhoneNumber = request.PhoneNumber.Trim();
            if (request.AvatarUrl != null)
                user.AvatarUrl = request.AvatarUrl.Trim();
            if (request.DateOfBirth.HasValue)
                profile.DateOfBirth = request.DateOfBirth;
            if (request.Gender != null)
                profile.Gender = request.Gender.Trim();
            if (request.Address != null)
                profile.Address = request.Address.Trim();
            if (request.City != null)
                profile.City = request.City.Trim();
            if (request.Latitude.HasValue)
                profile.Latitude = request.Latitude.Value;
            if (request.Longitude.HasValue)
                profile.Longitude = request.Longitude.Value;
            if (request.School != null)
                profile.School = request.School.Trim();
            if (request.Major != null)
                profile.Major = request.Major.Trim();
            if (request.YearOfStudy.HasValue)
                profile.YearOfStudy = request.YearOfStudy;
            if (request.Bio != null)
                profile.Bio = request.Bio.Trim();
            if (request.Skills != null)
                profile.Skills = request.Skills.Trim();
        }
    }
}
