using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Services;

namespace ProxiJob.Identity.API.Controllers
{
    /// <summary>
    /// Hồ sơ sinh viên dùng như CV (link công khai cho chủ quán xem khi ứng tuyển).
    /// </summary>
    [ApiController]
    [AllowAnonymous]
    [Route("api/public/students")]
    public class PublicStudentCvController : ControllerBase
    {
        private readonly IStudentProfileRepository _studentProfileRepository;

        public PublicStudentCvController(IStudentProfileRepository studentProfileRepository)
        {
            _studentProfileRepository = studentProfileRepository;
        }

        [HttpGet("{userId:int}/cv")]
        public async Task<IActionResult> GetCv(int userId, CancellationToken cancellationToken)
        {
            var profile = await _studentProfileRepository.GetByUserIdWithUserAsync(userId, cancellationToken);
            if (profile == null)
                return NotFound();

            return Ok(StudentProfileMapper.ToDto(profile));
        }
    }
}
