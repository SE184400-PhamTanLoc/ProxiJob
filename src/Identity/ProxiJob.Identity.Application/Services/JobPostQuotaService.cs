using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Constants;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Services
{
    public interface IJobPostQuotaService
    {
        Task<JobPostQuotaDto> GetQuotaAsync(int userId, string role, CancellationToken cancellationToken = default);
        Task<JobPostQuotaDto> ConsumeOnePostAsync(int userId, CancellationToken cancellationToken = default);
    }

    public class JobPostQuotaService : IJobPostQuotaService
    {
        private readonly IAuthRepository _authRepository;
        private readonly IRoleRepository _roleRepository;
        private readonly ISubscriptionRepository _subscriptionRepository;
        private readonly IUnitOfWork _unitOfWork;

        public JobPostQuotaService(
            IAuthRepository authRepository,
            IRoleRepository roleRepository,
            ISubscriptionRepository subscriptionRepository,
            IUnitOfWork unitOfWork)
        {
            _authRepository = authRepository;
            _roleRepository = roleRepository;
            _subscriptionRepository = subscriptionRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<JobPostQuotaDto> GetQuotaAsync(int userId, string role, CancellationToken cancellationToken = default)
        {
            var user = await _authRepository.GetUserByIdAsync(userId, cancellationToken)
                ?? throw new InvalidOperationException("Không tìm thấy tài khoản.");

            return await BuildQuotaAsync(user, role, cancellationToken);
        }

        public async Task<JobPostQuotaDto> ConsumeOnePostAsync(int userId, CancellationToken cancellationToken = default)
        {
            var user = await _authRepository.GetUserByIdAsync(userId, cancellationToken)
                ?? throw new InvalidOperationException("Không tìm thấy tài khoản.");

            var role = await _roleRepository.GetUserRoleNameAsync(userId, cancellationToken)
                ?? RoleNames.Business;

            var quota = await BuildQuotaAsync(user, role, cancellationToken);
            if (!quota.CanPostJob)
                throw new InvalidOperationException(
                    quota.MustPurchasePlan
                        ? BusinessMessages.FreeTrialExhausted
                        : BusinessMessages.JobPostLimitReached);

            user.JobPostsUsed++;
            await _authRepository.UpdateUserAsync(user, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return await BuildQuotaAsync(user, role, cancellationToken);
        }

        private async Task<JobPostQuotaDto> BuildQuotaAsync(User user, string role, CancellationToken cancellationToken)
        {
            var (tier, limit) = await _subscriptionRepository.GetUserTierInfoAsync(user.Id, cancellationToken);
            if (role != RoleNames.Business)
                return CreateQuota(0, 0, SubscriptionNames.None, mustPurchase: false);

            var mustPurchase = tier == SubscriptionNames.Trial && user.JobPostsUsed >= limit;
            return CreateQuota(user.JobPostsUsed, limit, tier, mustPurchase);
        }

        private static JobPostQuotaDto CreateQuota(int used, int limit, string tier, bool mustPurchase)
        {
            var remaining = Math.Max(0, limit - used);
            return new JobPostQuotaDto
            {
                SubscriptionTier = tier,
                JobPostLimit = limit,
                JobPostsUsed = used,
                JobPostsRemaining = remaining,
                CanPostJob = used < limit,
                MustPurchasePlan = mustPurchase
            };
        }
    }
}
