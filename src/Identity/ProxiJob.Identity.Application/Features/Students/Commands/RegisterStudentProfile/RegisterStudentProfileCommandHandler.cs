using MediatR;
using ProxiJob.Identity.Application.Common.Exceptions;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Application.Services;
using ProxiJob.Identity.Domain.Constants;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Features.Students.Commands.RegisterStudentProfile
{
    public class RegisterStudentProfileCommandHandler : IRequestHandler<RegisterStudentProfileCommand, StudentProfileDto>
    {
        private readonly ICurrentUserService _currentUser;
        private readonly IStudentProfileRepository _profileRepository;
        private readonly IAuthRepository _authRepository;
        private readonly IUnitOfWork _unitOfWork;

        public RegisterStudentProfileCommandHandler(
            ICurrentUserService currentUser,
            IStudentProfileRepository profileRepository,
            IAuthRepository authRepository,
            IUnitOfWork unitOfWork)
        {
            _currentUser = currentUser;
            _profileRepository = profileRepository;
            _authRepository = authRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<StudentProfileDto> Handle(RegisterStudentProfileCommand request, CancellationToken cancellationToken)
        {
            if (_currentUser.UserId is not int userId)
                throw new UnauthorizedAccessException(BusinessMessages.NotAuthenticated);
            if (_currentUser.Role != RoleNames.Student)
                throw new ForbiddenAccessException(BusinessMessages.StudentProfileOnly);

            var user = await _authRepository.GetUserByIdAsync(userId, cancellationToken)
                ?? throw new UnauthorizedAccessException(BusinessMessages.UserNotFound);

            var profile = await _profileRepository.GetByUserIdWithUserAsync(userId, cancellationToken);
            var isNew = profile == null;

            if (profile != null)
            {
                if (profile.ReadinessStatus == ProfileReadinessStatus.ReadyForWork)
                    throw new InvalidOperationException(BusinessMessages.ProfileAlreadyRegistered);

                if (StudentProfileMapper.IsRegistered(profile))
                    throw new InvalidOperationException(BusinessMessages.ProfileAlreadyRegistered);
            }
            else
            {
                profile = new StudentProfile
                {
                    UserId = userId,
                    ReadinessStatus = ProfileReadinessStatus.Incomplete,
                    CreatedBy = user.Email,
                    User = user
                };
            }

            StudentProfileMapper.ApplyFull(
                user, profile,
                request.PhoneNumber, request.AvatarUrl, request.DateOfBirth, request.Gender,
                request.Address, request.City, request.Latitude, request.Longitude, request.School, request.Major,
                request.YearOfStudy, request.Bio, request.Skills);

            profile.UpdatedAt = DateTime.UtcNow;
            profile.UpdatedBy = user.Email;

            if (isNew)
                await _profileRepository.AddAsync(profile, cancellationToken);
            else
                await _profileRepository.UpdateAsync(profile, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            profile.User = user;
            return StudentProfileMapper.ToDto(profile);
        }
    }
}
