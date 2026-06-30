import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IDENTITY_API_BASE_URL } from '../api/apiConfig';
import { getStoredToken, getStoredUser, checkAuthApi } from '../api/auth';
import {
  getPublishedJobs,
  getJobPostShifts,
  createJobPost,
  createJobShift,
  publishJobPost,
  applyToShiftApi,
  getMyApplications,
  getApplicationsByShift,
  approveApplication,
  rejectApplication,
  getJobPostsByBusiness,
  updateJobPostApi,
  deleteJobPostApi
} from '../api/jobs';
import {
  getEmployees,
  createEmployee,
  deleteEmployee,
  updateEmployee,
  getTimekeepingLogs,
  getSchedules,
  createSchedule,
  deleteSchedule,
  getMySchedules,
  getPayrolls,
  getStudentPayrolls,
  calculatePayroll,
  approvePayroll,
  checkInShiftApi,
  checkOutShiftApi,
  getPayrollAnalytics,
  approveInterimPayroll,
  confirmReceiptPayroll
} from '../api/management';
import { translateError } from '../context/useAuth';

const formatTimeVN = (dateInput) => {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (e) {
    return '';
  }
};

const formatDateVN = (dateInput) => {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return '';
  }
};

const checkIsEmergency = (title, description) => {
  const t = (title || '').toLowerCase();
  const d = (description || '').toLowerCase();
  return t.includes('khẩn cấp') || 
         t.includes('khấn cấp') || 
         t.includes('khần cấp') || 
         t.includes('tuyển gấp') || 
         t.includes('gấp') || 
         d.includes('khẩn cấp') || 
         d.includes('khấn cấp') || 
         d.includes('khần cấp') || 
         d.includes('tuyển gấp') || 
         d.includes('gấp');
};

const jobShiftsCache = new Map(); // jobId -> { data, timestamp }
const CACHE_TTL = 30000; // 30 seconds

export const clearJobShiftsCache = () => {
  jobShiftsCache.clear();
};

const fetchJobShiftsWithCache = async (jobId) => {
  const cached = jobShiftsCache.get(jobId);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const data = await getJobPostShifts(jobId);
  jobShiftsCache.set(jobId, { data, timestamp: now });
  return data;
};

// ==========================================
// 1. QUERIES FOR SHIFTS & APPLICATIONS
// ==========================================

