using ProxiJob.Job.Application.Common.Interfaces;

namespace ProxiJob.Job.Infrastructure.Services
{
    public class IdentityServiceGrpcClient : IIdentityServiceGrpcClient
    {
        public Task<string> GetStudentCVUrlAsync(int studentId, CancellationToken cancellationToken)
        {
            // Trả về một link CV mock/giả lập phục vụ cho runtime và testing
            var mockCvUrl = $"https://supabase.co/storage/v1/object/public/cvs/student_{studentId}_cv.pdf";
            return Task.FromResult(mockCvUrl);
        }
    }
}
