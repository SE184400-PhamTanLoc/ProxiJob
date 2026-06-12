import { useState, useCallback, useEffect } from 'react';
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
  getJobPostsByBusiness
} from '../api/jobs';
import {
  checkInShiftApi,
  checkOutShiftApi,
  getEmployees
} from '../api/management';
import { translateError } from './useAuth';

const INITIAL_SHIFTS = [];
const INITIAL_LEAVE_REQUESTS = [];

export const useShifts = ({
  user,
  STUDENT_MOCK_GPS,
  showToast,
  addNotification,
  loadStaffListRef
}) => {
  const [shifts, setShifts] = useState(INITIAL_SHIFTS);
  const [activeShift, setActiveShift] = useState(null);
  const [employerJobs, setEmployerJobs] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState(INITIAL_LEAVE_REQUESTS);

  const loadShifts = useCallback(async () => {
    try {
      const res = await getPublishedJobs();
      const jobPosts = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.items || res?.data?.items || []));
      const allShifts = [];
      for (const job of jobPosts) {
        try {
          const jobShiftsRes = await getJobPostShifts(job.id);
          const jobShifts = Array.isArray(jobShiftsRes) ? jobShiftsRes : (Array.isArray(jobShiftsRes?.data) ? jobShiftsRes.data : (jobShiftsRes?.items || jobShiftsRes?.data?.items || []));
          for (const s of jobShifts) {
            allShifts.push({
              id: s.id,
              jobPostId: job.id,
              title: job.title,
              shopName: job.categoryName || 'Cửa hàng',
              hourlyRate: s.salary,
              latitude: job.latitude || job.location?.latitude || 0,
              longitude: job.longitude || job.location?.longitude || 0,
              address: job.address || job.location?.address || '',
              date: new Date(s.startTime).toLocaleDateString('vi-VN'),
              time: `${new Date(s.startTime).getHours().toString().padStart(2, '0')}:${new Date(s.startTime).getMinutes().toString().padStart(2, '0')} - ${new Date(s.endTime).getHours().toString().padStart(2, '0')}:${new Date(s.endTime).getMinutes().toString().padStart(2, '0')}`,
              description: job.description || '',
              requirements: job.requirements || '',
              rating: 5.0,
              reviewsCount: 1,
              status: s.remainingSlots <= 0 ? 'full' : 'available',
              isEmergency: (job.title || '').toLowerCase().includes('khẩn cấp') || (job.description || '').toLowerCase().includes('khẩn cấp'),
              auditFields: {
                createdBy: job.createdBy,
                updatedBy: job.createdBy,
                deletedBy: ''
              }
            });
          }
        } catch (sErr) {
          console.log(`Error loading shifts for job ${job.id}:`, sErr);
        }
      }

      let baseShifts = allShifts;

      if (user && user.role === 'student') {
        try {
          const appsRes = await getMyApplications(user.id);
          const apps = Array.isArray(appsRes) ? appsRes : (Array.isArray(appsRes?.data) ? appsRes.data : (appsRes?.items || appsRes?.data?.items || []));
          baseShifts = baseShifts.map(shift => {
            const app = apps.find(a => a.jobShiftId === shift.id);
            if (app) {
              let status = 'applied';
              if (app.status === 'Approved') status = 'approved';
              else if (app.status === 'Rejected') status = 'available';
              else if (app.status === 'Completed') status = 'completed';

              if (shift.status === 'checkin_active' && status === 'approved') {
                return shift;
              }
              return { ...shift, status, applicationId: app.id };
            }
            return shift;
          });
        } catch (appErr) {
          console.log('Error merging applications inside loadShifts:', appErr);
        }
      }

      setShifts(baseShifts);
    } catch (err) {
      console.log('Error loading published shifts:', err);
      setShifts([]);
    }
  }, [user, STUDENT_MOCK_GPS]);

  const loadMyApplications = useCallback(async (studentId) => {
    await loadShifts();
  }, [loadShifts]);

  const loadEmployerJobs = useCallback(async () => {
    if (!user || user.role !== 'employer') return;
    try {
      const [empsRes, jobsRes] = await Promise.all([
        getEmployees().catch(err => {
          console.log('Error loading employees in loadEmployerJobs:', err);
          return [];
        }),
        getJobPostsByBusiness(user.id).catch(err => {
          console.log('Error loading jobs in loadEmployerJobs:', err);
          return [];
        })
      ]);

      const empsList = Array.isArray(empsRes) ? empsRes : (Array.isArray(empsRes?.data) ? empsRes.data : (empsRes?.items || empsRes?.data?.items || []));
      const list = Array.isArray(jobsRes) ? jobsRes : (Array.isArray(jobsRes?.data) ? jobsRes.data : (jobsRes?.items || jobsRes?.data?.items || []));
      setEmployerJobs(list);

      const allShifts = [];
      const dbLeaveRequests = [];

      const shiftsPromises = list.map(async (job) => {
        try {
          const jobShiftsRes = await getJobPostShifts(job.id);
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
                const shiftTime = `${new Date(s.startTime).getHours().toString().padStart(2, '0')}:${new Date(s.startTime).getMinutes().toString().padStart(2, '0')} - ${new Date(s.endTime).getHours().toString().padStart(2, '0')}:${new Date(s.endTime).getMinutes().toString().padStart(2, '0')}`;

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
                  shiftDate: new Date(s.startTime).toLocaleDateString('vi-VN'),
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

            allShifts.push({
              id: s.id,
              jobPostId: job.id,
              title: job.title,
              shopName: job.categoryName || 'Cửa hàng',
              hourlyRate: s.salary,
              latitude: STUDENT_MOCK_GPS.latitude,
              longitude: STUDENT_MOCK_GPS.longitude,
              date: new Date(s.startTime).toLocaleDateString('vi-VN'),
              time: `${new Date(s.startTime).getHours().toString().padStart(2, '0')}:${new Date(s.startTime).getMinutes().toString().padStart(2, '0')} - ${new Date(s.endTime).getHours().toString().padStart(2, '0')}:${new Date(s.endTime).getMinutes().toString().padStart(2, '0')}`,
              description: '',
              requirements: '',
              rating: 5.0,
              reviewsCount: 0,
              status: currentStatus,
              isEmergency: (job.title || '').toLowerCase().includes('khẩn cấp'),
              applicantCount,
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

      setShifts(allShifts);
      setLeaveRequests(dbLeaveRequests);
    } catch (err) {
      console.log('Error loading employer jobs:', err);
    }
  }, [user, STUDENT_MOCK_GPS]);

  const applyToShift = useCallback(async (shiftId, introduction = 'Tôi muốn ứng tuyển.') => {
    try {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      await applyToShiftApi(shiftId, user.id, introduction, user.name);

      setShifts((prevShifts) =>
        prevShifts.map((shift) => {
          if (shift.id === shiftId) {
            addNotification('Ứng tuyển', `Bạn đã ứng tuyển thành công vào ca làm tại ${shift.shopName}. Đang chờ duyệt!`);
            showToast(`Ứng tuyển thành công tại ${shift.shopName}!`, 'success');
            return { ...shift, status: 'applied', auditFields: { ...shift.auditFields, updatedBy: user?.name || 'Student' } };
          }
          return shift;
        })
      );

      await loadMyApplications(user.id);
      return true;
    } catch (err) {
      console.log('Error applying to shift:', err.message);
      showToast('Ứng tuyển thất bại: ' + translateError(err), 'error');
      return false;
    }
  }, [user, showToast, addNotification, loadMyApplications]);

  const checkInShift = useCallback(async (shiftId, qrToken, latitude, longitude, photoUrl = '') => {
    try {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      const res = await checkInShiftApi({
        qrToken,
        latitude,
        longitude,
        checkInPhoto: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
        userId: user.id,
        createdBy: user.name
      });
      const timekeepingId = res?.data?.timekeepingId || res?.data?.TimekeepingId || res?.timekeepingId || res?.TimekeepingId;

      setShifts((prevShifts) =>
        prevShifts.map((shift) => {
          if (shift.id === shiftId) {
            const now = new Date();
            const checkInTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            const updatedShift = {
              ...shift,
              status: 'checkin_active',
              checkInTime,
              timekeepingId,
              auditFields: { ...shift.auditFields, updatedBy: user?.name || 'Student' }
            };
            setActiveShift(updatedShift);

            addNotification('Check-in', `Đã điểm danh vào ca làm tại ${shift.shopName} lúc ${checkInTime}. Chúc ca làm vui vẻ!`);
            showToast('Check-in ca làm thành công!', 'success');
            return updatedShift;
          }
          return shift;
        })
      );
      return true;
    } catch (err) {
      console.log('Check-in API failed:', err.message);
      showToast('Check-in thất bại: ' + translateError(err), 'error');
      return false;
    }
  }, [user, showToast, addNotification]);

  const checkOutShift = useCallback(async (shiftId, latitude, longitude, photoUrl = '') => {
    try {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      const targetShift = shifts.find(s => s.id === shiftId);
      const timekeepingId = targetShift?.timekeepingId || activeShift?.timekeepingId;

      if (!timekeepingId) throw new Error('Không tìm thấy ca làm đang check-in.');

      await checkOutShiftApi({
        timekeepingId,
        latitude,
        longitude,
        checkOutPhoto: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
        userId: user.id,
        updatedBy: user.name
      });

      setShifts((prevShifts) =>
        prevShifts.map((shift) => {
          if (shift.id === shiftId) {
            const now = new Date();
            const checkOutTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            const updatedShift = {
              ...shift,
              status: 'completed',
              checkOutTime,
              auditFields: { ...shift.auditFields, updatedBy: user?.name || 'Student' }
            };
            setActiveShift(null);

            addNotification('Check-out', `Đã điểm danh kết thúc ca làm tại ${shift.shopName} lúc ${checkOutTime}. Hệ thống đang kết toán lương!`);
            showToast('Check-out thành công!', 'success');
            return updatedShift;
          }
          return shift;
        })
      );
      return true;
    } catch (err) {
      console.log('Check-out API failed:', err.message);
      showToast('Check-out thất bại: ' + translateError(err), 'error');
      return false;
    }
  }, [user, shifts, activeShift, showToast, addNotification]);

  const createEmergencyShift = useCallback(async (title, shopName, hourlyRate, time, duration = '4 giờ') => {
    try {
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
          latitude: STUDENT_MOCK_GPS.latitude,
          longitude: STUDENT_MOCK_GPS.longitude
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

      showToast('Đăng ca khẩn cấp thành công!', 'warning');
      addNotification('TIN TUYỂN GẤP', `Ca khẩn cấp "${title}" tại ${shopName} vừa được đăng với lương hấp dẫn!`, 'Vừa xong');

      loadEmployerJobs();
      return true;
    } catch (err) {
      console.log('Error creating emergency shift:', err.message);
      showToast('Đăng ca khẩn cấp thất bại: ' + translateError(err), 'error');
      return false;
    }
  }, [user, STUDENT_MOCK_GPS, showToast, addNotification, loadEmployerJobs]);

  const createJobPostWizard = useCallback(async (data) => {
    try {
      if (!user) throw new Error('Vui lòng đăng nhập.');

      const {
        title,
        description,
        requirements,
        categoryId,
        salary,
        skillIds,
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
        endIso = new Date(Date.UTC(year, month - 1, day, parseInt(endParts[0], 10), parseInt(endParts[1], 10), 0));

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
          latitude: parseFloat(latitude) || STUDENT_MOCK_GPS.latitude,
          longitude: parseFloat(longitude) || STUDENT_MOCK_GPS.longitude
        },
        skillIds: skillIds.map(Number),
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

      showToast(isEmergency ? 'Đăng ca khẩn cấp thành công!' : 'Đăng bài tuyển dụng thành công!', 'success');
      addNotification(
        isEmergency ? 'TIN TUYỂN GẤP' : 'TIN TUYỂN DỤNG',
        `Bài đăng "${title}" đã được đẩy lên hệ thống!`,
        'Vừa xong'
      );

      loadEmployerJobs();
      return true;
    } catch (err) {
      console.log('Error creating job post via wizard:', err.message);
      showToast('Đăng bài thất bại: ' + translateError(err), 'error');
      return false;
    }
  }, [user, STUDENT_MOCK_GPS, showToast, addNotification, loadEmployerJobs]);

  const approveStudentApplication = useCallback(async (applicationId) => {
    try {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      await approveApplication(applicationId, user.id, user.name);
      showToast('Đã duyệt đơn ứng tuyển!', 'success');
      await loadEmployerJobs();
      if (loadStaffListRef && loadStaffListRef.current) {
        await loadStaffListRef.current();
      }
      return true;
    } catch (err) {
      console.log('Approve application API failed:', err.message);
      showToast('Duyệt đơn thất bại: ' + translateError(err), 'error');
      return false;
    }
  }, [user, showToast, loadEmployerJobs, loadStaffListRef]);

  const rejectStudentApplication = useCallback(async (applicationId) => {
    try {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      await rejectApplication(applicationId, user.id, user.name);
      showToast('Đã từ chối đơn ứng tuyển.', 'info');
      await loadEmployerJobs();
      return true;
    } catch (err) {
      console.log('Reject application API failed:', err.message);
      showToast('Từ chối đơn thất bại: ' + translateError(err), 'error');
      return false;
    }
  }, [user, showToast, loadEmployerJobs]);

  useEffect(() => {
    if (user) {
      if (user.role === 'student') {
        loadShifts();
      } else {
        loadEmployerJobs();
      }
    } else {
      setShifts(INITIAL_SHIFTS);
      setActiveShift(null);
      setEmployerJobs([]);
      setLeaveRequests(INITIAL_LEAVE_REQUESTS);
    }
  }, [user, loadShifts, loadEmployerJobs]);

  return {
    shifts,
    setShifts,
    activeShift,
    setActiveShift,
    employerJobs,
    setEmployerJobs,
    leaveRequests,
    setLeaveRequests,
    loadShifts,
    loadMyApplications,
    loadEmployerJobs,
    applyToShift,
    checkInShift,
    checkOutShift,
    createEmergencyShift,
    createJobPostWizard,
    approveStudentApplication,
    rejectStudentApplication
  };
};