export const useShiftsQuery = (user, studentCoords) => {
  return useQuery({
    queryKey: ['shifts', user?.id],
    queryFn: async () => {
      try {
        const res = await getPublishedJobs();
        const jobPosts = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.items || res?.Items || res?.data?.items || res?.data?.Items || []));

        // Fetch all job shifts in parallel instead of sequentially for much faster loading
        const shiftResults = await Promise.all(
          jobPosts.map(async (job) => {
            try {
              const jobShiftsRes = await fetchJobShiftsWithCache(job.id);
              const jobShifts = Array.isArray(jobShiftsRes) ? jobShiftsRes : (Array.isArray(jobShiftsRes?.data) ? jobShiftsRes.data : (jobShiftsRes?.items || jobShiftsRes?.Items || jobShiftsRes?.data?.items || jobShiftsRes?.data?.Items || []));
              return jobShifts.map(s => ({
                id: s.id,
                jobPostId: job.id,
                startTime: s.startTime,
                endTime: s.endTime,
                title: job.title,
                categoryName: job.categoryName,
                shopName: job.categoryName || 'Cửa hàng',
                hourlyRate: s.salary,
                latitude: job.latitude || job.location?.latitude || 0,
                longitude: job.longitude || job.location?.longitude || 0,
                address: job.address || job.location?.address || job.shopAddress || job.locationAddress || '',
                date: formatDateVN(s.startTime),
                time: `${formatTimeVN(s.startTime)} - ${formatTimeVN(s.endTime)}`,
                description: job.description || '',
                requirements: job.requirements || '',
                rating: 5.0,
                reviewsCount: 1,
                status: s.remainingSlots <= 0 ? 'full' : 'available',
                isEmergency: checkIsEmergency(job.title, job.description),
                createdAt: job.createdAt || job.CreatedAt || s.startTime,
                auditFields: {
                  createdBy: job.createdBy,
                  updatedBy: job.createdBy,
                  deletedBy: ''
                }
              }));
            } catch (sErr) {
              console.log(`Error loading shifts for job ${job.id}:`, sErr);
              return [];
            }
          })
        );
        const allShifts = shiftResults.flat();

        let baseShifts = allShifts;

        if (user && user.role === 'student') {
          try {
            const appsRes = await getMyApplications(user.id);
            const apps = Array.isArray(appsRes) ? appsRes : (Array.isArray(appsRes?.data) ? appsRes.data : (appsRes?.items || appsRes?.Items || appsRes?.data?.items || appsRes?.data?.Items || []));
            baseShifts = baseShifts.map(shift => {
              const app = apps.find(a => {
                const aShiftId = a.shiftId !== undefined ? a.shiftId : a.ShiftId;
                const aJobShiftId = a.jobShiftId !== undefined ? a.jobShiftId : a.JobShiftId;
                return aShiftId === shift.id || aJobShiftId === shift.id;
              });
              if (app) {
                let status = 'applied';
                const appStatus = app.status !== undefined ? app.status : app.Status;
                const appId = app.id !== undefined ? app.id : app.Id;
                if (appStatus === 'Approved') status = 'approved';
                else if (appStatus === 'Rejected') status = 'available';
                else if (appStatus === 'Completed') status = 'completed';

                // Let other state logic handle checkin status if needed
                return { ...shift, status, applicationId: appId };
              }
              return shift;
            });

            // Fetch manually assigned schedules for the student
            const today = new Date();
            const fromDateObj = new Date(today);
            fromDateObj.setDate(today.getDate() - 30);
            const toDateObj = new Date(today);
            toDateObj.setDate(today.getDate() + 90);

            const formatDateStr = (d) => {
              return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
            };

            const fromDate = formatDateStr(fromDateObj);
            const toDate = formatDateStr(toDateObj);

            try {
              const myScheds = await getMySchedules(fromDate, toDate);
              const scheds = Array.isArray(myScheds) ? myScheds : (Array.isArray(myScheds?.data) ? myScheds.data : (myScheds?.items || myScheds?.Items || []));

              for (const sched of scheds) {
                const sId = sched.id !== undefined ? sched.id : sched.Id;
                const sJobShiftId = sched.jobShiftId !== undefined ? sched.jobShiftId : sched.JobShiftId;
                const sJobShiftSalary = sched.jobShiftSalary !== undefined ? sched.jobShiftSalary : sched.JobShiftSalary;
                const sStartTime = sched.startTime !== undefined ? sched.startTime : sched.StartTime;
                const sEndTime = sched.endTime !== undefined ? sched.endTime : sched.EndTime;
                const sNote = sched.note !== undefined ? sched.note : sched.Note;
                const sActualCheckInTime = sched.actualCheckInTime !== undefined ? sched.actualCheckInTime : sched.ActualCheckInTime;
                const sActualCheckOutTime = sched.actualCheckOutTime !== undefined ? sched.actualCheckOutTime : sched.ActualCheckOutTime;
                const sTimekeepingId = sched.timekeepingId !== undefined ? sched.timekeepingId : sched.TimekeepingId;
                const sBusinessId = sched.businessId !== undefined ? sched.businessId : sched.BusinessId;

                const hasTimekeeping = !!sTimekeepingId;
                const isCheckedIn = hasTimekeeping && !!sActualCheckInTime && !sActualCheckOutTime;
                const isCheckedOut = hasTimekeeping && !!sActualCheckOutTime;

                // If it is generated from an approved application, we already have it in baseShifts (matched by JobShiftId)
                if (sJobShiftId && baseShifts.some(shift => shift.id === sJobShiftId)) {
                  const existing = baseShifts.find(shift => shift.id === sJobShiftId);
                  if (existing) {
                    // Update actual scheduled times in case the employer re-assigned or customized the shift time!
                    existing.startTime = sStartTime;
                    existing.endTime = sEndTime;
                    existing.date = formatDateVN(sStartTime);
                    existing.time = `${formatTimeVN(sStartTime)} - ${formatTimeVN(sEndTime)}`;

                    if (isCheckedIn) {
                      existing.status = 'checkin_active';
                      existing.timekeepingId = sTimekeepingId;
                      existing.checkInTime = sActualCheckInTime ? new Date(sActualCheckInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
                      existing.actualCheckInTime = sActualCheckInTime;
                    } else if (isCheckedOut) {
                      existing.status = 'completed';
                      existing.timekeepingId = sTimekeepingId;
                    } else {
                      if (existing.status !== 'checkin_active' && existing.status !== 'completed') {
                        existing.status = 'approved';
                      }
                    }
                  }
                  continue;
                }

                // If not in baseShifts, it is a custom manual schedule. Let's create a virtual shift!
                let slotName = 'Ca làm việc';
                if (sNote === 'morning') slotName = 'Ca Sáng';
                else if (sNote === 'afternoon') slotName = 'Ca Chiều';
                else if (sNote === 'evening') slotName = 'Ca Tối';
                else if (sNote && sNote.startsWith('custom_')) slotName = 'Ca Tự Chọn';
                else if (sNote) slotName = sNote;

                let title = `Lịch phân công: ${slotName}`;

                // Try to resolve the shopName and address by finding a job created by this business/employer
                let shopName = 'Cửa hàng đối tác';
                let address = 'Tại địa chỉ quán';
                let latitude = 10.8261;
                let longitude = 106.6297;

                const matchingJob = jobPosts.find(j => Number(j.businessId) === Number(sBusinessId));
                if (matchingJob) {
                  title = matchingJob.title;
                  shopName = matchingJob.categoryName || 'Cửa hàng';
                  address = matchingJob.address || matchingJob.location?.address || '';
                  latitude = matchingJob.latitude || matchingJob.location?.latitude || latitude;
                  longitude = matchingJob.longitude || matchingJob.location?.longitude || longitude;
                }

                let status = 'approved';
                if (isCheckedIn) status = 'checkin_active';
                else if (isCheckedOut) status = 'completed';

                baseShifts.push({
                  id: `sched_${sId}`, // virtual id to avoid overlaps
                  jobPostId: null,
                  startTime: sStartTime,
                  endTime: sEndTime,
                  title,
                  categoryName: matchingJob ? matchingJob.categoryName : 'Cửa hàng',
                  shopName,
                  hourlyRate: sJobShiftSalary || 28000,
                  latitude,
                  longitude,
                  address,
                  date: formatDateVN(sStartTime),
                  time: `${formatTimeVN(sStartTime)} - ${formatTimeVN(sEndTime)}`,
                  description: `Ca làm việc theo phân lịch của quán ngày ${formatDateVN(sStartTime)}.`,
                  requirements: 'Vui lòng đến đúng giờ.',
                  rating: 5.0,
                  reviewsCount: 1,
                  status: status,
                  timekeepingId: sTimekeepingId || null,
                  checkInTime: (isCheckedIn && sActualCheckInTime) ? new Date(sActualCheckInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
                  actualCheckInTime: isCheckedIn ? sActualCheckInTime : null,
                  isEmergency: false,
                  auditFields: {
                    createdBy: 'System',
                    updatedBy: 'System',
                    deletedBy: ''
                  }
                });
              }
            } catch (schedErr) {
              console.log('Error merging student schedules in useShiftsQuery:', schedErr);
            }

          } catch (appErr) {
            console.log('Error merging applications inside useShiftsQuery:', appErr);
          }
        }
        return baseShifts;
      } catch (err) {
        console.log('Error loading published shifts:', err);
        return [];
      }
    },
    enabled: true,
    staleTime: 30 * 1000, // 30 seconds - show cached data instantly while refetching in background
    gcTime: 5 * 60 * 1000,    // 5 minutes garbage collection time
  });
};

