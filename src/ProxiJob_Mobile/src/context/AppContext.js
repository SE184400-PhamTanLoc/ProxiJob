import React, { createContext, useState, useEffect } from 'react';
import {
  loginApi,
  registerApi,
  checkAuthApi,
  saveAuthSession,
  clearAuthSession,
  getStoredToken,
  getStoredUser,
  getStoredRefreshToken,
  refreshTokensApi
} from '../api/auth';
import {
  getPublishedJobs,
  getJobPostById,
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
  getEmployees,
  createEmployee,
  deleteEmployee,
  checkInShiftApi,
  checkOutShiftApi,
  getQrCode,
  generateQrCode,
  updateQrRadius,
  getSchedules,
  createSchedule,
  getPayrolls,
  calculatePayroll,
  approvePayroll,
  getTimekeepingLogs
} from '../api/management';

export const AppContext = createContext();

// Mock Initial GPS (Ben Thanh Market Area, District 1, HCMC)
const STUDENT_MOCK_GPS = {
  latitude: 10.7769,
  longitude: 106.7009
};

const INITIAL_SHIFTS = [
  {
    id: 101,
    title: 'Nhân viên Pha chế (Cấp cao)',
    shopName: 'Katinat Coffee - Đồng Khởi',
    hourlyRate: 38000,
    latitude: 10.7745,
    longitude: 106.7065,
    date: '05/06/2026',
    time: '18:00 - 22:00',
    description: 'Pha chế đồ uống nóng/lạnh theo công thức tiêu chuẩn của Katinat. Đảm bảo vệ sinh quầy bar và tương tác thân thiện với khách hàng.',
    requirements: 'Có kinh nghiệm pha chế cơ bản từ 3 tháng, thái độ tích cực, tác phong nhanh nhẹn.',
    rating: 4.8,
    reviewsCount: 24,
    status: 'available',
    isEmergency: false,
    auditFields: {
      createdBy: 'System_Admin',
      updatedBy: 'System_Admin',
      deletedBy: ''
    }
  },
  {
    id: 102,
    title: 'Phục vụ ca tối',
    shopName: 'Highlands Coffee - Hồ Con Rùa',
    hourlyRate: 32000,
    latitude: 10.7812,
    longitude: 106.6912,
    date: '06/06/2026',
    time: '17:30 - 22:30',
    description: 'Chào đón khách, ghi nhận món ăn uống, bưng bê đồ uống và dọn dẹp vệ sinh khu vực sảnh quán.',
    requirements: 'Trung thực, chịu khó, ưu tiên sinh viên có lịch làm việc linh hoạt.',
    rating: 4.6,
    reviewsCount: 15,
    status: 'available',
    isEmergency: false,
    auditFields: {
      createdBy: 'System_Admin',
      updatedBy: 'System_Admin',
      deletedBy: ''
    }
  },
  {
    id: 103,
    title: 'Nhân viên kho soạn hàng ca đêm',
    shopName: 'Shopee Express - Quận 4 Hub',
    hourlyRate: 48000,
    latitude: 10.7554,
    longitude: 106.7054,
    date: '05/06/2026',
    time: '22:00 - 06:00',
    description: 'Phân loại hàng hóa theo quận huyện, xếp dỡ thùng hàng và đóng gói bưu kiện phục vụ vận chuyển buổi sáng.',
    requirements: 'Sức khỏe tốt, cẩn thận, chịu được áp lực công việc ban đêm.',
    rating: 4.5,
    reviewsCount: 38,
    status: 'available',
    isEmergency: false,
    auditFields: {
      createdBy: 'System_Admin',
      updatedBy: 'System_Admin',
      deletedBy: ''
    }
  },
  {
    id: 104,
    title: 'Thu ngân kiêm sắp xếp hàng',
    shopName: 'Circle K - Lê Lợi D1',
    hourlyRate: 33000,
    latitude: 10.7712,
    longitude: 106.6989,
    date: '07/06/2026',
    time: '08:00 - 16:00',
    description: 'Tính tiền cho khách tại quầy thu ngân bằng POS, xếp hàng hóa lên kệ, dọn vệ sinh trong và ngoài cửa hàng.',
    requirements: 'Có kỹ năng tính toán cơ bản, nhanh nhẹn, trung thực.',
    rating: 4.7,
    reviewsCount: 9,
    status: 'available',
    isEmergency: false,
    auditFields: {
      createdBy: 'System_Admin',
      updatedBy: 'System_Admin',
      deletedBy: ''
    }
  },
  {
    id: 105,
    title: 'Phục vụ bàn gấp trưa',
    shopName: 'Phở 24 - Nguyễn Huệ',
    hourlyRate: 35000,
    latitude: 10.7750,
    longitude: 106.7032,
    date: '08/06/2026',
    time: '11:00 - 14:00',
    description: 'Phục vụ tô phở nóng và dọn bàn siêu tốc trong khung giờ cao điểm ăn trưa của giới văn phòng.',
    requirements: 'Giao tiếp tốt, chịu áp lực bận rộn cao, nhanh tay nhanh chân.',
    rating: 4.4,
    reviewsCount: 22,
    status: 'available',
    isEmergency: false,
    auditFields: {
      createdBy: 'System_Admin',
      updatedBy: 'System_Admin',
      deletedBy: ''
    }
  }
];

