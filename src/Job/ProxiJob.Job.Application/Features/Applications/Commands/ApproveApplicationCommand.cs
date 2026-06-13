using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using MassTransit;
using ProxiJob.Shared.Contract.Events;
using System.Data.Common;

namespace ProxiJob.Job.Application.Features.Applications.Commands
{
    public class ApproveApplicationCommand : IRequest<bool>
    {
        public int ApplicationId { get; set; }
        public int BusinessId { get; set; }
        public string UpdatedBy { get; set; }
    }

    public class ApproveApplicationCommandHandler : IRequestHandler<ApproveApplicationCommand, bool>
    {
        private readonly IJobDbContext _context;
        private readonly IPublishEndpoint _publishEndpoint;
        private readonly IIdentityGrpcClient _identityGrpc;

        public ApproveApplicationCommandHandler(IJobDbContext context, IPublishEndpoint publishEndpoint, IIdentityGrpcClient identityGrpc)
        {
            _context = context;
            _publishEndpoint = publishEndpoint;
            _identityGrpc = identityGrpc;
        }

        public async Task<bool> Handle(ApproveApplicationCommand request, CancellationToken cancellationToken)
        {
            var application = await _context.Applications
                .Include(a => a.JobShift).ThenInclude(s => s.JobPost)
                .Include(a => a.Histories)
                .FirstOrDefaultAsync(a => a.Id == request.ApplicationId, cancellationToken);

            if (application == null || application.JobShift.JobPost.BusinessId != request.BusinessId)
                throw new Exception("Application not found or you don't have permission.");

            if (application.Status != "Pending" && application.Status != "Cancelled")
                throw new Exception("Only Pending or Cancelled applications can be approved.");

            if (application.Status == "Cancelled")
            {
                application.Status = "CancelledApproved";
                application.UpdatedAt = DateTime.UtcNow;
                application.UpdatedBy = request.UpdatedBy;
                application.Histories.Add(new Domain.Models.ApplicationHistory
                {
                    Status = "CancelledApproved",
                    Note = "Đã chấp thuận yêu cầu hủy ca/xin nghỉ",
                    ChangedAt = DateTime.UtcNow,
                    CreatedBy = request.UpdatedBy
                });
                await _context.SaveChangesAsync(cancellationToken);
                return true;
            }

            if (application.JobShift.RemainingSlots <= 0)
                throw new Exception("No remaining slots.");

            application.Status = "Approved";
            application.UpdatedAt = DateTime.UtcNow;
            application.UpdatedBy = request.UpdatedBy;

            application.Histories.Add(new Domain.Models.ApplicationHistory
            {
                Status = "Approved",
                Note = "Đã được duyệt",
                ChangedAt = DateTime.UtcNow,
                CreatedBy = request.UpdatedBy
            });

            application.JobShift.RemainingSlots -= 1;

            var otherPendings = new List<Domain.Models.Application>();

            if (application.JobShift.RemainingSlots == 0)
            {
                otherPendings = await _context.Applications
                    .Include(a => a.Histories)
                    .Where(a => a.JobShiftId == application.JobShiftId && a.Status == "Pending" && a.Id != application.Id)
                    .ToListAsync(cancellationToken);

                foreach (var pending in otherPendings)
                {
                    pending.Status = "Rejected";
                    pending.UpdatedAt = DateTime.UtcNow;
                    pending.UpdatedBy = "System";

                    pending.Histories.Add(new Domain.Models.ApplicationHistory
                    {
                        Status = "Rejected",
                        Note = "Đã đủ số lượng",
                        ChangedAt = DateTime.UtcNow,
                        CreatedBy = "System"
                    });
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            // Fetch student name from Identity Service via gRPC
            string studentName = "Nhân viên vãng lai";
            try
            {
                var profile = await _identityGrpc.GetStudentProfileAsync(application.StudentId, cancellationToken);
                if (profile != null && !string.IsNullOrWhiteSpace(profile.FullName))
                {
                    studentName = profile.FullName;
                }
            }
            catch { }

            // Direct DB fallback: write to management_employees and management_work_schedules
            if (_context is DbContext dbContext)
            {
                try
                {
                    var connection = dbContext.Database.GetDbConnection();
                    if (connection.State != System.Data.ConnectionState.Open)
                    {
                        await connection.OpenAsync(cancellationToken);
                    }

                    int employeeId = 0;
                    using (var cmd = connection.CreateCommand())
                    {
                        cmd.CommandText = "SELECT id FROM management_employees WHERE user_id = @userId AND business_id = @businessId AND is_deleted = false LIMIT 1";
                        
                        var pUserId = cmd.CreateParameter();
                        pUserId.ParameterName = "@userId";
                        pUserId.Value = application.StudentId;
                        cmd.Parameters.Add(pUserId);

                        var pBusinessId = cmd.CreateParameter();
                        pBusinessId.ParameterName = "@businessId";
                        pBusinessId.Value = application.JobShift.JobPost.BusinessId;
                        cmd.Parameters.Add(pBusinessId);

                        var res = await cmd.ExecuteScalarAsync(cancellationToken);
                        if (res != null)
                        {
                            employeeId = Convert.ToInt32(res);
                        }
                    }

                    if (employeeId == 0)
                    {
                        using (var cmd = connection.CreateCommand())
                        {
                            cmd.CommandText = @"
                                INSERT INTO management_employees (business_id, user_id, full_name, is_external, payment_type, status, created_at, created_by, is_deleted, position)
                                VALUES (@businessId, @userId, @fullName, true, 'PerShift', 'Active', @createdAt, 'DirectFallback', false, 'Nhân viên vãng lai')
                                RETURNING id";

                            var pBusinessId = cmd.CreateParameter();
                            pBusinessId.ParameterName = "@businessId";
                            pBusinessId.Value = application.JobShift.JobPost.BusinessId;
                            cmd.Parameters.Add(pBusinessId);

                            var pUserId = cmd.CreateParameter();
                            pUserId.ParameterName = "@userId";
                            pUserId.Value = application.StudentId;
                            cmd.Parameters.Add(pUserId);

                            var pFullName = cmd.CreateParameter();
                            pFullName.ParameterName = "@fullName";
                            pFullName.Value = studentName;
                            cmd.Parameters.Add(pFullName);

                             var pCreatedAt = cmd.CreateParameter();
                             pCreatedAt.ParameterName = "@createdAt";
                             pCreatedAt.DbType = System.Data.DbType.DateTime;
                             pCreatedAt.Value = DateTime.UtcNow;
                             cmd.Parameters.Add(pCreatedAt);

                            var res = await cmd.ExecuteScalarAsync(cancellationToken);
                            if (res != null)
                            {
                                employeeId = Convert.ToInt32(res);
                            }
                        }
                    }

                    if (employeeId != 0)
                    {
                        bool scheduleExists = false;
                        using (var cmd = connection.CreateCommand())
                        {
                            cmd.CommandText = "SELECT EXISTS(SELECT 1 FROM management_work_schedules WHERE employee_id = @employeeId AND job_shift_id = @jobShiftId AND is_deleted = false)";
                            
                            var pEmployeeId = cmd.CreateParameter();
                            pEmployeeId.ParameterName = "@employeeId";
                            pEmployeeId.Value = employeeId;
                            cmd.Parameters.Add(pEmployeeId);

                            var pJobShiftId = cmd.CreateParameter();
                            pJobShiftId.ParameterName = "@jobShiftId";
                            pJobShiftId.Value = application.JobShiftId;
                            cmd.Parameters.Add(pJobShiftId);

                            scheduleExists = (bool)(await cmd.ExecuteScalarAsync(cancellationToken) ?? false);
                        }

                        if (!scheduleExists)
                        {
                            using (var cmd = connection.CreateCommand())
                            {
                                cmd.CommandText = @"
                                    INSERT INTO management_work_schedules (employee_id, job_shift_id, job_shift_salary, date, start_time, end_time, created_at, created_by, is_deleted)
                                    VALUES (@employeeId, @jobShiftId, @salary, @date, @startTime, @endTime, @createdAt, 'DirectFallback', false)";

                                var pEmployeeId = cmd.CreateParameter();
                                pEmployeeId.ParameterName = "@employeeId";
                                pEmployeeId.Value = employeeId;
                                cmd.Parameters.Add(pEmployeeId);

                                var pJobShiftId = cmd.CreateParameter();
                                pJobShiftId.ParameterName = "@jobShiftId";
                                pJobShiftId.Value = application.JobShiftId;
                                cmd.Parameters.Add(pJobShiftId);

                                 var pSalary = cmd.CreateParameter();
                                 pSalary.ParameterName = "@salary";
                                 pSalary.DbType = System.Data.DbType.Decimal;
                                 pSalary.Value = application.JobShift.Salary;
                                 cmd.Parameters.Add(pSalary);

                                 var pDate = cmd.CreateParameter();
                                 pDate.ParameterName = "@date";
                                 pDate.DbType = System.Data.DbType.Date;
                                 pDate.Value = DateOnly.FromDateTime(application.JobShift.StartTime);
                                 cmd.Parameters.Add(pDate);

                                 var pStartTime = cmd.CreateParameter();
                                 pStartTime.ParameterName = "@startTime";
                                 pStartTime.DbType = System.Data.DbType.DateTime;
                                 pStartTime.Value = application.JobShift.StartTime.Kind == DateTimeKind.Unspecified
                                     ? DateTime.SpecifyKind(application.JobShift.StartTime, DateTimeKind.Utc)
                                     : application.JobShift.StartTime.ToUniversalTime();
                                 cmd.Parameters.Add(pStartTime);

                                 var pEndTime = cmd.CreateParameter();
                                 pEndTime.ParameterName = "@endTime";
                                 pEndTime.DbType = System.Data.DbType.DateTime;
                                 pEndTime.Value = application.JobShift.EndTime.Kind == DateTimeKind.Unspecified
                                     ? DateTime.SpecifyKind(application.JobShift.EndTime, DateTimeKind.Utc)
                                     : application.JobShift.EndTime.ToUniversalTime();
                                 cmd.Parameters.Add(pEndTime);

                                 var pCreatedAt = cmd.CreateParameter();
                                 pCreatedAt.ParameterName = "@createdAt";
                                 pCreatedAt.DbType = System.Data.DbType.DateTime;
                                 pCreatedAt.Value = DateTime.UtcNow;
                                 cmd.Parameters.Add(pCreatedAt);

                                await cmd.ExecuteNonQueryAsync(cancellationToken);
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    // Direct SQL fallback error logged
                    Console.WriteLine($"[DB FALLBACK ERROR] Failed to sync employee to management database: {ex.ToString()}");
                }
            }

            try 
            {
                await _publishEndpoint.Publish(new ApplicationApprovedEvent(
                    application.Id,
                    application.StudentId,
                    application.JobShift.JobPost.BusinessId,
                    application.JobShiftId,
                    application.JobShift.JobPost.Title,
                    application.JobShift.StartTime,
                    application.JobShift.EndTime,
                    application.JobShift.Salary
                ), cancellationToken);

                if (application.JobShift.RemainingSlots == 0)
                {
                    foreach (var pending in otherPendings)
                    {
                        await _publishEndpoint.Publish(new ApplicationRejectedEvent(
                            pending.Id,
                            pending.StudentId,
                            application.JobShift.JobPost.Title,
                            "Đã đủ số lượng"
                        ), cancellationToken);
                    }
                }
            }
            catch 
            {
                // Ignore
            }

            return true;
        }
    }
}
