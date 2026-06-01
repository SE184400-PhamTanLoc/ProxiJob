using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Identity.Application.Common.Exceptions;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.API.Controllers
{
    [ApiController]
    [Route("api/admin/payments")]
    [Authorize]
    public class AdminPaymentsController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly ICurrentUserService _currentUser;
        private readonly IAuthRepository _authRepository;

        public AdminPaymentsController(
            IPaymentService paymentService,
            ICurrentUserService currentUser,
            IAuthRepository authRepository)
        {
            _paymentService = paymentService;
            _currentUser = currentUser;
            _authRepository = authRepository;
        }

        /// <summary>Danh sách đơn chuyển khoản chờ admin xác nhận</summary>
        [HttpGet("pending")]
        public async Task<IActionResult> GetPending(CancellationToken cancellationToken)
        {
            await EnsureAdminAsync(cancellationToken);
            var orders = await _paymentService.GetPendingBankTransferOrdersAsync(cancellationToken);
            return Ok(orders);
        }

        /// <summary>Admin xác nhận đã nhận chuyển khoản → kích hoạt gói</summary>
        [HttpPost("{orderId:int}/confirm")]
        public async Task<IActionResult> Confirm(
            int orderId,
            [FromBody] ConfirmPaymentRequestDto? request,
            CancellationToken cancellationToken)
        {
            var adminEmail = await EnsureAdminAsync(cancellationToken);
            try
            {
                var result = await _paymentService.ConfirmBankTransferOrderAsync(
                    orderId, adminEmail, request?.AdminNote, cancellationToken);
                return Ok(new { message = BusinessMessages.PaymentConfirmed, order = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>Admin từ chối đơn (chưa nhận được tiền / sai nội dung)</summary>
        [HttpPost("{orderId:int}/reject")]
        public async Task<IActionResult> Reject(
            int orderId,
            [FromBody] ConfirmPaymentRequestDto? request,
            CancellationToken cancellationToken)
        {
            var adminEmail = await EnsureAdminAsync(cancellationToken);
            try
            {
                var result = await _paymentService.RejectBankTransferOrderAsync(
                    orderId, adminEmail, request?.AdminNote, cancellationToken);
                return Ok(new { message = BusinessMessages.PaymentRejected, order = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private async Task<string> EnsureAdminAsync(CancellationToken cancellationToken)
        {
            if (_currentUser.UserId is not int userId)
                throw new UnauthorizedAccessException(BusinessMessages.NotAuthenticated);

            if (_currentUser.Role != RoleNames.Admin)
                throw new ForbiddenAccessException(BusinessMessages.AdminOnly);

            var user = await _authRepository.GetUserByIdAsync(userId, cancellationToken)
                ?? throw new UnauthorizedAccessException(BusinessMessages.UserNotFound);

            return user.Email;
        }
    }
}
