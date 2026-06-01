using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;

namespace ProxiJob.Management.Application.Features.Timekeepings.Commands;

public class CheckOutCommand : IRequest<bool>
{
    public int TimekeepingId { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? CheckOutPhoto { get; set; }
    public int UserId { get; set; }
    public string UpdatedBy { get; set; } = "System";
}

public class CheckOutCommandHandler : IRequestHandler<CheckOutCommand, bool>
{
    private readonly IManagementDbContext _context;

    public CheckOutCommandHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(CheckOutCommand request, CancellationToken cancellationToken)
    {
        var timekeeping = await _context.Timekeepings
            .Include(t => t.Employee)
            .FirstOrDefaultAsync(t => t.Id == request.TimekeepingId && t.Employee.UserId == request.UserId, cancellationToken);

        if (timekeeping == null)
        {
            throw new Exception("Timekeeping record not found or access denied.");
        }

        if (timekeeping.CheckOutTime.HasValue)
        {
            throw new Exception("Already checked out.");
        }

        timekeeping.CheckOutTime = DateTime.UtcNow;
        timekeeping.OutLatitude = request.Latitude;
        timekeeping.OutLongitude = request.Longitude;
        timekeeping.CheckOutPhoto = request.CheckOutPhoto;
        
        timekeeping.UpdatedBy = request.UpdatedBy;
        timekeeping.UpdatedAt = DateTime.UtcNow;

        _context.Timekeepings.Update(timekeeping);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
