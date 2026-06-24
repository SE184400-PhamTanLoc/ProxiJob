using System;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Application.Features.Timekeepings.Commands;
using ProxiJob.Management.Application.Features.Timekeepings.Queries;

namespace ProxiJob.Management.API.Controllers;

[ApiController]
public class TimekeepingController : ApiControllerBase
{
    private readonly IMediator _mediator;

    public TimekeepingController(IMediator mediator)
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

    [HttpPost("api/timekeeping/check-in")]
    [Authorize(Roles = "Student,Employee")] // Only employee/student can check in
    public async Task<IActionResult> CheckIn([FromBody] CheckInCommand command)
    {
        try
        {
            command.UserId = GetUserId();
            command.CreatedBy = GetCurrentUser();
            var id = await _mediator.Send(command);
            return Ok(new { TimekeepingId = id });
        }
        catch (Exception ex)
        {
            return BadRequest(ProxiJob.Management.API.Common.ApiResponse.FailureResponse(ex.Message));
        }
    }

    [HttpPost("api/timekeeping/check-out")]
    [Authorize(Roles = "Student,Employee")]
    public async Task<IActionResult> CheckOut([FromBody] CheckOutCommand command)
    {
        try
        {
            command.UserId = GetUserId();
            command.UpdatedBy = GetCurrentUser();
            await _mediator.Send(command);
            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(ProxiJob.Management.API.Common.ApiResponse.FailureResponse(ex.Message));
        }
    }

    [HttpPost("api/timekeeping/manual")]
    [Authorize(Roles = "Business")]
    public async Task<IActionResult> ManualTimekeeping([FromBody] ManualTimekeepingCommand command)
    {
        command.BusinessId = GetBusinessId();
        command.CreatedBy = GetCurrentUser();
        var id = await _mediator.Send(command);
        return Ok(new { TimekeepingId = id });
    }

    [HttpPatch("api/timekeeping/{id}/confirm")]
    [Authorize(Roles = "Business")]
    public async Task<IActionResult> ConfirmSuspicious(int id, [FromBody] ConfirmSuspiciousCommand command)
    {
        command.TimekeepingId = id;
        command.BusinessId = GetBusinessId();
        command.UpdatedBy = GetCurrentUser();
        await _mediator.Send(command);
        return Ok();
    }

    [HttpGet("api/timekeeping")]
    [Authorize(Roles = "Business")]
    public async Task<IActionResult> GetTimekeepingByDate([FromQuery] DateOnly date)
    {
        var query = new GetTimekeepingByBusinessQuery
        {
            BusinessId = GetBusinessId(),
            Date = date
        };
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpGet("api/timekeeping/suspicious")]
    [Authorize(Roles = "Business")]
    public async Task<IActionResult> GetSuspicious()
    {
        var query = new GetSuspiciousTimekeepingsQuery
        {
            BusinessId = GetBusinessId()
        };
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpGet("api/employees/{employeeId}/timekeepings")]
    [Authorize(Roles = "Business")]
    public async Task<IActionResult> GetByEmployee(int employeeId, [FromQuery] DateOnly fromDate, [FromQuery] DateOnly toDate)
    {
        var query = new GetTimekeepingByEmployeeQuery
        {
            EmployeeId = employeeId,
            BusinessId = GetBusinessId(),
            FromDate = fromDate,
            ToDate = toDate
        };
        var result = await _mediator.Send(query);
        return Ok(result);
    }
}