export const useEmployerJobsQuery = (user) => {
  return useQuery({
    queryKey: ['employerJobs', user?.id],
    queryFn: async () => {
      if (!user || user.role !== 'employer') return { employerJobs: [], leaveRequests: [] };
      try {
        const [empsRes, jobsRes] = await Promise.all([
          getEmployees().catch(err => {
            console.log('Error loading employees in query:', err);
            return [];
          }),
          getJobPostsByBusiness(user.id).catch(err => {
            console.log('Error loading jobs in query:', err);
            return [];
          })
        ]);

        const empsList = Array.isArray(empsRes) ? empsRes : (Array.isArray(empsRes?.data) ? empsRes.data : (empsRes?.items || empsRes?.data?.items || []));
        const list = Array.isArray(jobsRes) ? jobsRes : (Array.isArray(jobsRes?.data) ? jobsRes.data : (jobsRes?.items || jobsRes?.data?.items || []));

        const allShifts = [];
        const dbLeaveRequests = [];

        const shiftsPromises = list.map(async (job) => {
          try {
            const jobShiftsRes = await fetchJobShiftsWithCache(job.id);
            const jobShifts = Array.isArray(jobShiftsRes) ? jobShiftsRes : (Array.isArray(jobShiftsRes?.data) ? jobShiftsRes.data : (jobShiftsRes?.items || jobShiftsRes?.data?.items || []));

            const appsPromises = jobShifts.map(async (s) => {
              let applicantCount = 0;
              let currentStatus = 'available';

              try {
                const appsRes = await getApplicationsByShift(s.id, user.id);
                const appsList = Array.isArray(appsRes) ? appsRes : (Array.isArray(appsRes?.data) ? appsRes.data : (appsRes?.items || appsRes?.data?.items || []));

                const activeApps = appsList.filter(a => a.status !== 'Cancelled' && a.status !== 'CancelledApproved' && a.status !== 'CancelledRejected' && a.status !== 'Rejected');
                applicantCount = activeApps.length;

                const cancelledApps = appsList.filter(a => a.status === 'Cancelled' || a.status === 'CancelledApproved' || a.status === 'CancelledRejected');
                cancelledApps.forEach(a => {
                  const emp = empsList.find(e => e.userId === a.studentId || e.user_id === a.studentId || e.id === a.studentId);
                  const staffName = emp ? (emp.fullName || emp.name || emp.FullName) : `Sinh viên #${a.studentId}`;
                  const position = emp ? (emp.position || emp.role || emp.Position || 'Nhân viên') : 'Nhân viên';

                  const reason = a.introduction || 'Yêu cầu hủy ca làm việc / xin nghỉ phép';
                  const isSwap = reason.toLowerCase().includes('đổi') || reason.toLowerCase().includes('chuyển') || reason.toLowerCase().includes('sang') || reason.toLowerCase().includes('ca');
                  const requestType = isSwap ? 'swap' : 'leave';
                  const shiftTime = `${formatTimeVN(s.startTime)} - ${formatTimeVN(s.endTime)}`;

                  let localStatus = 'pending';
                  if (a.status === 'CancelledApproved') {
                    localStatus = 'approved';
                  } else if (a.status === 'CancelledRejected') {
                    localStatus = 'rejected';
                  }

                  dbLeaveRequests.push({
                    id: a.id,
                    staffName: staffName,
                    position: position,
                    type: requestType,
                    shiftDate: formatDateVN(s.startTime),
                    shiftTime: shiftTime,
                    jobTitle: job.title,
                    reason: reason,
                    status: localStatus
                  });
                });

                const hasCheckIn = activeApps.some(a => a.status === 'CheckedIn' || a.status === 'CheckIn');
                const hasApproved = activeApps.some(a => a.status === 'Approved');
                const hasCompleted = activeApps.every(a => a.status === 'Completed') && activeApps.length > 0;

                if (hasCompleted) {
                  currentStatus = 'completed';
                } else if (hasCheckIn) {
                  currentStatus = 'checkin_active';
                } else if (hasApproved) {
                  currentStatus = 'approved';
                }
              } catch (aErr) {
                console.log(`Error loading applications for shift ${s.id}:`, aErr);
              }

              let applicantName = '';
              let applicantSchool = '';
              let applicantAvatar = '';
              let applicantRating = 5.0;
              let applicantShiftsCount = 0;
              let applicationId = null;
              let applicantMajor = '';
              let applicantYearOfStudy = 1;
              let applicantBio = '';
              let applicantSkills = '';

              try {
                const appsRes = await getApplicationsByShift(s.id, user.id);
                const appsList = Array.isArray(appsRes) ? appsRes : (Array.isArray(appsRes?.data) ? appsRes.data : (appsRes?.items || appsRes?.data?.items || []));
                const activeApps = appsList.filter(a => a.status !== 'Cancelled' && a.status !== 'CancelledApproved' && a.status !== 'CancelledRejected' && a.status !== 'Rejected');
                if (activeApps.length > 0) {
                  const app = activeApps[0];
                  applicationId = app.id;
                  applicantName = app.studentName || '';
                  applicantSchool = app.studentSchool || '';
                  applicantAvatar = app.studentAvatarUrl || '';
                  applicantRating = app.studentReputationScore || 5.0;
                  applicantShiftsCount = app.studentReviewCount || 0;
                  applicantMajor = app.studentMajor || '';
                  applicantYearOfStudy = app.studentYearOfStudy || 1;
                  applicantBio = app.studentBio || '';
                  applicantSkills = app.studentSkills || '';

                  if (currentStatus === 'available') {
                    currentStatus = 'applied';
                  }
                }
              } catch (err) {
                console.log('Error populating applicant details:', err);
              }

              allShifts.push({
                id: s.id,
                jobPostId: job.id,
                title: job.title,
                categoryName: job.categoryName,
                shopName: job.categoryName || 'Cửa hàng',
                hourlyRate: s.salary,
                latitude: job.latitude || job.location?.latitude || 0,
                longitude: job.longitude || job.location?.longitude || 0,
                address: job.address || job.location?.address || job.shopAddress || job.locationAddress || '',
                date: formatDateVN(s.startTime),
                time: `${formatTimeVN(s.startTime)} - ${formatTimeVN(s.endTime)}`,
                description: '',
                requirements: '',
                rating: 5.0,
                reviewsCount: 0,
                status: currentStatus,
                isEmergency: checkIsEmergency(job.title, job.description),
                applicantCount,
                applicantName,
                applicantSchool,
                applicantAvatar,
                applicantRating,
                applicantShiftsCount,
                applicationId,
                applicantMajor,
                applicantYearOfStudy,
                applicantBio,
                applicantSkills,
                createdAt: job.createdAt || job.CreatedAt || s.startTime,
                auditFields: {
                  createdBy: 'System',
                  updatedBy: 'System',
                  deletedBy: ''
                }
              });
            });

            await Promise.all(appsPromises);
          } catch (sErr) {
            console.log(`Error loading shifts for employer job ${job.id}:`, sErr);
          }
        });

        await Promise.all(shiftsPromises);

        return {
          employerJobs: list,
          shifts: allShifts,
          leaveRequests: dbLeaveRequests
        };
      } catch (err) {
        console.log('Error loading employer jobs query:', err);
        return { employerJobs: [], shifts: [], leaveRequests: [] };
      }
    },
    enabled: !!user && user.role === 'employer',
    staleTime: 0,
    gcTime: 5 * 60 * 1000,    // 5 minutes garbage collection time
  });
};

