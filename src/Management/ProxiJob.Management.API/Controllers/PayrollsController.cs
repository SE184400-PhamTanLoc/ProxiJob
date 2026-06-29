using System;
using System.Linq;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Application.Features.Payrolls.Commands;
using ProxiJob.Management.Application.Features.Payrolls.Queries;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Management.API.Controllers;

[ApiController]
[Authorize]
public class PayrollsController : ApiControllerBase
{
    private readonly IMediator _mediator;

    public PayrollsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    private int GetBusinessId()
    {
        var currentUserService = HttpContext.RequestServices.GetRequiredService<ICurrentUserService>();
        if (currentUserService.BusinessId.HasValue)
        {
            return currentUserService.BusinessId.Value;
        }

        var claim = User.Claims.FirstOrDefault(c => c.Type == "BusinessId");
        if (claim != null && int.TryParse(claim.Value, out var businessId))
            return businessId;
        return 1; // Default
    }

    private int GetUserId()
    {
        var currentUserService = HttpContext.RequestServices.GetRequiredService<ICurrentUserService>();
        if (currentUserService.UserId.HasValue)
        {
            return currentUserService.UserId.Value;
        }

        var claim = User.Claims.FirstOrDefault(c => c.Type == "UserId");
        if (claim != null && int.TryParse(claim.Value, out var userId))
            return userId;
        return 1; // Default
    }

    private string GetCurrentUser()
    {
        return User.Identity?.Name ?? "System";
    }

    [HttpPost("api/payrolls/calculate")]
    [Authorize(Roles = "Business")]
    public async Task<IActionResult> CalculatePayroll([FromBody] CalculatePayrollCommand command)
    {
        command.BusinessId = GetBusinessId();
        command.CreatedBy = GetCurrentUser();
        var id = await _mediator.Send(command);
        return Ok(new { PayrollId = id });
    }

    [HttpGet("api/payrolls")]
    [Authorize(Roles = "Business")]
    public async Task<IActionResult> GetPayrolls([FromQuery] string? status)
    {
        var query = new GetPayrollsByBusinessQuery
        {
            BusinessId = GetBusinessId(),
            Status = status
        };
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpGet("api/payrolls/{id}")]
    [Authorize(Roles = "Business")]
    public async Task<IActionResult> GetPayrollById(int id)
    {
        var query = new GetPayrollByIdQuery
        {
            PayrollId = id,
            BusinessId = GetBusinessId()
        };
        var result = await _mediator.Send(query);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpGet("api/payrolls/analytics")]
    [Authorize(Roles = "Business")]
    public async Task<IActionResult> GetPayrollAnalytics([FromQuery] string? period)
    {
        var query = new GetPayrollAnalyticsQuery
        {
            BusinessId = GetBusinessId(),
            Period = period ?? "week"
        };
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpPatch("api/payrolls/{id}/approve-interim")]
    [Authorize(Roles = "Business")]
    public async Task<IActionResult> ApproveInterimPayroll(int id, [FromBody] ApproveInterimPayrollCommand command)
    {
        command.PayrollId = id;
        command.BusinessId = GetBusinessId();
        command.UpdatedBy = GetCurrentUser();
        var success = await _mediator.Send(command);
        return success ? Ok() : BadRequest(new { error = "Unable to process interim approval" });
    }

    [HttpGet("api/payrolls/student")]
    [Authorize(Roles = "Student,Employee")]
    public async Task<IActionResult> GetStudentPayrolls([FromQuery] string? status)
    {
        var query = new GetPayrollsByStudentQuery
        {
            UserId = GetUserId(),
            Status = status
        };
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpPatch("api/payrolls/{id}/confirm-receipt")]
    [Authorize(Roles = "Student,Employee")]
    public async Task<IActionResult> ConfirmReceiptPayroll(int id, [FromBody] ConfirmReceiptPayrollCommand command)
    {
        command.PayrollId = id;
        command.UserId = GetUserId();
        command.UpdatedBy = GetCurrentUser();
        var success = await _mediator.Send(command);
        return success ? Ok() : BadRequest(new { error = "Unable to confirm payment receipt" });
    }
}
