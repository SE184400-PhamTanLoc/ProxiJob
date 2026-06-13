using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using ProxiJob.Job.Domain.Models;
using Microsoft.EntityFrameworkCore;
using MassTransit;
using ProxiJob.Shared.Contract.Events;

namespace ProxiJob.Job.Application.Features.Applications.Commands
{
    public class ApplyShiftCommand : IRequest<int>
    {
        public int ShiftId { get; set; }
        public int StudentId { get; set; }
        public string Introduction { get; set; }
        public string CreatedBy { get; set; }
    }

    public class ApplyShiftCommandHandler : IRequestHandler<ApplyShiftCommand, int>
    {
        private readonly IJobDbContext _context;
        private readonly IIdentityGrpcClient _identityGrpc;
        private readonly IPublishEndpoint _publishEndpoint;

        public ApplyShiftCommandHandler(IJobDbContext context, IIdentityGrpcClient identityGrpc, IPublishEndpoint publishEndpoint)
        {
            _context = context;
            _identityGrpc = identityGrpc;
            _publishEndpoint = publishEndpoint;
        }

        public async Task<int> Handle(ApplyShiftCommand request, CancellationToken cancellationToken)
        {
            var shift = await _context.JobShifts
                .Include(s => s.JobPost)
                .FirstOrDefaultAsync(s => s.Id == request.ShiftId, cancellationToken);

            if (shift == null || shift.IsDeleted)
                throw new Exception("Không tìm thấy ca làm hoặc ca làm đã bị xóa.");

            if (shift.JobPost.Status != "Published")
                throw new Exception("Bài đăng tuyển dụng của ca làm này chưa được công bố.");

            if (shift.RemainingSlots <= 0)
                throw new Exception("Ca làm việc đã hết chỗ tuyển dụng.");

            var existingApp = await _context.Applications
                .FirstOrDefaultAsync(a => a.JobShiftId == request.ShiftId && a.StudentId == request.StudentId && (a.Status == "Pending" || a.Status == "Approved"), cancellationToken);

            if (existingApp != null)
                throw new Exception("Bạn đã ứng tuyển vào ca làm này rồi.");

            var conflictingApp = await _context.Applications
                .Include(a => a.JobShift)
                .FirstOrDefaultAsync(a => a.StudentId == request.StudentId && a.Status == "Approved" 
                    && (a.JobShift.StartTime < shift.EndTime && a.JobShift.EndTime > shift.StartTime), cancellationToken);

            if (conflictingApp != null)
                throw new Exception("Bạn đã có ca làm khác trùng khung giờ với ca làm này.");

            var cvUrl = await _identityGrpc.GetStudentCVUrlAsync(request.StudentId, cancellationToken);

            var application = new Domain.Models.Application
            {
                JobShiftId = request.ShiftId,
                StudentId = request.StudentId,
                Introduction = request.Introduction,
                CVUrl = cvUrl,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = request.CreatedBy,
                Histories = new List<ApplicationHistory>
                {
                    new ApplicationHistory
                    {
                        Status = "Pending",
                        Note = "Đã nộp đơn",
                        ChangedAt = DateTime.UtcNow,
                        CreatedBy = request.CreatedBy
                    }
                }
            };

            _context.Applications.Add(application);
            await _context.SaveChangesAsync(cancellationToken);

            try 
            {
                await _publishEndpoint.Publish(new ShiftAppliedEvent(
                    application.Id,
                    application.JobShiftId,
                    application.StudentId,
                    shift.JobPost.BusinessId,
                    shift.JobPost.Title
                ), cancellationToken);
            }
            catch 
            {
                // Ignore
            }

            return application.Id;
        }
    }
}
