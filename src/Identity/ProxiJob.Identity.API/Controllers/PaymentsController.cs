using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Domain.Enums;
using System.Text.Json;

namespace ProxiJob.Identity.API.Controllers
{
    [ApiController]
    [Route("api/payments")]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly ICurrentUserService _currentUser;
        private readonly IConfiguration _configuration;
        private readonly IHostEnvironment _environment;

        public PaymentsController(
            IPaymentService paymentService,
            ICurrentUserService currentUser,
            IConfiguration configuration,
            IHostEnvironment environment)
        {
            _paymentService = paymentService;
            _currentUser = currentUser;
            _configuration = configuration;
            _environment = environment;
        }

        /// <summary>Trạng thái đơn thanh toán</summary>
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

        /// <summary>Lấy JWT sau khi thanh toán thành công (status = Paid)</summary>
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

        /// <summary>VNPay return URL (trình duyệt chuyển hướng về)</summary>
        [HttpGet("callback/vnpay")]
        [AllowAnonymous]
        public async Task<IActionResult> VNPayReturn(CancellationToken cancellationToken)
        {
            var parameters = ToDictionary(Request.Query);
            await _paymentService.ProcessCallbackAsync(PaymentGatewayType.VNPay, parameters, cancellationToken);
            return Redirect(GetFrontendReturnUrl());
        }

        /// <summary>VNPay IPN (server-to-server)</summary>
        [HttpPost("callback/vnpay")]
        [AllowAnonymous]
        public async Task<IActionResult> VNPayIpn(CancellationToken cancellationToken)
        {
            var parameters = Request.HasFormContentType
                ? ToDictionary(Request.Form)
                : ToDictionary(Request.Query);

            var ok = await _paymentService.ProcessCallbackAsync(PaymentGatewayType.VNPay, parameters, cancellationToken);
            return Ok(new { RspCode = ok ? "00" : "99", Message = ok ? "Confirm Success" : "Confirm Failed" });
        }

        /// <summary>MoMo chuyển hướng trình duyệt sau thanh toán (redirectUrl)</summary>
        [HttpGet("callback/momo-return")]
        [AllowAnonymous]
        public async Task<IActionResult> MoMoReturn(CancellationToken cancellationToken)
        {
            var parameters = ToDictionary(Request.Query);
            await _paymentService.ProcessCallbackAsync(PaymentGatewayType.MoMo, parameters, cancellationToken);
            var orderCode = parameters.GetValueOrDefault("orderId");
            var baseUrl = GetFrontendReturnUrl().TrimEnd('/');
            var redirect = string.IsNullOrEmpty(orderCode)
                ? baseUrl
                : $"{baseUrl}?paymentOrderCode={Uri.EscapeDataString(orderCode)}";
            return Redirect(redirect);
        }

        /// <summary>MoMo IPN (server-to-server — nguồn tin cậy để kích hoạt gói)</summary>
        [HttpPost("callback/momo")]
        [AllowAnonymous]
        public async Task<IActionResult> MoMoIpn(CancellationToken cancellationToken)
        {
            using var doc = await JsonDocument.ParseAsync(Request.Body, cancellationToken: cancellationToken);
            var parameters = doc.RootElement.EnumerateObject()
                .ToDictionary(p => p.Name, p => p.Value.ToString());

            var ok = await _paymentService.ProcessCallbackAsync(PaymentGatewayType.MoMo, parameters, cancellationToken);
            return Ok(new { message = ok ? "success" : "failed" });
        }

        /// <summary>Xác nhận thanh toán Mock (chỉ Development / EnableMockGateway)</summary>
        [HttpGet("mock/confirm/{orderId:int}")]
        [HttpPost("mock/confirm/{orderId:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> ConfirmMock(int orderId, CancellationToken cancellationToken)
        {
            var mockEnabled = _configuration.GetValue("PaymentSettings:EnableMockGateway", _environment.IsDevelopment());
            if (!_environment.IsDevelopment() && !mockEnabled)
                return NotFound();

            try
            {
                await _paymentService.ConfirmMockPaymentAsync(orderId, cancellationToken);
                return Ok(new { message = "Thanh toán Mock thành công. Gọi POST /api/payments/{orderId}/session để lấy token." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private string GetFrontendReturnUrl()
            => _configuration["PaymentSettings:FrontendReturnUrl"] ?? "/";

        private static Dictionary<string, string> ToDictionary(IQueryCollection query)
            => query.ToDictionary(k => k.Key, v => v.Value.ToString());

        private static Dictionary<string, string> ToDictionary(IFormCollection form)
            => form.ToDictionary(k => k.Key, v => v.Value.ToString());
    }
}
