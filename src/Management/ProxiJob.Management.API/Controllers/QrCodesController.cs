using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Application.Features.QrCodes.Commands;
using ProxiJob.Management.Application.Features.QrCodes.Queries;

namespace ProxiJob.Management.API.Controllers;

[ApiController]
public class QrCodesController : ApiControllerBase
{
    private readonly IMediator _mediator;

    public QrCodesController(IMediator mediator)
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
        {
            return businessId;
        }

        // Resolve BusinessId for employees/students
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "UserId" || c.Type == "sub" || c.Type == "nameid");
        if (userIdClaim != null && int.TryParse(userIdClaim.Value, out var userId))
        {
            var context = HttpContext.RequestServices.GetRequiredService<IManagementDbContext>();
            var employee = context.Employees.FirstOrDefault(e => e.UserId == userId);
            if (employee != null)
            {
                return employee.BusinessId;
            }
        }

        return 1; // Default for development
    }

    private string GetCurrentUser()
    {
        return User.Identity?.Name ?? "System";
    }

    [HttpPost("api/qr-code/generate")]
    [Authorize(Roles = "Business")]
    public async Task<IActionResult> GenerateQrCode()
    {
        var command = new GenerateQrCodeCommand
        {
            BusinessId = GetBusinessId(),
            CreatedBy = GetCurrentUser()
        };
        var token = await _mediator.Send(command);
        return Ok(new { QrToken = token });
    }

    [HttpGet("api/qr-code")]
    [Authorize(Roles = "Business,Student,Employee")]
    public async Task<IActionResult> GetQrCode()
    {
        var query = new GetQrCodeByBusinessQuery
        {
            BusinessId = GetBusinessId()
        };
        var result = await _mediator.Send(query);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPatch("api/qr-code/radius")]
    [Authorize(Roles = "Business")]
    public async Task<IActionResult> UpdateRadius([FromBody] UpdateQrRadiusCommand command)
    {
        command.BusinessId = GetBusinessId();
        command.UpdatedBy = GetCurrentUser();
        await _mediator.Send(command);
        return Ok();
    }
}
