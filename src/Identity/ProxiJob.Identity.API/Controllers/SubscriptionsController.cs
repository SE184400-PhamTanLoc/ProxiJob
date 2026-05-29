using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Identity.Application.Features.Subscriptions.Commands.UpgradeSubscription;
using ProxiJob.Identity.Application.Features.Subscriptions.Queries.GetMySubscription;
using ProxiJob.Identity.Application.Features.Subscriptions.Queries.GetSubscriptions;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.API.Controllers
{
    [ApiController]
    [Route("api/subscriptions")]
    public class SubscriptionsController : ControllerBase
    {
        private readonly IMediator _mediator;

        public SubscriptionsController(IMediator mediator) => _mediator = mediator;

        /// <summary>Danh sách gói dịch vụ (Free / Enterprise)</summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetPlans(CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new GetSubscriptionsQuery(), cancellationToken);
            return Ok(result);
        }

        /// <summary>Gói đang sử dụng của tài khoản hiện tại</summary>
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetMyPlan(CancellationToken cancellationToken)
        {
            try
            {
                var result = await _mediator.Send(new GetMySubscriptionQuery(), cancellationToken);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        /// <summary>Nâng cấp lên Enterprise (chủ quán)</summary>
        [HttpPost("upgrade")]
        [Authorize(Policy = PolicyNames.BusinessOnly)]
        public async Task<IActionResult> Upgrade(CancellationToken cancellationToken)
        {
            try
            {
                var result = await _mediator.Send(new UpgradeSubscriptionCommand(), cancellationToken);
                return Ok(result);
            }
            catch (ValidationException ex)
            {
                return BadRequest(new { errors = ex.Errors.Select(e => e.ErrorMessage) });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        /// <summary>Endpoint mẫu — chỉ Enterprise</summary>
        [HttpGet("enterprise-features")]
        [Authorize(Policy = PolicyNames.EnterpriseOnly)]
        public IActionResult GetEnterpriseFeatures()
            => Ok(new { message = "Enterprise features are available for your account." });
    }
}
