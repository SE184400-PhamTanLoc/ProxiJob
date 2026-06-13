import { useState, useCallback, useEffect } from 'react';
import {
  getEmployees,
  createEmployee,
  deleteEmployee,
  getTimekeepingLogs,
  getSchedules,
  createSchedule,
  deleteSchedule,
  getPayrolls,
  calculatePayroll,
  approvePayroll
} from '../api/management';
import { translateError } from './useAuth';

export const useManagement = ({
  user,
  showToast,
  approveStudentApplication,
  rejectStudentApplication
}) => {
  const [staffList, setStaffList] = useState([]);
  const [schedulesList, setSchedulesList] = useState([]);
  const [hrmSingleApplicants, setHrmSingleApplicants] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [payrolls, setPayrolls] = useState([]);

  const loadStaffList = useCallback(async () => {
    if (!user || user.role !== 'employer') return;
    try {
      const res = await getEmployees();
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.items || res?.data?.items || []));
      const formattedList = list.map(emp => ({
        id: emp.id,
        name: emp.fullName,
        role: emp.position || 'Nhân viên',
        phone: emp.phoneNumber || 'Không có',
        status: emp.status === 0 || emp.status === 'Active' ? 'idle' : 'terminated',
        isExternal: emp.isExternal,
        hourlyRate: emp.hourlyRate || 30000,
        shiftsCount: emp.shiftsCount || 0
      }));
      setStaffList(formattedList);

      const externalList = formattedList.filter(emp => emp.isExternal);
      setHrmSingleApplicants(externalList);
    } catch (err) {
      console.log('Error loading employees:', err);
      setStaffList([]);
      setHrmSingleApplicants([]);
    }
  }, [user]);

  const addStaffMember = useCallback(async (name, role, phone) => {
    try {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      await createEmployee({
        businessId: user.id,
        fullName: name,
        position: role,
        phoneNumber: phone,
        isExternal: false,
        paymentType: 0, // PerShift default
        hourlyRate: 30000,
        createdBy: user.name
      });
      showToast(`Đã thêm nhân viên ${name} vào hệ thống!`, 'success');
      await loadStaffList();
      return true;
    } catch (err) {
      console.log('Add staff API failed:', err.message);
      showToast('Thêm nhân viên thất bại: ' + translateError(err), 'error');
      return false;
    }
  }, [user, showToast, loadStaffList]);

  const removeStaffMember = useCallback(async (id) => {
    try {
      await deleteEmployee(id);
      showToast(`Xóa nhân viên thành công!`, 'info');
      await loadStaffList();
      return true;
    } catch (err) {
      console.log('Delete staff API failed:', err.message);
      showToast('Xóa nhân viên thất bại: ' + translateError(err), 'error');
      return false;
    }
  }, [showToast, loadStaffList]);

  const loadSchedules = useCallback(async (dateStr) => {
    try {
      const res = await getSchedules(dateStr);
      setSchedulesList(res || []);
    } catch (err) {
      console.log('Error loading schedules:', err);
      setSchedulesList([]);
    }
  }, []);

  const addEmployeeSchedule = useCallback(async (employeeId, dateStr, slotId, startTimeStr, endTimeStr) => {
    try {
      await createSchedule(employeeId, {
        date: dateStr,
        startTime: startTimeStr,
        endTime: endTimeStr,
        note: slotId
      });
      showToast('Phân ca thành công!', 'success');
      await loadSchedules(dateStr);
      return true;
    } catch (err) {
      console.log('Error creating schedule:', err);
      showToast('Lỗi phân ca: ' + translateError(err), 'error');
      return false;
    }
  }, [showToast, loadSchedules]);

  const removeEmployeeSchedule = useCallback(async (scheduleId, dateStr) => {
    try {
      await deleteSchedule(scheduleId);
      showToast('Đã xoá phân ca!', 'info');
      await loadSchedules(dateStr);
      return true;
    } catch (err) {
      console.log('Error deleting schedule:', err);
      showToast('Xoá phân ca thất bại: ' + translateError(err), 'error');
      return false;
    }
  }, [showToast, loadSchedules]);

  const loadAttendanceLogs = useCallback(async () => {
    if (!user || user.role !== 'employer') return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await getTimekeepingLogs(today);
      const logs = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.items || res?.data?.items || []));
      const formattedLogs = logs.map(log => ({
        id: log.id,
        shiftId: log.workScheduleId,
        studentName: log.employeeName || 'Sinh viên',
        shopName: user.name,
        jobTitle: log.position || 'Nhân viên',
        checkInTime: log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString('vi-VN') : null,
        checkOutTime: log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString('vi-VN') : null,
        status: log.status === 'Suspicious' ? 'suspicious' : (log.checkOutTime ? 'completed' : 'working'),
        date: log.date || new Date().toLocaleDateString('vi-VN'),
        photo: log.checkInPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
        gpsStatus: log.status === 'Suspicious' ? 'Nghi vấn GPS' : 'Hợp lệ'
      }));
      setAttendanceLogs(formattedLogs);
    } catch (err) {
      console.log('Error loading attendance logs:', err);
    }
  }, [user]);

  const loadPayrolls = useCallback(async () => {
    if (!user || user.role !== 'employer') return;
    try {
      const res = await getPayrolls();
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.items || res?.data?.items || []));
      setPayrolls(list);
    } catch (err) {
      console.log('Error loading payrolls:', err);
    }
  }, [user]);

  const runCalculatePayroll = useCallback(async (employeeId) => {
    try {
      await calculatePayroll({
        employeeId,
        businessId: user.id,
        createdBy: user.name
      });
      showToast('Kết toán lương ca làm thành công!', 'success');
      await loadPayrolls();
      return true;
    } catch (err) {
      showToast('Lỗi kết toán: ' + err.message, 'error');
      return false;
    }
  }, [user, showToast, loadPayrolls]);

  const runApprovePayroll = useCallback(async (payrollId) => {
    try {
      await approvePayroll(payrollId, {
        businessId: user.id,
        updatedBy: user.name
      });
      showToast('Thanh toán lương thành công!', 'success');
      await loadPayrolls();
      return true;
    } catch (err) {
      showToast('Thanh toán lỗi: ' + err.message, 'error');
      return false;
    }
  }, [user, showToast, loadPayrolls]);

  const handleLeaveRequest = useCallback(async (requestId, status) => {
    try {
      if (status === 'approved') {
        const success = await approveStudentApplication(requestId);
        if (success) {
          showToast(`Đã chấp thuận yêu cầu xin nghỉ!`, 'success');
        }
      } else {
        const success = await rejectStudentApplication(requestId);
        if (success) {
          showToast(`Đã từ chối yêu cầu xin nghỉ!`, 'info');
        }
      }
    } catch (err) {
      console.log('Error handling leave request:', err);
      showToast('Xử lý yêu cầu thất bại.', 'error');
    }
  }, [approveStudentApplication, rejectStudentApplication, showToast]);

  useEffect(() => {
    if (user) {
      if (user.role !== 'student') {
        loadStaffList();
        loadAttendanceLogs();
        loadPayrolls();
      }
    } else {
      setStaffList([]);
      setHrmSingleApplicants([]);
      setSchedulesList([]);
      setAttendanceLogs([]);
      setPayrolls([]);
    }
  }, [user, loadStaffList, loadAttendanceLogs, loadPayrolls]);

  return {
    staffList,
    schedulesList,
    hrmSingleApplicants,
    setHrmSingleApplicants,
    attendanceLogs,
    setAttendanceLogs,
    payrolls,
    loadStaffList,
    addStaffMember,
    removeStaffMember,
    loadSchedules,
    addEmployeeSchedule,
    removeEmployeeSchedule,
    loadAttendanceLogs,
    loadPayrolls,
    runCalculatePayroll,
    runApprovePayroll,
    handleLeaveRequest
  };
};