// ==========================================
// 2. QUERIES FOR MANAGEMENT / HRM / PAYROLL
// ==========================================

export const useStaffListQuery = (user) => {
  return useQuery({
    queryKey: ['staffList', user?.id],
    queryFn: async () => {
      if (!user || user.role !== 'employer') return [];
      try {
        const res = await getEmployees();
        const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.items || res?.data?.items || []));
        const formattedList = await Promise.all(list.map(async emp => {
          let avatarUrl = '';
          let gender = '';
          if (emp.userId) {
            try {
              const profileRes = await fetch(`${IDENTITY_API_BASE_URL}/public/students/${emp.userId}/cv`);
              if (profileRes.ok) {
                const profileData = await profileRes.json();
                const profile = profileData.data || profileData;
                avatarUrl = profile.avatarUrl || '';
                gender = profile.gender || '';
              }
            } catch (err) {
              console.log(`Error fetching student profile for userId ${emp.userId}:`, err);
            }
          }
          return {
            id: emp.id,
            userId: emp.userId,
            name: emp.fullName,
            role: emp.position || 'Nhân viên',
            phone: emp.phoneNumber || 'Không có',
            status: emp.status === 0 || emp.status === 'Active' ? 'idle' : 'terminated',
            isExternal: emp.isExternal,
            hourlyRate: emp.hourlyRate || 30000,
            shiftsCount: emp.shiftsCount || 0,
            avatarUrl,
            gender
          };
        }));
        return formattedList;
      } catch (err) {
        console.log('Error loading staff list query:', err);
        return [];
      }
    },
    enabled: !!user && user.role === 'employer',
    staleTime: 0,
    gcTime: 5 * 60 * 1000,    // 5 minutes garbage collection
  });
};

