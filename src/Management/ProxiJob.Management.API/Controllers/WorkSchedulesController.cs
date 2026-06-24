using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Collections.Generic;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Application.Features.WorkSchedules.Commands;
using ProxiJob.Management.Application.Features.WorkSchedules.DTOs;
using ProxiJob.Management.Application.Features.WorkSchedules.Queries;

namespace ProxiJob.Management.API.Controllers;

[ApiController]
[Authorize]
public class WorkSchedulesController : ApiControllerBase
{
    private readonly IMediator _mediator;
    private readonly IManagementDbContext _context;

    public WorkSchedulesController(IMediator mediator, IManagementDbContext context)
    {
        _mediator = mediator;
        _context = context;
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
        {
            return businessId;
        }
        return 1; // Default for development
    }
    
    private string GetCurrentUser()
    {
        return User.Identity?.Name ?? "System";
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

    [Authorize(Roles = "Business")]
    [HttpPost("api/employees/{employeeId}/schedules")]
    public async Task<IActionResult> CreateSchedule(int employeeId, [FromBody] CreateWorkScheduleCommand command)
    {
        try
        {
            command.EmployeeId = employeeId;
            command.BusinessId = GetBusinessId();
            command.CreatedBy = GetCurrentUser();
            var scheduleId = await _mediator.Send(command);
            return CreatedAtAction(nameof(GetSchedulesByEmployee), new { employeeId = employeeId }, new { Id = scheduleId });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Business")]
    [HttpGet("api/employees/{employeeId}/schedules")]
    public async Task<IActionResult> GetSchedulesByEmployee(int employeeId, [FromQuery] DateOnly fromDate, [FromQuery] DateOnly toDate)
    {
        try
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
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Business")]
    [HttpGet("api/schedules")]
    public async Task<IActionResult> GetSchedulesByBusiness([FromQuery] DateOnly date)
    {
        try
        {
            var query = new GetSchedulesByBusinessQuery
            {
                BusinessId = GetBusinessId(),
                Date = date
            };
            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Student,Employee")]
    [HttpGet("api/schedules/my-schedules")]
    public async Task<IActionResult> GetMySchedules([FromQuery] DateOnly fromDate, [FromQuery] DateOnly toDate)
    {
        try
        {
            var userId = GetUserId();
            
            var employeeIds = await _context.Employees
                .Where(e => e.UserId == userId)
                .Select(e => e.Id)
                .ToListAsync();

            if (!employeeIds.Any())
            {
                return Ok(new List<WorkScheduleDto>());
            }

            var schedules = await _context.WorkSchedules
                .Where(ws => employeeIds.Contains(ws.EmployeeId) && ws.Date >= fromDate && ws.Date <= toDate)
                .OrderBy(ws => ws.StartTime)
                .Select(ws => new WorkScheduleDto
                {
                    Id = ws.Id,
                    EmployeeId = ws.EmployeeId,
                    JobShiftId = ws.JobShiftId,
                    JobShiftSalary = ws.JobShiftSalary,
                    Date = ws.Date,
                    StartTime = ws.StartTime,
                    EndTime = ws.EndTime,
                    Note = ws.Note
                })
                .ToListAsync();

            return Ok(schedules);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Business")]
    [HttpPut("api/schedules/{id}")]
    public async Task<IActionResult> UpdateSchedule(int id, [FromBody] UpdateWorkScheduleCommand command)
    {
        try
        {
            command.ScheduleId = id;
            command.BusinessId = GetBusinessId();
            command.UpdatedBy = GetCurrentUser();
            await _mediator.Send(command);
            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Business")]
    [HttpDelete("api/schedules/{id}")]
    public async Task<IActionResult> DeleteSchedule(int id)
    {
        try
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
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
