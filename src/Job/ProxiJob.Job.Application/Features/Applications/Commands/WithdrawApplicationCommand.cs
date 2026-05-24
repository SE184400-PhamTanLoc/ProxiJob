using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.Applications.Commands
{
    public class WithdrawApplicationCommand : IRequest<bool>
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string UpdatedBy { get; set; }
    }

    public class WithdrawApplicationCommandHandler : IRequestHandler<WithdrawApplicationCommand, bool>
    {
        private readonly IJobDbContext _context;

        public WithdrawApplicationCommandHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(WithdrawApplicationCommand request, CancellationToken cancellationToken)
        {
            var application = await _context.Applications
                .Include(a => a.Histories)
                .FirstOrDefaultAsync(a => a.Id == request.Id && a.StudentId == request.StudentId, cancellationToken);

            if (application == null)
                throw new Exception("Application not found or you don't have permission.");

            if (application.Status != "Pending")
                throw new Exception("Only Pending applications can be withdrawn.");

            application.Status = "Cancelled";
            application.UpdatedAt = DateTime.UtcNow;
            application.UpdatedBy = request.UpdatedBy;

            application.Histories.Add(new Domain.Models.ApplicationHistory
            {
                Status = "Cancelled",
                Note = "Sinh viên đã rút đơn",
                ChangedAt = DateTime.UtcNow,
                CreatedBy = request.UpdatedBy
            });

            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
