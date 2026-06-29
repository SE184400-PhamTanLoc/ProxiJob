using Grpc.Core;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Services;
using ProxiJob.Shared.Contract.Protos;
using ProxiJob.Identity.Infrastructure.Data;

namespace ProxiJob.Identity.Infrastructure.Services
{
    public class IdentityGrpcServiceImpl : IdentityGrpcService.IdentityGrpcServiceBase
    {
        private readonly IStudentProfileRepository _studentProfileRepository;
        private readonly IBusinessProfileRepository _businessProfileRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IUserContextService _userContextService;
        private readonly IConfiguration _configuration;
        private readonly IdentityDbContext _dbContext;

        public IdentityGrpcServiceImpl(
            IStudentProfileRepository studentProfileRepository,
            IBusinessProfileRepository businessProfileRepository,
            IUnitOfWork unitOfWork,
            IUserContextService userContextService,
            IConfiguration configuration,
            IdentityDbContext dbContext)
        {
            _studentProfileRepository = studentProfileRepository;
            _businessProfileRepository = businessProfileRepository;
            _unitOfWork = unitOfWork;
            _userContextService = userContextService;
            _configuration = configuration;
            _dbContext = dbContext;
        }

        public override async Task<GetUserContextResponse> GetUserContext(
            GetUserContextRequest request,
            ServerCallContext context)
        {
            if (request.UserId <= 0)
                throw new RpcException(new Status(StatusCode.InvalidArgument, "user_id is required."));

            var userContext = await _userContextService.GetByUserIdAsync(request.UserId, context.CancellationToken);
            return ToResponse(userContext);
        }

        public override async Task<GetUserContextResponse> ValidateAccessToken(
            ValidateAccessTokenRequest request,
            ServerCallContext context)
        {
            if (string.IsNullOrWhiteSpace(request.AccessToken))
                throw new RpcException(new Status(StatusCode.InvalidArgument, "access_token is required."));

            var userContext = await _userContextService.GetFromAccessTokenAsync(
                request.AccessToken,
                context.CancellationToken);

            return ToResponse(userContext);
        }

        public override async Task<GetStudentCvForApplicationResponse> GetStudentCvForApplication(
            GetStudentCvForApplicationRequest request,
            ServerCallContext context)
        {
            if (request.StudentId <= 0)
                throw new RpcException(new Status(StatusCode.InvalidArgument, "student_id is required."));

            var profile = await _studentProfileRepository.GetByUserIdWithUserAsync(
                request.StudentId,
                context.CancellationToken);

            if (profile == null)
            {
                return new GetStudentCvForApplicationResponse
                {
                    Found = false,
                    CvUrl = string.Empty
                };
            }

            var dto = StudentProfileMapper.ToDto(profile);
            var cvUrl = StudentCvUrlResolver.Resolve(profile, profile.User, _configuration) ?? string.Empty;

            return new GetStudentCvForApplicationResponse
            {
                Found = true,
                CvUrl = cvUrl,
                Profile = new StudentProfileGrpcDto
                {
                    UserId = dto.UserId,
                    FullName = dto.FullName ?? string.Empty,
                    Email = dto.Email ?? string.Empty,
                    PhoneNumber = dto.PhoneNumber ?? string.Empty,
                    AvatarUrl = dto.AvatarUrl ?? string.Empty,
                    ReadinessStatus = dto.ReadinessStatus ?? string.Empty,
                    School = dto.School ?? string.Empty,
                    Major = dto.Major ?? string.Empty,
                    YearOfStudy = dto.YearOfStudy ?? 0,
                    Bio = dto.Bio ?? string.Empty,
                    Skills = dto.Skills ?? string.Empty,
                    ReputationScore = (double)dto.ReputationScore,
                    ReviewCount = dto.ReviewCount,
                    CompletionPercent = dto.CompletionPercent
                }
            };
        }

        private static GetUserContextResponse ToResponse(ProxiJob.Identity.Application.DTOs.UserContextDto? userContext)
        {
            if (userContext == null)
            {
                return new GetUserContextResponse { Found = false };
            }

            return new GetUserContextResponse
            {
                Found = true,
                User = UserContextGrpcMapper.ToGrpc(userContext)
            };
        }

        public override async Task<UpdateStudentReputationResponse> UpdateStudentReputation(
            UpdateStudentReputationRequest request,
            ServerCallContext context)
        {
            if (request.UserId <= 0)
                throw new RpcException(new Status(StatusCode.InvalidArgument, "user_id is required."));

            var profile = await _studentProfileRepository.GetByUserIdAsync(request.UserId, context.CancellationToken);
            if (profile == null)
            {
                return new UpdateStudentReputationResponse { Success = false };
            }

            int newReviewCount = profile.ReviewCount + 1;
            decimal ratingDecimal = (decimal)request.Rating;

            if (ratingDecimal < 1) ratingDecimal = 1;
            if (ratingDecimal > 5) ratingDecimal = 5;

            decimal newReputationScore = ((profile.ReputationScore * profile.ReviewCount) + ratingDecimal) / newReviewCount;
            profile.ReputationScore = Math.Round(newReputationScore, 2);
            profile.ReviewCount = newReviewCount;

            await _studentProfileRepository.UpdateAsync(profile, context.CancellationToken);
            await _unitOfWork.SaveChangesAsync(context.CancellationToken);

            return new UpdateStudentReputationResponse { Success = true };
        }

        public override async Task<UpdateBusinessReputationResponse> UpdateBusinessReputation(
            UpdateBusinessReputationRequest request,
            ServerCallContext context)
        {
            if (request.UserId <= 0)
                throw new RpcException(new Status(StatusCode.InvalidArgument, "user_id is required."));

            var profile = await _businessProfileRepository.GetByUserIdAsync(request.UserId, context.CancellationToken);
            if (profile == null)
            {
                // Fallback: search by BusinessProfile Id (since request.UserId might contain the BusinessId instead)
                profile = await _dbContext.BusinessProfiles.FirstOrDefaultAsync(p => p.Id == request.UserId, context.CancellationToken);
            }

            if (profile == null)
            {
                return new UpdateBusinessReputationResponse { Success = false };
            }

            int newReviewCount = profile.ReviewCount + 1;
            decimal ratingDecimal = (decimal)request.Rating;

            if (ratingDecimal < 1) ratingDecimal = 1;
            if (ratingDecimal > 5) ratingDecimal = 5;

            decimal newReputationScore = ((profile.ReputationScore * profile.ReviewCount) + ratingDecimal) / newReviewCount;
            profile.ReputationScore = Math.Round(newReputationScore, 2);
            profile.ReviewCount = newReviewCount;

            await _businessProfileRepository.UpdateAsync(profile, context.CancellationToken);
            await _unitOfWork.SaveChangesAsync(context.CancellationToken);

            return new UpdateBusinessReputationResponse { Success = true };
        }
    }
}
