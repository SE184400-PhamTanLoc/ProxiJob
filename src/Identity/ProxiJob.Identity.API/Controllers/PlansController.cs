using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Identity.Application.Common.Exceptions;
using ProxiJob.Identity.Application.Features.Subscriptions.Commands.Subscribe;
using ProxiJob.Identity.Application.Features.Subscriptions.Queries.GetMyFeatures;
using ProxiJob.Identity.Application.Features.Subscriptions.Queries.GetPlanComparison;

namespace ProxiJob.Identity.API.Controllers
{
    [ApiController]
    [Route("api/plans")]
    public class PlansController : ControllerBase
    {
        private readonly IMediator _mediator;

        public PlansController(IMediator mediator) => _mediator = mediator;

        /// <summary>Danh sách gói dịch vụ B2B (public)</summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetPlans(CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new GetPlanComparisonQuery(), cancellationToken);
            return Ok(result);
        }

        /// <summary>Gói đang sử dụng (cần đăng nhập)</summary>
        [HttpGet("current")]
        [Authorize]
        public async Task<IActionResult> GetCurrentPlan(CancellationToken cancellationToken)
        {
            try
            {
                var result = await _mediator.Send(new GetMyFeaturesQuery(), cancellationToken);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        /// <summary>Tạo đơn thanh toán — body: { "planId": 1, "gateway": "Mock" | "VNPay" | "MoMo" }</summary>
        [HttpPost("purchase")]
        [Authorize]
        public async Task<IActionResult> PurchasePlan([FromBody] SubscribeCommand command, CancellationToken cancellationToken)
        {
            try
            {
                var result = await _mediator.Send(command, cancellationToken);
                return Ok(result);
            }
            catch (ValidationException ex)
            {
                return BadRequest(new { errors = ex.Errors.Select(e => e.ErrorMessage) });
            }
            catch (ForbiddenAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
