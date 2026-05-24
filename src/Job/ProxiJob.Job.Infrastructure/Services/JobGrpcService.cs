using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Job.Infrastructure.Data;
using ProxiJob.Shared.Contract.Protos;

namespace ProxiJob.Job.Infrastructure.Services
{
    public class JobGrpcService : ProxiJob.Shared.Contract.Protos.JobGrpcService.JobGrpcServiceBase
    {
        private readonly JobDbContext _context;

        public JobGrpcService(JobDbContext context)
        {
            _context = context;
        }

        public override async Task<GetPublishedJobsResponse> GetPublishedJobs(Empty request, ServerCallContext context)
        {
            var jobs = await _context.JobPosts
                .Include(j => j.Category)
                .Include(j => j.Location)
                .Include(j => j.Shifts)
                .Where(j => j.Status == "Published" && !j.IsDeleted)
                .ToListAsync(context.CancellationToken);

            var response = new GetPublishedJobsResponse();

            foreach (var j in jobs)
            {
                if (j.Location == null) continue;

                double minSalary = j.Shifts.Any() ? (double)j.Shifts.Min(s => s.Salary) : 0;
                int remainingSlots = j.Shifts.Sum(s => s.RemainingSlots);

                response.Jobs.Add(new JobPostGrpcDto
                {
                    JobPostId = j.Id,
                    Title = j.Title,
                    Address = j.Location.Address ?? "",
                    Latitude = j.Location.Latitude,
                    Longitude = j.Location.Longitude,
                    CategoryName = j.Category?.Name ?? "",
                    MinSalary = minSalary,
                    RemainingSlots = remainingSlots
                });
            }

            return response;
        }

        public override async Task<JobPostGrpcDto> GetJobPostById(GetJobPostByIdRequest request, ServerCallContext context)
        {
            var j = await _context.JobPosts
                .Include(j => j.Category)
                .Include(j => j.Location)
                .Include(j => j.Shifts)
                .FirstOrDefaultAsync(x => x.Id == request.JobPostId && !x.IsDeleted, context.CancellationToken);

            if (j == null || j.Location == null)
            {
                throw new RpcException(new Status(StatusCode.NotFound, "Job Post not found"));
            }

            double minSalary = j.Shifts.Any() ? (double)j.Shifts.Min(s => s.Salary) : 0;
            int remainingSlots = j.Shifts.Sum(s => s.RemainingSlots);

            return new JobPostGrpcDto
            {
                JobPostId = j.Id,
                Title = j.Title,
                Address = j.Location.Address ?? "",
                Latitude = j.Location.Latitude,
                Longitude = j.Location.Longitude,
                CategoryName = j.Category?.Name ?? "",
                MinSalary = minSalary,
                RemainingSlots = remainingSlots
            };
        }
    }
}
