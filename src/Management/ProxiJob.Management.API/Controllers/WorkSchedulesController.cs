using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Management.Application.Features.WorkSchedules.Commands;
using ProxiJob.Management.Application.Features.WorkSchedules.DTOs;
using ProxiJob.Management.Application.Features.WorkSchedules.Queries;

namespace ProxiJob.Management.API.Controllers;

[ApiController]
[Authorize(Roles = "Business")] // Assuming JWT setup
public class WorkSchedulesController : ApiControllerBase
{
    private readonly IMediator _mediator;

    public WorkSchedulesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    private int GetBusinessId()
    {
        // Mocking business id extraction from JWT token for now
        var claim = User.Claims.FirstOrDefault(c => c.Type == "BusinessId");
        if (claim != null && int.TryParse(claim.Value, out var businessId))
        {
            return businessId;
        }
        return 1; // Default for development
    }
    
    private string GetCurrentUser()
    {
        return User.Identity?.Name ?? "System";
    }

    [HttpPost("api/employees/{employeeId}/schedules")]
    public async Task<IActionResult> CreateSchedule(int employeeId, [FromBody] CreateWorkScheduleCommand command)
    {
        command.EmployeeId = employeeId;
        command.BusinessId = GetBusinessId();
        command.CreatedBy = GetCurrentUser();
        var scheduleId = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetSchedulesByEmployee), new { employeeId = employeeId }, new { Id = scheduleId });
    }

    [HttpGet("api/employees/{employeeId}/schedules")]
    public async Task<IActionResult> GetSchedulesByEmployee(int employeeId, [FromQuery] DateOnly fromDate, [FromQuery] DateOnly toDate)
    {
        var query = new GetSchedulesByEmployeeQuery
        {
            EmployeeId = employeeId,
            BusinessId = GetBusinessId(),
            FromDate = fromDate,
            ToDate = toDate
        };
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpGet("api/schedules")]
    public async Task<IActionResult> GetSchedulesByBusiness([FromQuery] DateOnly date)
    {
        var query = new GetSchedulesByBusinessQuery
        {
            BusinessId = GetBusinessId(),
            Date = date
        };
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpPut("api/schedules/{id}")]
    public async Task<IActionResult> UpdateSchedule(int id, [FromBody] UpdateWorkScheduleCommand command)
    {
        command.ScheduleId = id;
        command.BusinessId = GetBusinessId();
        command.UpdatedBy = GetCurrentUser();
        await _mediator.Send(command);
        return Ok();
    }

    [HttpDelete("api/schedules/{id}")]
    public async Task<IActionResult> DeleteSchedule(int id)
    {
        var command = new DeleteWorkScheduleCommand
        {
            ScheduleId = id,
            BusinessId = GetBusinessId(),
            DeletedBy = GetCurrentUser()
        };
        await _mediator.Send(command);
        return Ok();
    }
}
