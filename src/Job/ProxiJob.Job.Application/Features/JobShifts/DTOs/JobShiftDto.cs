namespace ProxiJob.Job.Application.Features.JobShifts.DTOs
{
    public class JobShiftDto
    {
        public int Id { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public decimal Salary { get; set; }
        public int Slots { get; set; }
        public int RemainingSlots { get; set; }
    }
}
