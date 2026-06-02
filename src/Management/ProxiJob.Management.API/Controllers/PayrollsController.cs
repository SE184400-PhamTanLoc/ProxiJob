using System;
using System.Linq;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Management.Application.Features.Payrolls.Commands;
using ProxiJob.Management.Application.Features.Payrolls.Queries;

namespace ProxiJob.Management.API.Controllers;

[ApiController]
[Authorize(Roles = "Business")]
public class PayrollsController : ApiControllerBase
{
    private readonly IMediator _mediator;

    public PayrollsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    private int GetBusinessId()
    {
        var claim = User.Claims.FirstOrDefault(c => c.Type == "BusinessId");
        if (claim != null && int.TryParse(claim.Value, out var businessId))
            return businessId;
        return 1; // Default
    }

    private string GetCurrentUser()
    {
        return User.Identity?.Name ?? "System";
    }

    [HttpPost("api/payrolls/calculate")]
    public async Task<IActionResult> CalculatePayroll([FromBody] CalculatePayrollCommand command)
    {
        command.BusinessId = GetBusinessId();
        command.CreatedBy = GetCurrentUser();
        var id = await _mediator.Send(command);
        return Ok(new { PayrollId = id });
    }

    [HttpGet("api/payrolls")]
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

    [HttpPatch("api/payrolls/{id}/approve")]
    public async Task<IActionResult> ApprovePayroll(int id, [FromBody] ApprovePayrollCommand command)
    {
        command.PayrollId = id;
        command.BusinessId = GetBusinessId();
        command.UpdatedBy = GetCurrentUser();
        await _mediator.Send(command);
        return Ok();
    }
}