export const useAttendanceLogsQuery = (user) => {
  return useQuery({
    queryKey: ['attendanceLogs', user?.id],
    queryFn: async () => {
      if (!user || user.role !== 'employer') return [];
      try {
        const localDate = new Date();
        const yyyy = localDate.getFullYear();
        const mm = String(localDate.getMonth() + 1).padStart(2, '0');
        const dd = String(localDate.getDate()).padStart(2, '0');
        const today = `${yyyy}-${mm}-${dd}`;

        const res = await getTimekeepingLogs(today);
        const logs = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.items || res?.data?.items || []));
        return logs.map(log => ({
          id: log.id,
          employeeId: log.employeeId || log.EmployeeId || null,
          shiftId: log.workScheduleId,
          jobShiftId: log.jobShiftId !== undefined ? log.jobShiftId : log.JobShiftId || null,
          studentName: log.employeeName || 'Sinh viên',
          shopName: user.name,
          jobTitle: log.position || 'Nhân viên',
          shiftName: log.shiftName,
          checkInTime: log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString('vi-VN') : null,
          checkOutTime: log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString('vi-VN') : null,
          status: log.status === 'Suspicious' ? 'suspicious' :
            log.status === 'NotCheckedIn' ? 'not_checked_in' :
              log.status === 'Absent' ? 'absent' :
                (log.checkOutTime ? 'completed' : 'working'),
          date: log.date || new Date().toLocaleDateString('vi-VN'),
          photo: log.checkInPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
          gpsStatus: log.status === 'Suspicious' ? 'Nghi vấn GPS' : 'Hợp lệ',
          studentPhone: log.studentPhone
        }));
      } catch (err) {
        console.log('Error loading attendance logs query:', err);
        return [];
      }
    },
    enabled: !!user && user.role === 'employer',
    staleTime: 0,
    gcTime: 5 * 60 * 1000,    // 5 minutes garbage collection
  });
};

export const usePayrollsQuery = (user, status = '') => {
  return useQuery({
    queryKey: ['payrolls', user?.id, status],
    queryFn: async () => {
      if (!user) return [];
      try {
        if (user.role === 'employer') {
          const res = await getPayrolls(status);
          return Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.items || res?.data?.items || []));
        } else {
          const res = await getStudentPayrolls(status);
          return Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.items || res?.data?.items || []));
        }
      } catch (err) {
        console.log('Error loading payrolls query:', err);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,    // 5 minutes garbage collection
  });
};

export const useSchedulesQuery = (dateStr) => {
  return useQuery({
    queryKey: ['schedules', dateStr],
    queryFn: async () => {
      try {
        const res = await getSchedules(dateStr);
        return res || [];
      } catch (err) {
        console.log('Error loading schedules query:', err);
        return [];
      }
    },
    enabled: !!dateStr,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,    // 5 minutes garbage collection
  });
};

// ==========================================
// 3. MUTATIONS (SHIFTS & APPLICATIONS)
// ==========================================

export const useApplyMutation = (user, showToast, addNotification) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftId, introduction = 'Tôi muốn ứng tuyển.' }) => {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      return applyToShiftApi(shiftId, user.id, introduction, user.name);
    },
    onSuccess: (data, variables) => {
      clearJobShiftsCache();
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      showToast('Ứng tuyển thành công!', 'success');
      if (addNotification) {
        addNotification('Ứng tuyển', 'Bạn đã ứng tuyển thành công. Đang chờ duyệt!');
      }
    },
    onError: (err) => {
      showToast('Ứng tuyển thất bại: ' + translateError(err), 'error');
    }
  });
};

