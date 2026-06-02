using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Shared.Contract;

namespace ProxiJob.Identity.API.Controllers
{
    [ApiController]
    [Route("api/payments")]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly ICurrentUserService _currentUser;

        public PaymentsController(IPaymentService paymentService, ICurrentUserService currentUser)
        {
            _paymentService = paymentService;
            _currentUser = currentUser;
        }

        [HttpGet("{orderId:int}")]
        [Authorize]
        public async Task<IActionResult> GetStatus(int orderId, CancellationToken cancellationToken)
        {
            if (_currentUser.UserId is not int userId)
                return Unauthorized(ApiResponse.Fail(StatusCodes.Status401Unauthorized, BusinessMessages.NotAuthenticated));

            try
            {
                var status = await _paymentService.GetOrderStatusAsync(orderId, userId, cancellationToken);
                return Ok(ApiResponse<object>.Success(status, StatusCodes.Status200OK));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ApiResponse.Fail(StatusCodes.Status401Unauthorized, ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ApiResponse.Fail(StatusCodes.Status404NotFound, ex.Message));
            }
        }

        [HttpPost("{orderId:int}/session")]
        [Authorize]
        public async Task<IActionResult> CreateSession(int orderId, CancellationToken cancellationToken)
        {
            if (_currentUser.UserId is not int userId)
                return Unauthorized(ApiResponse.Fail(StatusCodes.Status401Unauthorized, BusinessMessages.NotAuthenticated));

            try
            {
                var tokens = await _paymentService.IssueTokensIfPaidAsync(orderId, userId, cancellationToken);
                if (tokens == null)
                    return BadRequest(ApiResponse.Fail(StatusCodes.Status400BadRequest, BusinessMessages.PaymentNotCompleted));

                return Ok(ApiResponse<object>.Success(tokens, StatusCodes.Status200OK));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ApiResponse.Fail(StatusCodes.Status401Unauthorized, ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ApiResponse.Fail(StatusCodes.Status404NotFound, ex.Message));
            }
        }
    }
}
