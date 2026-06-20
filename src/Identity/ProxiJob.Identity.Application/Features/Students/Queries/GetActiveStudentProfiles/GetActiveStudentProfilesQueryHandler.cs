using MediatR;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Application.Services;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ProxiJob.Identity.Application.Features.Students.Queries.GetActiveStudentProfiles
{
    public class GetActiveStudentProfilesQueryHandler : IRequestHandler<GetActiveStudentProfilesQuery, List<StudentProfileDto>>
    {
        private readonly IStudentProfileRepository _profileRepository;

        public GetActiveStudentProfilesQueryHandler(IStudentProfileRepository profileRepository)
        {
            _profileRepository = profileRepository;
        }

        public async Task<List<StudentProfileDto>> Handle(GetActiveStudentProfilesQuery request, CancellationToken cancellationToken)
        {
            var profiles = await _profileRepository.GetActiveProfilesAsync(cancellationToken);
            return profiles.Select(StudentProfileMapper.ToDto).ToList();
        }
    }
}