export const useCheckInMutation = (user, showToast, addNotification) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftId, qrToken, latitude, longitude, photoUrl = '', targetLatitude, targetLongitude }) => {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      return checkInShiftApi({
        qrToken,
        latitude,
        longitude,
        checkInPhoto: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
        userId: user.id,
        createdBy: user.name,
        targetLatitude,
        targetLongitude
      });
    },
    onSuccess: (data, variables) => {
      clearJobShiftsCache();
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      showToast('Check-in ca làm thành công!', 'success');
      if (addNotification) {
        addNotification('Check-in', `Đã điểm danh vào ca làm lúc ${new Date().toLocaleTimeString('vi-VN')}.`);
      }
    },
    onError: (err) => {
      showToast('Check-in thất bại: ' + translateError(err), 'error');
    }
  });
};

export const useCheckOutMutation = (user, showToast, addNotification) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ timekeepingId, latitude, longitude, photoUrl = '' }) => {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      if (!timekeepingId) throw new Error('Không tìm thấy ca làm đang check-in.');
      return checkOutShiftApi({
        timekeepingId,
        latitude,
        longitude,
        checkOutPhoto: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
        userId: user.id,
        updatedBy: user.name
      });
    },
    onSuccess: (data, variables) => {
      clearJobShiftsCache();
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      showToast('Check-out thành công!', 'success');
      if (addNotification) {
        addNotification('Check-out', 'Đã check-out ca làm thành công!');
      }
    },
    onError: (err) => {
      showToast('Check-out thất bại: ' + translateError(err), 'error');
    }
  });
};

export const useCreateEmergencyShiftMutation = (user, showToast, addNotification, STUDENT_MOCK_GPS) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, shopName, hourlyRate, time }) => {
      if (!user) throw new Error('Vui lòng đăng nhập.');

      let startTime = new Date();
      let endTime = new Date();
      try {
        const parts = time.split(' - ');
        if (parts.length === 2) {
          const startParts = parts[0].split(':');
          const endParts = parts[1].split(':');
          startTime.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);
          endTime.setHours(parseInt(endParts[0], 10), parseInt(endParts[1], 10), 0, 0);
          if (endTime < startTime) {
            endTime.setDate(endTime.getDate() + 1);
          }
        } else {
          startTime.setHours(18, 0, 0, 0);
          endTime.setHours(22, 0, 0, 0);
        }
      } catch (e) {
        startTime.setHours(18, 0, 0, 0);
        endTime.setHours(22, 0, 0, 0);
      }

      const jobPostRes = await createJobPost({
        businessId: user.id,
        title: `${title} (KHẨN CẤP)`,
        description: `Ca làm việc tuyển gấp khẩn cấp. Mức lương cao hơn 30% so với ngày thường. Nhận việc ngay không cần phỏng vấn. Yêu cầu có mặt sau 30 phút.`,
        requirements: 'Đã có kinh nghiệm, chủ động công việc, có trách nhiệm.',
        categoryId: 1,
        location: {
          address: 'Quận 1, TP.HCM',
          latitude: STUDENT_MOCK_GPS?.latitude || 10.7769,
          longitude: STUDENT_MOCK_GPS?.longitude || 106.7009
        },
        skillIds: [],
        createdBy: user.name
      });
      const jobPostId = jobPostRes?.data || jobPostRes?.id || jobPostRes;

      await createJobShift(jobPostId, {
        businessId: user.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        salary: parseInt(hourlyRate, 10),
        slots: 1,
        createdBy: user.name
      });

      await publishJobPost(jobPostId, user.id, user.name);
      return { title, shopName };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      showToast('Đăng ca khẩn cấp thành công!', 'warning');
      if (addNotification) {
        addNotification('TIN TUYỂN GẤP', `Ca khẩn cấp "${data.title}" tại ${data.shopName} vừa được đăng với lương hấp dẫn!`, 'Vừa xong');
      }
    },
    onError: (err) => {
      showToast('Đăng ca khẩn cấp thất bại: ' + translateError(err), 'error');
    }
  });
};

export const useCreateJobPostWizardMutation = (user, showToast, addNotification, STUDENT_MOCK_GPS) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      if (!user) throw new Error('Vui lòng đăng nhập.');

      const {
        title,
        description,
        requirements,
        categoryId,
        salary,
        skillNames,
        address,
        latitude,
        longitude,
        date,
        startTime,
        endTime,
        isEmergency
      } = data;

      let startIso = new Date();
      let endIso = new Date();

      if (date && startTime && endTime) {
        const startParts = startTime.split(':');
        const endParts = endTime.split(':');
        const [year, month, day] = date.split('-').map(Number);

        startIso = new Date(Date.UTC(year, month - 1, day, parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0));
        startIso.setUTCHours(startIso.getUTCHours() - 7);
        endIso = new Date(Date.UTC(year, month - 1, day, parseInt(endParts[0], 10), parseInt(endParts[1], 10), 0));
        endIso.setUTCHours(endIso.getUTCHours() - 7);

        if (endIso < startIso) {
          endIso.setUTCDate(endIso.getUTCDate() + 1);
        }
      }

      const jobPostRes = await createJobPost({
        businessId: user.id,
        title: isEmergency ? `${title} (KHẨN CẤP)` : title,
        description: isEmergency ? `${description} (Tuyển gấp khẩn cấp)` : description,
        requirements,
        categoryId: parseInt(categoryId, 10),
        location: {
          address,
          latitude: parseFloat(latitude) || STUDENT_MOCK_GPS?.latitude || 10.7769,
          longitude: parseFloat(longitude) || STUDENT_MOCK_GPS?.longitude || 106.7009
        },
        skillNames: skillNames || [],
        createdBy: user.name
      });

      const jobPostId = jobPostRes?.data || jobPostRes?.id || jobPostRes;

      await createJobShift(jobPostId, {
        businessId: user.id,
        startTime: startIso.toISOString(),
        endTime: endIso.toISOString(),
        salary: parseInt(salary, 10),
        slots: 1,
        createdBy: user.name
      });

      await publishJobPost(jobPostId, user.id, user.name);
      return { title, isEmergency };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      showToast(data.isEmergency ? 'Đăng ca khẩn cấp thành công!' : 'Đăng bài tuyển dụng thành công!', 'success');
      if (addNotification) {
        addNotification(
          data.isEmergency ? 'TIN TUYỂN GẤP' : 'TIN TUYỂN DỤNG',
          `Bài đăng "${data.title}" đã được đẩy lên hệ thống!`,
          'Vừa xong'
        );
      }
    },
    onError: (err) => {
      showToast('Đăng bài thất bại: ' + translateError(err), 'error');
    }
  });
};