const INITIAL_STAFF = [
  { id: 1, name: 'Nguyễn Văn A', role: 'Pha chế Trưởng', phone: '0901 234 567', status: 'working', shiftsCount: 12, isExternal: false },
  { id: 2, name: 'Trần Thị B', role: 'Phục vụ Cố định', phone: '0912 345 678', status: 'idle', shiftsCount: 8, isExternal: false },
  { id: 3, name: 'Lê Hoàng C', role: 'Bảo vệ kiêm Giám sát', phone: '0988 777 666', status: 'idle', shiftsCount: 16, isExternal: false },
  { id: 4, name: 'Phạm Tấn Lộc', role: 'Phục vụ Bán thời gian', phone: '0977 111 222', status: 'working', shiftsCount: 20, isExternal: true }
];

const INITIAL_LEAVE_REQUESTS = [
  { id: 1, staffName: 'Lê Hoàng C', reason: 'Xin nghỉ phép khám bệnh', shiftDate: '07/06/2026', status: 'pending' },
  { id: 2, staffName: 'Trần Thị B', reason: 'Đổi ca chiều sang sáng do đi học nhóm', shiftDate: '08/06/2026', status: 'pending' }
];

const INITIAL_REVIEWS = [
  { id: 1, author: 'Katinat Coffee', rating: 5, comment: 'Nguyễn Văn A làm việc cực kì đúng giờ, pha chế nhanh nhẹn và thái độ phục vụ khách hàng rát tốt.', date: '28/05/2026' },
  { id: 2, author: 'Highlands Coffee', rating: 4, comment: 'Làm việc chăm chỉ, nhiệt tình. Cần cải thiện một chút tốc độ dọn dẹp bàn ghế lúc đông khách.', date: '20/05/2026' },
  { id: 3, author: 'Circle K', rating: 5, comment: 'Xuất sắc, trung thực, hỗ trợ cửa hàng nhiệt tình trong ca trực đêm.', date: '15/05/2026' }
];

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null means logged out
  const [authLoading, setAuthLoading] = useState(false); // set default to false for form buttons
  const [isRestoringSession, setIsRestoringSession] = useState(true); // new loading state for startup
  const [authScreen, setAuthScreen] = useState('login'); // 'login' or 'register'
  const [selectedRole, setSelectedRole] = useState(0); // 0 = student, 1 = employer
  const [shifts, setShifts] = useState(INITIAL_SHIFTS);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  // Navigation Router States
  const [currentScreen, setCurrentScreen] = useState('login');
  const [navigationStack, setNavigationStack] = useState([]);
  const [navigationParams, setNavigationParams] = useState({});
  const [isEnterprise, setIsEnterprise] = useState(false);
  const [upgradeRedirectScreen, setUpgradeRedirectScreen] = useState(null);
  const [hrmSingleApplicants, setHrmSingleApplicants] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [employerJobs, setEmployerJobs] = useState([]);
  const [payrolls, setPayrollsState] = useState([]);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  // State-driven routing function
  const navigateTo = (screenName, params = {}) => {
    // Avoid double routing to tab screens to prevent rendering loops and jitter
    const tabScreens = [
      'student_dashboard',
      'student_calendar',
      'student_checkin',
      'student_portfolio',
      'employer_approvals',
      'employer_hrm',
      'employer_scheduling',
      'employer_monitor',
      'payroll_settlement'
    ];
    if (currentScreen === screenName && tabScreens.includes(screenName)) {
      setNavigationParams(params);
      return;
    }

    // Gatekeeping middleware
    const restrictedScreens = [
      'employer_hrm',
      'employer_scheduling',
      'employer_monitor',
      'payroll_settlement'
    ];
    if (restrictedScreens.includes(screenName) && !isEnterprise) {
      setUpgradeRedirectScreen(screenName);
      setNavigationParams(params);
      setNavigationStack(prev => [...prev, currentScreen]);
      setCurrentScreen('upgrade_package');
      showToast('Vui lòng nâng cấp gói Enterprise (1.999.000đ) để sử dụng tính năng!', 'warning');
      return;
    }

    setNavigationParams(params);
    setNavigationStack(prev => [...prev, currentScreen]);
    setCurrentScreen(screenName);
  };

  const goBack = () => {
    if (navigationStack.length > 0) {
      const nextStack = [...navigationStack];
      const prevScreen = nextStack.pop();
      setNavigationStack(nextStack);
      setCurrentScreen(prevScreen);
    }
  };

  // API loading states
  const loadShifts = async () => {
    try {
      const res = await getPublishedJobs();
      const jobPosts = res.items || [];
      const allShifts = [];
      for (const job of jobPosts) {
        try {
          const jobShifts = await getJobPostShifts(job.id);
          for (const s of jobShifts) {
            allShifts.push({
              id: s.id,
              jobPostId: job.id,
              title: job.title,
              shopName: job.categoryName || 'Cửa hàng',
              hourlyRate: s.salary,
              latitude: job.location?.latitude || STUDENT_MOCK_GPS.latitude,
              longitude: job.location?.longitude || STUDENT_MOCK_GPS.longitude,
              date: new Date(s.startTime).toLocaleDateString('vi-VN'),
              time: `${new Date(s.startTime).getHours().toString().padStart(2, '0')}:${new Date(s.startTime).getMinutes().toString().padStart(2, '0')} - ${new Date(s.endTime).getHours().toString().padStart(2, '0')}:${new Date(s.endTime).getMinutes().toString().padStart(2, '0')}`,
              description: job.description || '',
              requirements: job.requirements || '',
              rating: 5.0,
              reviewsCount: 1,
              status: s.remainingSlots <= 0 ? 'full' : 'available',
              isEmergency: job.title.toLowerCase().includes('khẩn cấp') || job.description.toLowerCase().includes('khẩn cấp'),
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

      let baseShifts = allShifts.length > 0 ? allShifts : [...INITIAL_SHIFTS];

      // If user is a student, fetch applications and merge directly to resolve race conditions
      if (user && user.role === 'student') {
        try {
          const appsRes = await getMyApplications(user.id);
          const apps = appsRes.items || [];
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
      console.log('Error loading published shifts, using mock fallback:', err);
      let baseShifts = [...INITIAL_SHIFTS];
      if (user && user.role === 'student') {
        try {
          const appsRes = await getMyApplications(user.id);
          const apps = appsRes.items || [];
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
          console.log('Error merging applications in mock fallback:', appErr);
        }
      }
      setShifts(baseShifts);
    }
  };

  const loadMyApplications = async (studentId) => {
    // Forward to loadShifts since loadShifts now automatically maps applications
    await loadShifts();
  };

  const loadEmployerJobs = async () => {
    if (!user || user.role !== 'employer') return;
    try {
      const res = await getJobPostsByBusiness(user.id);
      const list = res.items || [];
      setEmployerJobs(list);
    } catch (err) {
      console.log('Error loading employer jobs:', err);
    }
  };

  const loadStaffList = async () => {
    if (!user || user.role !== 'employer') return;
    try {
      const res = await getEmployees();
      const list = res.items || res || [];
      const formattedList = list.map(emp => ({
        id: emp.id,
        name: emp.fullName,
        role: emp.position || 'Nhân viên',
        phone: emp.phoneNumber || 'Không có',
        status: emp.status === 0 || emp.status === 'Active' ? 'idle' : 'terminated',
        isExternal: emp.isExternal,
        shiftsCount: emp.shiftsCount || 0
      }));
      setStaffList(formattedList);
      
      const externalList = formattedList.filter(emp => emp.isExternal);
      setHrmSingleApplicants(externalList);
    } catch (err) {
      console.log('Error loading employees, using mock fallback:', err);
      setStaffList(INITIAL_STAFF);
    }
  };

  const loadAttendanceLogs = async () => {
    if (!user || user.role !== 'employer') return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await getTimekeepingLogs(today);
      const logs = res.items || res || [];
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
  };

  const loadPayrolls = async () => {
    if (!user || user.role !== 'employer') return;
    try {
      const res = await getPayrolls();
      const list = res.items || res || [];
      setPayrollsState(list);
    } catch (err) {
      console.log('Error loading payrolls:', err);
    }
  };

  // Trigger reloading of backend data dynamically when user changes
  useEffect(() => {
    if (user) {
      if (user.role === 'student') {
        loadShifts();
      } else {
        // Set isEnterprise state based on user's active subscription tier from DB
        const premiumTiers = ['Enterprise', 'Premium', 'Standard'];
        setIsEnterprise(premiumTiers.includes(user?.subscriptionTier));

        loadEmployerJobs();
        loadStaffList();
        loadAttendanceLogs();
        loadPayrolls();
      }
    }
  }, [user]);

  // Automatic Session Restoration (checkauth) on launch
  useEffect(() => {
    async function restoreSession() {
      try {
        const token = await getStoredToken();
        const storedUser = await getStoredUser();

        if (token && storedUser) {
          try {
            // Attempt to verify token
            const verifiedUser = await checkAuthApi(token);
            setUser(verifiedUser);
            // Auto redirect based on role
            if (verifiedUser.role === 'student') {
              setCurrentScreen('student_dashboard');
            } else {
              setCurrentScreen('employer_approvals');
            }
          } catch (apiError) {
            console.log('[ProxiJob Auth] Access token invalid/expired, attempting refresh...');
            const storedRefreshToken = await getStoredRefreshToken();
            if (storedRefreshToken && storedRefreshToken !== 'mock-refresh-token-123456') {
              try {
                const newTokens = await refreshTokensApi(storedRefreshToken);
                await saveAuthSession(newTokens.accessToken, newTokens.refreshToken, storedUser);
                const verifiedUser = await checkAuthApi(newTokens.accessToken);
                setUser(verifiedUser);
                if (verifiedUser.role === 'student') {
                  setCurrentScreen('student_dashboard');
                } else {
                  setCurrentScreen('employer_approvals');
                }
              } catch (refreshErr) {
                console.log('[ProxiJob Auth] Token refresh failed, clearing session:', refreshErr.message);
                await clearAuthSession();
              }
            } else {
              console.log('[ProxiJob Auth] Stored session invalid, clearing:', apiError.message);
              await clearAuthSession();
            }
          }
        }
      } catch (err) {
        console.log('[ProxiJob Auth] Session restoration failed:', err);
      } finally {
        setIsRestoringSession(false);
        setAuthLoading(false);
      }
    }
    restoreSession();
  }, []);

  const [staffList, setStaffList] = useState(INITIAL_STAFF);
  const [leaveRequests, setLeaveRequests] = useState(INITIAL_LEAVE_REQUESTS);
  const [reviews, setReviews] = useState(INITIAL_REVIEWS);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Hệ thống', content: 'Chào mừng bạn đến với ProxiJob - Nền tảng việc làm hyperlocal!', time: 'Vừa xong', read: false }
  ]);

  // Student Mock GPS and interactive distance modifier
  const [studentCoords, setStudentCoords] = useState(STUDENT_MOCK_GPS);
  const [simulatedDistanceToActive, setSimulatedDistanceToActive] = useState(3200); // 3200 meters (3.2 km) initially

  // Active shift detail helper for student checkin/checkout
  const [activeShift, setActiveShift] = useState(null);

  // Helper to calculate distance in meters using Haversine formula
  const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  };

  // Helper to translate errors into friendly Vietnamese
  const translateError = (error) => {
    if (!error) return 'Đăng nhập không thành công. Vui lòng thử lại sau.';
    const msg = (error.message || String(error)).toLowerCase();

    if (
      msg.includes('network request failed') ||
      msg.includes('fetch failed') ||
      msg.includes('connect') ||
      msg.includes('connection') ||
      msg.includes('failed to connect') ||
      msg.includes('java.net.connectexception')
    ) {
      return 'Vui lòng kiểm tra lại kết nối mạng.';
    }

    if (
      msg.includes('unauthorized') ||
      msg.includes('401') ||
      msg.includes('invalid') ||
      msg.includes('credentials') ||
      msg.includes('incorrect') ||
      msg.includes('wrong') ||
      msg.includes('sai') ||
      msg.includes('không chính xác') ||
      msg.includes('chưa chính xác')
    ) {
      return 'Tài khoản hoặc mật khẩu không chính xác.';
    }

    if (error.message) {
      const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(error.message);
      if (hasVietnamese) {
        return error.message;
      }
    }

    return 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
  };

  // Auth Operations
  const login = async (email, password, role) => {
    try {
      setAuthLoading(true);
      let loggedInUser;
      try {
        const { token, refreshToken, user: resUser } = await loginApi(email, password, role);
        await saveAuthSession(token, refreshToken, resUser);
        loggedInUser = resUser;
      } catch (apiError) {
        // Fallback mockup user to run offline smoothly
        console.log('[ProxiJob Login] API failed, using mock user for demo: ', apiError.message);
        loggedInUser = {
          id: 1,
          name: role === 0 ? 'Nguyễn Văn A' : 'Highlands Coffee Hub',
          email: email || (role === 0 ? 'student@proxijob.vn' : 'merchant@proxijob.vn'),
          role: role === 0 ? 'student' : 'merchant',
          subscriptionTier: 'Free',
        };
      }
      setUser(loggedInUser);
      setSelectedRole(role);
      
      // Global navigation switch based on Role
      if (role === 0) {
        setCurrentScreen('student_dashboard');
        setNavigationStack(['student_dashboard']);
      } else {
        setCurrentScreen('employer_approvals');
        setNavigationStack(['employer_approvals']);
      }

      addNotification('Bảo mật', `Đăng nhập thành công với vai trò ${role === 0 ? 'Sinh viên' : 'Chủ quán'}`, 'Vừa xong');
      showToast(`Đăng nhập thành công!`, 'success');
    } catch (error) {
      console.log('[ProxiJob Login] Auth execution error:', error.message);
      const friendlyMsg = translateError(error);
      showToast(friendlyMsg, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (fullName, email, password, confirmPassword, role) => {
    try {
      setAuthLoading(true);
      try {
        await registerApi(fullName, email, password, confirmPassword, role);
      } catch (e) {
        console.log('[ProxiJob Register] API failed, using mock registration');
      }
      showToast('Đăng ký tài khoản thành công! Vui lòng đăng nhập.', 'success');
      return true;
    } catch (error) {
      console.log('[ProxiJob Register] Registration error:', error.message);
      const friendlyMsg = translateError(error);
      showToast(friendlyMsg, 'error');
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      setAuthLoading(true);
      await clearAuthSession();
      setUser(null);
      setActiveShift(null);
      setSimulatedDistanceToActive(3200);
      setIsEnterprise(false);
      setHrmSingleApplicants([]);
      setAttendanceLogs([]);
      setEmployerJobs([]);
      setPayrollsState([]);
      setUpgradeRedirectScreen(null);
      setShifts(INITIAL_SHIFTS); // Reset back to initial shifts
      setCurrentScreen('login');
      setNavigationStack([]);
      addNotification('Bảo mật', 'Bạn đã đăng xuất khỏi hệ thống thành công.', 'Vừa xong');
      showToast('Đăng xuất thành công!', 'info');
    } catch (error) {
      console.log('[ProxiJob Logout] Error:', error);
      showToast('Lỗi đăng xuất!', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const addNotification = (title, content, time = 'Vừa xong') => {
    setNotifications((prev) => [
      { id: Date.now(), title, content, time, read: false },
      ...prev
    ]);
  };

  // Student Actions
  const applyToShift = async (shiftId, introduction = 'Tôi muốn ứng tuyển.') => {
    try {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      await applyToShiftApi(shiftId, user.id, introduction, user.name);
      
      // Update UI state
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
      console.log('Error applying to shift, falling back to mock UI update:', err.message);
      // Fallback
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
      return true;
    }
  };

  const checkInShift = async (shiftId, qrToken, latitude, longitude, photoUrl = '') => {
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
      const timekeepingId = res.timekeepingId;

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
      console.log('Check-in API failed, falling back to mock check-in:', err.message);
      // Fallback
      setShifts((prevShifts) =>
        prevShifts.map((shift) => {
          if (shift.id === shiftId) {
            const now = new Date();
            const checkInTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            const updatedShift = {
              ...shift,
              status: 'checkin_active',
              checkInTime,
              timekeepingId: Date.now(),
              auditFields: { ...shift.auditFields, updatedBy: user?.name || 'Student' }
            };
            setActiveShift(updatedShift);
            
            const newAttendanceLog = {
              id: Date.now(),
              shiftId,
              studentName: user?.name || 'Nguyễn Văn A',
              shopName: shift.shopName,
              jobTitle: shift.title,
              checkInTime,
              checkOutTime: null,
              status: 'working',
              date: shift.date,
              photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
              gpsStatus: 'Hợp lệ (45m)'
            };
            setAttendanceLogs(prev => [newAttendanceLog, ...prev]);

            addNotification('Check-in', `Đã điểm danh vào ca làm tại ${shift.shopName} lúc ${checkInTime}. Chúc ca làm vui vẻ!`);
            showToast('Check-in ca làm thành công!', 'success');

            setStaffList(prev => prev.map(s => s.name === 'Nguyễn Văn A' ? { ...s, status: 'working' } : s));

            return updatedShift;
          }
          return shift;
        })
      );
      return true;
    }
  };

  const checkOutShift = async (shiftId, latitude, longitude, photoUrl = '') => {
    try {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      // Locate active shift timekeeping ID
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
      console.log('Check-out API failed, falling back to mock checkout:', err.message);
      // Fallback
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
            
            setAttendanceLogs(prev => prev.map(log => 
              log.shiftId === shiftId 
                ? { ...log, checkOutTime, status: 'completed' } 
                : log
            ));

            addNotification('Check-out', `Đã điểm danh kết thúc ca làm tại ${shift.shopName} lúc ${checkOutTime}. Hệ thống đang kết toán lương!`);
            showToast('Check-out thành công!', 'success');

            setTimeout(() => {
              const mockReview = {
                id: Date.now(),
                author: shift.shopName.split(' - ')[0],
                rating: 5,
                comment: 'Cảm ơn sự đóng góp nhiệt tình của bạn trong ca làm! Rất nhanh nhẹn và chuyên nghiệp.',
                date: 'Hôm nay'
              };
              setReviews(prev => [mockReview, ...prev]);
              addNotification('Đánh giá mới', `${mockReview.author} đã đánh giá 5⭐ và để lại nhận xét tích cực cho bạn!`);
              showToast(`Bạn nhận được đánh giá 5⭐ từ ${mockReview.author}!`, 'info');
            }, 3000);

            setStaffList(prev => prev.map(s => s.name === 'Nguyễn Văn A' ? { ...s, status: 'idle', shiftsCount: s.shiftsCount + 1 } : s));

            return updatedShift;
          }
          return shift;
        })
      );
      return true;
    }
  };

  // Employer Actions
  const createEmergencyShift = async (title, shopName, hourlyRate, time, duration = '4 giờ') => {
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

      // 1. Create Job Post
      const jobPostId = await createJobPost({
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

      // 2. Create Shift
      await createJobShift(jobPostId, {
        businessId: user.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        salary: parseInt(hourlyRate, 10),
        slots: 1,
        createdBy: user.name
      });

      // 3. Publish
      await publishJobPost(jobPostId, user.id);

      showToast('Đăng ca khẩn cấp thành công!', 'warning');
      addNotification('TIN TUYỂN GẤP', `Ca khẩn cấp "${title}" tại ${shopName} vừa được đăng với lương hấp dẫn!`, 'Vừa xong');
      
      await loadEmployerJobs();
      return true;
    } catch (err) {
      console.log('Error creating emergency shift, falling back to mock:', err.message);
      // Fallback
      const newShiftId = Date.now();
      const emergencyShift = {
        id: newShiftId,
        title: `${title} (KHẨN CẤP)`,
        shopName,
        hourlyRate: parseInt(hourlyRate, 10),
        latitude: STUDENT_MOCK_GPS.latitude + (Math.random() - 0.5) * 0.015, // close radius
        longitude: STUDENT_MOCK_GPS.longitude + (Math.random() - 0.5) * 0.015,
        date: 'Hôm nay',
        time,
        description: `Ca làm việc tuyển gấp khẩn cấp. Mức lương cao hơn 30% so với ngày thường. Nhận việc ngay không cần phỏng vấn. Yêu cầu có mặt sau 30 phút.`,
        requirements: 'Đã có kinh nghiệm, chủ động công việc, có trách nhiệm.',
        rating: 5.0,
        reviewsCount: 1,
        status: 'available',
        isEmergency: true,
        auditFields: {
          createdBy: user?.name || 'Employer_Host',
          updatedBy: user?.name || 'Employer_Host',
          deletedBy: ''
        }
      };

      setShifts(prev => [emergencyShift, ...prev]);
      addNotification('TIN TUYỂN GẤP', `Ca khẩn cấp "${title}" tại ${shopName} vừa được đăng với lương hấp dẫn!`, 'Vừa xong');
      showToast('Đăng ca khẩn cấp thành công! (Giả lập)', 'warning');
      return true;
    }
  };

  const approveStudentApplication = async (applicationId) => {
    try {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      await approveApplication(applicationId, user.id, user.name);
      showToast('Đã duyệt đơn ứng tuyển!', 'success');
      await loadEmployerJobs();
      await loadStaffList();
      return true;
    } catch (err) {
      console.log('Approve application API failed, using mock update:', err.message);
      // Fallback mock logic
      setShifts((prevShifts) =>
        prevShifts.map((shift) => {
          if (shift.id === applicationId || shift.jobPostId === applicationId) {
            const newHrmStaff = {
              id: Date.now(),
              name: 'Nguyễn Văn A',
              role: shift.title,
              phone: '0977 111 222',
              shiftTitle: shift.title,
              shopName: shift.shopName,
              hourlyRate: shift.hourlyRate,
              date: shift.date,
              time: shift.time
            };
            setHrmSingleApplicants(prev => [newHrmStaff, ...prev]);

            addNotification('Duyệt tuyển', `Hồ sơ của bạn ứng tuyển ca làm ${shift.title} tại ${shift.shopName} đã được CHỦ QUÁN DUYỆT!`);
            showToast(`Đã duyệt ứng tuyển tại ${shift.shopName}!`, 'success');
            return { ...shift, status: 'approved', auditFields: { ...shift.auditFields, updatedBy: user?.name || 'Host_Approve' } };
          }
          return shift;
        })
      );
      return true;
    }
  };

  const rejectStudentApplication = async (applicationId) => {
    try {
      if (!user) throw new Error('Vui lòng đăng nhập.');
      await rejectApplication(applicationId, user.id, user.name);
      showToast('Đã từ chối đơn ứng tuyển.', 'info');
      await loadEmployerJobs();
      return true;
    } catch (err) {
      console.log('Reject application API failed, using mock update:', err.message);
      // Fallback
      setShifts((prevShifts) =>
        prevShifts.map((shift) => {
          if (shift.id === applicationId) {
            addNotification('Ứng tuyển', `Đơn ứng tuyển ca làm ${shift.title} tại ${shift.shopName} đã bị từ chối.`);
            showToast(`Đã từ chối ứng tuyển tại ${shift.shopName}.`, 'info');
            return { ...shift, status: 'available', auditFields: { ...shift.auditFields, updatedBy: user?.name || 'Host_Reject' } };
          }
          return shift;
        })
      );
      return true;
    }
  };

  // HRM Lite actions
  const addStaffMember = async (name, role, phone) => {
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
      console.log('Add staff API failed, using mock fallback:', err.message);
      // Fallback
      const newStaff = {
        id: Date.now(),
        name,
        role,
        phone,
        status: 'idle',
        shiftsCount: 0,
        isExternal: false
      };
      setStaffList(prev => [...prev, newStaff]);
      addNotification('Quản trị nhân sự', `Đã thêm nhân viên ${name} (${role}) vào danh sách nhân sự nội bộ.`);
      showToast(`Đã thêm nhân viên ${name} vào hệ thống!`, 'success');
      return true;
    }
  };

  const removeStaffMember = async (id) => {
    try {
      await deleteEmployee(id);
      showToast(`Xóa nhân viên thành công!`, 'info');
      await loadStaffList();
      return true;
    } catch (err) {
      console.log('Delete staff API failed, using mock fallback:', err.message);
      // Fallback
      const staff = staffList.find(s => s.id === id);
      if (staff) {
        setStaffList(prev => prev.filter(s => s.id !== id));
        addNotification('Quản trị nhân sự', `Đã xóa nhân viên ${staff.name} khỏi danh sách nhân sự nội bộ.`);
        showToast(`Đã xóa nhân viên ${staff.name}!`, 'info');
      }
      return true;
    }
  };

  // Leave approval actions
  const handleLeaveRequest = (requestId, status) => {
    setLeaveRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        addNotification('Xếp lịch làm việc', `Yêu cầu xin nghỉ ca ngày ${req.shiftDate} của ${req.staffName} đã được ${status === 'approved' ? 'Chấp thuận' : 'Từ chối'}.`);
        showToast(`Đã ${status === 'approved' ? 'chấp thuận' : 'từ chối'} xin nghỉ ca!`, 'info');
        return { ...req, status };
      }
      return req;
    }));
  };

  // Payroll calculations
  const runCalculatePayroll = async (employeeId) => {
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
  };

  const runApprovePayroll = async (payrollId) => {
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
  };

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        isRestoringSession,
        shifts,
        setShifts,
        staffList,
        leaveRequests,
        reviews,
        notifications,
        studentCoords,
        simulatedDistanceToActive,
        setSimulatedDistanceToActive,
        activeShift,
        setActiveShift,
        login,
        logout,
        register,
        authScreen,
        setAuthScreen,
        selectedRole,
        setSelectedRole,
        applyToShift,
        checkInShift,
        checkOutShift,
        createEmergencyShift,
        approveStudentApplication,
        rejectStudentApplication,
        addStaffMember,
        removeStaffMember,
        handleLeaveRequest,
        getDistanceInMeters,
        STUDENT_MOCK_GPS,
        toast,
        showToast,
        hideToast,
        currentScreen,
        setCurrentScreen,
        navigationStack,
        setNavigationStack,
        navigationParams,
        setNavigationParams,
        isEnterprise,
        setIsEnterprise,
        upgradeRedirectScreen,
        setUpgradeRedirectScreen,
        hrmSingleApplicants,
        setHrmSingleApplicants,
        attendanceLogs,
        setAttendanceLogs,
        employerJobs,
        payrolls,
        runCalculatePayroll,
        runApprovePayroll,
        loadShifts,
        loadMyApplications,
        loadEmployerJobs,
        loadStaffList,
        loadAttendanceLogs,
        loadPayrolls,
        navigateTo,
        goBack
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
