namespace ProxiJob.Shared.Contract.Events
{
    public record JobPublishedEvent(
        int JobPostId,
        int BusinessId,
        string Title,
        string Address,
        double Latitude,
        double Longitude,
        string CategoryName,
        decimal MinSalary
    );

    public record JobClosedEvent(
        int JobPostId,
        List<int> AffectedStudentIds
    );

    public record JobUpdatedEvent(
        int JobPostId,
        string Title,
        List<int> ApprovedStudentIds
    );

    public record ShiftAppliedEvent(
        int ApplicationId,
        int ShiftId,
        int StudentId,
        int BusinessId,
        string JobTitle
    );

    public record ApplicationApprovedEvent(
        int ApplicationId,
        int StudentId,
        string JobTitle,
        DateTime ShiftStartTime,
        DateTime ShiftEndTime
    );

    public record ApplicationRejectedEvent(
        int ApplicationId,
        int StudentId,
        string JobTitle,
        string? Note
    );

    public record ApplicationCancelledEvent(
        int ApplicationId,
        int StudentId,
        string JobTitle,
        string Note
    );
}
