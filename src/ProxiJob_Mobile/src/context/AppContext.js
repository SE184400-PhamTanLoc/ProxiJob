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
  { id: 1, name: 'Nguyễn Văn A', role: 'Pha chế Trưởng', phone: '0901 234 567', status: 'working', shiftsCount: 12 },
  { id: 2, name: 'Trần Thị B', role: 'Phục vụ Cố định', phone: '0912 345 678', status: 'idle', shiftsCount: 8 },
  { id: 3, name: 'Lê Hoàng C', role: 'Bảo vệ kiêm Giám sát', phone: '0988 777 666', status: 'idle', shiftsCount: 16 },
  { id: 4, name: 'Phạm Tấn Lộc', role: 'Phục vụ Bán thời gian', phone: '0977 111 222', status: 'working', shiftsCount: 20 }
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

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

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
          } catch (apiError) {
            console.log('[ProxiJob Auth] Access token invalid/expired, attempting refresh...');
            const storedRefreshToken = await getStoredRefreshToken();
            if (storedRefreshToken && storedRefreshToken !== 'mock-refresh-token-123456') {
              try {
                const newTokens = await refreshTokensApi(storedRefreshToken);
                // Save new session (same user details but new tokens)
                await saveAuthSession(newTokens.accessToken, newTokens.refreshToken, storedUser);
                // Re-verify new token and set user
                const verifiedUser = await checkAuthApi(newTokens.accessToken);
                setUser(verifiedUser);
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

    // Check for network connection errors
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

    // Check for invalid credentials
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

    // Return custom backend message if it's already in Vietnamese
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
      const { token, refreshToken, user: loggedInUser } = await loginApi(email, password, role);

      // Save credentials locally (including refreshToken)
      await saveAuthSession(token, refreshToken, loggedInUser);

      setUser(loggedInUser);
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
      const res = await registerApi(fullName, email, password, confirmPassword, role);
      showToast(res.message || 'Đăng ký tài khoản thành công! Vui lòng đăng nhập.', 'success');
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
  const applyToShift = (shiftId) => {
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
  };

  const checkInShift = (shiftId) => {
    setShifts((prevShifts) =>
      prevShifts.map((shift) => {
        if (shift.id === shiftId) {
          const now = new Date();
          const checkInTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

          const updatedShift = {
            ...shift,
            status: 'checkin_active',
            checkInTime,
            auditFields: { ...shift.auditFields, updatedBy: user?.name || 'Student' }
          };
          setActiveShift(updatedShift);
          addNotification('Check-in', `Đã điểm danh vào ca làm tại ${shift.shopName} lúc ${checkInTime}. Chúc ca làm vui vẻ!`);
          showToast('Check-in ca làm thành công! Chúc bạn làm việc vui vẻ.', 'success');

          // HRM updates: set employee status
          setStaffList(prev => prev.map(s => s.name === 'Nguyễn Văn A' ? { ...s, status: 'working' } : s));

          return updatedShift;
        }
        return shift;
      })
    );
  };

  const checkOutShift = (shiftId) => {
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
          showToast('Check-out thành công! Hệ thống đang xử lý lương.', 'success');

          // Update earnings / review mock
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

          // HRM updates: set employee status back to idle
          setStaffList(prev => prev.map(s => s.name === 'Nguyễn Văn A' ? { ...s, status: 'idle', shiftsCount: s.shiftsCount + 1 } : s));

          return updatedShift;
        }
        return shift;
      })
    );
  };

  // Employer Actions
  const createEmergencyShift = (title, shopName, hourlyRate, time, duration = '4 giờ') => {
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
    showToast('Đăng ca khẩn cấp thành công!', 'warning');
  };

  const approveStudentApplication = (shiftId) => {
    setShifts((prevShifts) =>
      prevShifts.map((shift) => {
        if (shift.id === shiftId) {
          addNotification('Duyệt tuyển', `Hồ sơ của bạn ứng tuyển ca làm ${shift.title} tại ${shift.shopName} đã được CHỦ QUÁN DUYỆT!`);
          showToast(`Đã duyệt ứng tuyển tại ${shift.shopName}!`, 'success');
          return { ...shift, status: 'approved', auditFields: { ...shift.auditFields, updatedBy: user?.name || 'Host_Approve' } };
        }
        return shift;
      })
    );
  };

  const rejectStudentApplication = (shiftId) => {
    setShifts((prevShifts) =>
      prevShifts.map((shift) => {
        if (shift.id === shiftId) {
          addNotification('Ứng tuyển', `Đơn ứng tuyển ca làm ${shift.title} tại ${shift.shopName} đã bị từ chối.`);
          showToast(`Đã từ chối ứng tuyển tại ${shift.shopName}.`, 'info');
          return { ...shift, status: 'available', auditFields: { ...shift.auditFields, updatedBy: user?.name || 'Host_Reject' } };
        }
        return shift;
      })
    );
  };

  // HRM Lite actions
  const addStaffMember = (name, role, phone) => {
    const newStaff = {
      id: Date.now(),
      name,
      role,
      phone,
      status: 'idle',
      shiftsCount: 0
    };
    setStaffList(prev => [...prev, newStaff]);
    addNotification('Quản trị nhân sự', `Đã thêm nhân viên ${name} (${role}) vào danh sách nhân sự nội bộ.`);
    showToast(`Đã thêm nhân viên ${name} vào hệ thống!`, 'success');
  };

  const removeStaffMember = (id) => {
    const staff = staffList.find(s => s.id === id);
    if (staff) {
      setStaffList(prev => prev.filter(s => s.id !== id));
      addNotification('Quản trị nhân sự', `Đã xóa nhân viên ${staff.name} khỏi danh sách nhân sự nội bộ.`);
      showToast(`Đã xóa nhân viên ${staff.name}!`, 'info');
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

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        isRestoringSession,
        shifts,
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
        hideToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