export const useUpdateJobPostWizardMutation = (user, showToast, STUDENT_MOCK_GPS) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobPostId, data }) => {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      const {
        title,
        description,
        requirements,
        categoryId,
        address,
        latitude,
        longitude,
        skillNames
      } = data;

      return updateJobPostApi(jobPostId, {
        id: jobPostId,
        businessId: user.id,
        title,
        description,
        requirements,
        categoryId: parseInt(categoryId, 10),
        location: {
          address,
          latitude: parseFloat(latitude) || STUDENT_MOCK_GPS?.latitude || 10.7769,
          longitude: parseFloat(longitude) || STUDENT_MOCK_GPS?.longitude || 106.7009
        },
        skillNames: skillNames || [],
        updatedBy: user.name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      showToast('Cập nhật bài đăng thành công!', 'success');
    },
    onError: (err) => {
      showToast('Cập nhật thất bại: ' + translateError(err), 'error');
    }
  });
};

export const useDeleteJobPostMutation = (user, showToast) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobPostId) => {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      return deleteJobPostApi(jobPostId, user.id, user.name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      showToast('Đã xóa bài đăng thành công!', 'info');
    },
    onError: (err) => {
      showToast('Xóa bài đăng thất bại: ' + translateError(err), 'error');
    }
  });
};

export const useApproveApplicationMutation = (user, showToast) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId) => {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      return approveApplication(applicationId, user.id, user.name);
    },
    onSuccess: () => {
      clearJobShiftsCache();
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      showToast('Đã duyệt đơn ứng tuyển!', 'success');
    },
    onError: (err) => {
      showToast('Duyệt đơn thất bại: ' + translateError(err), 'error');
    }
  });
};

export const useRejectApplicationMutation = (user, showToast) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId) => {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      return rejectApplication(applicationId, user.id, user.name);
    },
    onSuccess: () => {
      clearJobShiftsCache();
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      showToast('Đã từ chối đơn ứng tuyển.', 'info');
    },
    onError: (err) => {
      showToast('Từ chối đơn thất bại: ' + translateError(err), 'error');
    }
  });
};

// ==========================================
// 4. MUTATIONS (HRM / PAYROLL / SCHEDULE)
// ==========================================

export const useAddStaffMemberMutation = (user, showToast) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, role, phone }) => {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      return createEmployee({
        businessId: user.id,
        fullName: name,
        position: role,
        phoneNumber: phone,
        isExternal: false,
        paymentType: 0,
        hourlyRate: 30000,
        createdBy: user.name
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      showToast(`Đã thêm nhân viên ${variables.name} vào hệ thống!`, 'success');
    },
    onError: (err) => {
      showToast('Thêm nhân viên thất bại: ' + translateError(err), 'error');
    }
  });
};

export const useRemoveStaffMemberMutation = (user, showToast) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      return deleteEmployee(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      showToast(`Xóa nhân viên thành công!`, 'info');
    },
    onError: (err) => {
      showToast('Xóa nhân viên thất bại: ' + translateError(err), 'error');
    }
  });
};

export const useUpdateStaffMemberMutation = (user, showToast) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, role, phone }) => {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      return updateEmployee(id, {
        fullName: name,
        position: role,
        phoneNumber: phone,
        paymentType: 0,
        hourlyRate: 30000
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      showToast(`Đã cập nhật thông tin nhân viên ${variables.name}!`, 'success');
    },
    onError: (err) => {
      showToast('Cập nhật nhân viên thất bại: ' + translateError(err), 'error');
    }
  });
};

