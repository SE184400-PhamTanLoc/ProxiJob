namespace ProxiJob.Job.Application.Common.Interfaces
{
    public interface IIdentityServiceGrpcClient
    {
        Task<string> GetStudentCVUrlAsync(int studentId, CancellationToken cancellationToken);
    }
}
