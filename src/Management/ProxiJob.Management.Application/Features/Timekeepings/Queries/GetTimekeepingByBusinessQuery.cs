using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Application.Features.Timekeepings.DTOs;
using ProxiJob.Management.Domain.Enums;

namespace ProxiJob.Management.Application.Features.Timekeepings.Queries;

public class GetTimekeepingByBusinessQuery : IRequest<List<TimekeepingDto>>
{
    public int BusinessId { get; set; }
    public DateOnly Date { get; set; }
}

public class GetTimekeepingByBusinessQueryHandler : IRequestHandler<GetTimekeepingByBusinessQuery, List<TimekeepingDto>>
{
    private readonly IManagementDbContext _context;
    private readonly IIdentityGrpcClient _identityGrpcClient;

    public GetTimekeepingByBusinessQueryHandler(IManagementDbContext context, IIdentityGrpcClient identityGrpcClient)
    {
        _context = context;
        _identityGrpcClient = identityGrpcClient;
    }

    public async Task<List<TimekeepingDto>> Handle(GetTimekeepingByBusinessQuery request, CancellationToken cancellationToken)
    {
        var schedules = await _context.WorkSchedules
            .Include(ws => ws.Employee)
            .Include(ws => ws.Timekeeping)
            .Where(ws => ws.Employee.BusinessId == request.BusinessId && ws.Date == request.Date)
            .OrderBy(ws => ws.Employee.FullName)
            .ToListAsync(cancellationToken);

        // Fetch real-time phone numbers from Identity service via gRPC
        var employeeUserIds = schedules
            .Where(ws => ws.Employee.UserId.HasValue)
            .Select(ws => ws.Employee.UserId!.Value)
            .Distinct()
            .ToList();

        var userPhones = new Dictionary<int, string>();
        foreach (var userId in employeeUserIds)
        {
            try
            {
                var userSnapshot = await _identityGrpcClient.GetUserByIdAsync(userId, cancellationToken);
                if (userSnapshot != null && !string.IsNullOrEmpty(userSnapshot.PhoneNumber))
                {
                    userPhones[userId] = userSnapshot.PhoneNumber;
                }
            }
            catch (Exception ex)
            {
                // Graceful fallback to local DB phone number if gRPC service is unavailable
                Console.WriteLine($"[Management API] gRPC user fetch failed for userId {userId}: {ex.Message}");
            }
        }

        var timekeepings = schedules.Select(ws => {
            string? phone = ws.Employee.PhoneNumber;
            if (ws.Employee.UserId.HasValue && userPhones.TryGetValue(ws.Employee.UserId.Value, out var realPhone))
            {
                phone = realPhone;
            }

            return new TimekeepingDto
            {
                Id = ws.Timekeeping?.Id ?? 0,
                EmployeeId = ws.EmployeeId,
                WorkScheduleId = ws.Id,
                JobShiftId = ws.JobShiftId,
                CheckInTime = ws.Timekeeping?.CheckInTime,
                CheckOutTime = ws.Timekeeping?.CheckOutTime,
                InLatitude = ws.Timekeeping?.InLatitude,
                InLongitude = ws.Timekeeping?.InLongitude,
                OutLatitude = ws.Timekeeping?.OutLatitude,
                OutLongitude = ws.Timekeeping?.OutLongitude,
                CheckInPhoto = ws.Timekeeping?.CheckInPhoto,
                CheckOutPhoto = ws.Timekeeping?.CheckOutPhoto,
                Status = ws.Timekeeping?.Status.ToString() ?? "NotCheckedIn",
                IsManual = ws.Timekeeping?.IsManual ?? false,
                Note = ws.Timekeeping?.Note,
                EmployeeName = ws.Employee.FullName,
                Position = ws.Employee.Position,
                ShiftName = ws.Note,
                StudentPhone = phone
            };
        }).ToList();

        return timekeepings;
    }
}