export const useAddEmployeeScheduleMutation = (user, showToast) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, dateStr, slotId, startTimeStr, endTimeStr }) => {
      return createSchedule(employeeId, {
        date: dateStr,
        startTime: startTimeStr,
        endTime: endTimeStr,
        note: slotId
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.dateStr] });
      showToast('Phân ca thành công!', 'success');
    },
    onError: (err) => {
      showToast('Lỗi phân ca: ' + translateError(err), 'error');
    }
  });
};

export const useRemoveEmployeeScheduleMutation = (user, showToast) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ scheduleId, dateStr }) => {
      return deleteSchedule(scheduleId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.dateStr] });
      showToast('Đã xoá phân ca!', 'info');
    },
    onError: (err) => {
      showToast('Xoá phân ca thất bại: ' + translateError(err), 'error');
    }
  });
};

export const useCalculatePayrollMutation = (user, showToast) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (employeeId) => {
      return calculatePayroll({
        employeeId,
        businessId: user.id,
        createdBy: user.name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      showToast('Kết toán lương ca làm thành công!', 'success');
    },
    onError: (err) => {
      showToast('Lỗi kết toán: ' + err.message, 'error');
    }
  });
};

export const useApprovePayrollMutation = (user, showToast) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ payrollId, transactionPhoto }) => {
      return approvePayroll(payrollId, {
        businessId: user?.id,
        updatedBy: user?.name || 'System',
        transactionPhoto
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceLogs'] });
      showToast('Thanh toán lương thành công!', 'success');
    },
    onError: (err) => {
      showToast('Thanh toán lỗi: ' + err.message, 'error');
    }
  });
};

export const useHandleLeaveRequestMutation = (user, showToast) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, status }) => {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      if (status === 'approved') {
        await approveApplication(requestId, user.id, user.name);
      } else {
        await rejectApplication(requestId, user.id, user.name);
      }
      return { status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      if (data.status === 'approved') {
        showToast(`Đã chấp thuận yêu cầu xin nghỉ!`, 'success');
      } else {
        showToast(`Đã từ chối yêu cầu xin nghỉ!`, 'info');
      }
    },
    onError: (err) => {
      console.log('Error handling leave request:', err);
      showToast('Xử lý yêu cầu thất bại: ' + translateError(err), 'error');
    }
  });
};

export const useCurrentUserQuery = () => {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const token = await getStoredToken();
      if (!token) return null;
      try {
        return await checkAuthApi(token);
      } catch (err) {
        console.log('[useCurrentUserQuery] Check auth failed, returning stored user:', err.message);
        return await getStoredUser();
      }
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useConversationsQuery = (user) => {
  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const token = await getStoredToken();
      if (!token) return [];
      const response = await fetch(`${IDENTITY_API_BASE_URL}/messages/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to load conversations: ${response.status}`);
      }
      const data = await response.json();
      if (!data) return [];
      return data.map(c => ({
        id: c.userId.toString(),
        name: c.name,
        avatar: c.avatar,
        lastMessage: c.lastMessage,
        time: c.time,
        unread: c.unread,
        phone: c.phone || '0901234567',
        isMock: false,
        messages: []
      }));
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,    // 5 minutes garbage collection
  });
};

export const usePayrollAnalyticsQuery = (user, period = 'week') => {
  return useQuery({
    queryKey: ['payrollAnalytics', user?.id, period],
    queryFn: async () => {
      if (!user || user.role !== 'employer') return {
        totalDisbursedThisMonth: 0,
        pendingApprovalAmount: 0,
        activeEmployees: 0,
        chartData: { labels: [], datasets: [{ data: [] }] }
      };
      try {
        const res = await getPayrollAnalytics(period);
        return res || {
          totalDisbursedThisMonth: 0,
          pendingApprovalAmount: 0,
          activeEmployees: 0,
          chartData: { labels: [], datasets: [{ data: [] }] }
        };
      } catch (err) {
        console.log('Error loading payroll analytics query:', err);
        return {
          totalDisbursedThisMonth: 0,
          pendingApprovalAmount: 0,
          activeEmployees: 0,
          chartData: { labels: [], datasets: [{ data: [] }] }
        };
      }
    },
    enabled: !!user && user.role === 'employer',
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
};

export const useApproveInterimPayrollMutation = (user, showToast) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ payrollId, rating, comments, totalHours, finalAmount }) => {
      return approveInterimPayroll(payrollId, {
        businessId: user?.id,
        rating,
        comments,
        updatedBy: user?.name || 'System',
        totalHours,
        finalAmount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['payrollAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceLogs'] });
      showToast('Chốt bảng lương thành công!', 'success');
    },
    onError: (err) => {
      showToast('Chốt bảng lương lỗi: ' + err.message, 'error');
    }
  });
};

export const useConfirmReceiptPayrollMutation = (user, showToast) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ payrollId, rating, comments }) => {
      return confirmReceiptPayroll(payrollId, {
        userId: user?.id,
        rating,
        comments,
        updatedBy: user?.name || 'Student'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['payrollAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceLogs'] });
      showToast('Xác nhận nhận tiền thành công!', 'success');
    },
    onError: (err) => {
      showToast('Xác nhận lỗi: ' + err.message, 'error');
    }
  });
};
