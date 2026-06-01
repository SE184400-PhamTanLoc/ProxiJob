using Grpc.Core;
using Microsoft.Extensions.Configuration;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Services;
using ProxiJob.Shared.Contract.Protos;

namespace ProxiJob.Identity.Infrastructure.Services
{
    public class IdentityGrpcServiceImpl : IdentityGrpcService.IdentityGrpcServiceBase
    {
        private readonly IStudentProfileRepository _studentProfileRepository;
        private readonly IUserContextService _userContextService;
        private readonly IConfiguration _configuration;

        public IdentityGrpcServiceImpl(
            IStudentProfileRepository studentProfileRepository,
            IUserContextService userContextService,
            IConfiguration configuration)
        {
            _studentProfileRepository = studentProfileRepository;
            _userContextService = userContextService;
            _configuration = configuration;
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
    }
}
