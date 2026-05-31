using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;

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
                return Unauthorized(new { message = BusinessMessages.NotAuthenticated });

            try
            {
                var status = await _paymentService.GetOrderStatusAsync(orderId, userId, cancellationToken);
                return Ok(status);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost("{orderId:int}/session")]
        [Authorize]
        public async Task<IActionResult> CreateSession(int orderId, CancellationToken cancellationToken)
        {
            if (_currentUser.UserId is not int userId)
                return Unauthorized(new { message = BusinessMessages.NotAuthenticated });

            try
            {
                var tokens = await _paymentService.IssueTokensIfPaidAsync(orderId, userId, cancellationToken);
                if (tokens == null)
                    return BadRequest(new { message = BusinessMessages.PaymentNotCompleted });

                return Ok(tokens);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}
