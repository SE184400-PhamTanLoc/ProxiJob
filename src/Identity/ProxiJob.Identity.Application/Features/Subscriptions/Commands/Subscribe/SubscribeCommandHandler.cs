using MediatR;
using ProxiJob.Identity.Application.Common.Exceptions;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.Application.Features.Subscriptions.Commands.Subscribe
{
    public class SubscribeCommandHandler : IRequestHandler<SubscribeCommand, PurchasePlanResponseDto>
    {
        private readonly ICurrentUserService _currentUser;
        private readonly IPaymentService _paymentService;
        private readonly IClientIpResolver _clientIpResolver;

        public SubscribeCommandHandler(
            ICurrentUserService currentUser,
            IPaymentService paymentService,
            IClientIpResolver clientIpResolver)
        {
            _currentUser = currentUser;
            _paymentService = paymentService;
            _clientIpResolver = clientIpResolver;
        }

        public async Task<PurchasePlanResponseDto> Handle(SubscribeCommand request, CancellationToken cancellationToken)
        {
            if (_currentUser.UserId is not int userId)
                throw new UnauthorizedAccessException(BusinessMessages.NotAuthenticated);

            if (_currentUser.Role != RoleNames.Business)
                throw new ForbiddenAccessException(BusinessMessages.BusinessSubscribeOnly);

            if (!PaymentGatewayNames.TryParse(request.Gateway, out var gateway))
                throw new InvalidOperationException(BusinessMessages.InvalidGateway);

            var clientIp = _clientIpResolver.GetClientIp();
            return await _paymentService.InitiatePurchaseAsync(
                userId, request.PlanId, gateway, clientIp, cancellationToken);
        }
    }
}
