import { useState, useEffect, useCallback, useRef } from 'react';
import {
  loginApi,
  registerApi,
  checkAuthApi,
  saveAuthSession,
  clearAuthSession,
  getStoredToken,
  getStoredUser,
  getStoredRefreshToken,
  refreshTokensApi,
  loginWithGoogleApi
} from '../api/auth';

export const translateError = (error) => {
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

  return error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
};

export const useAuth = ({
  showToast,
  addNotification,
  setCurrentScreen,
  setNavigationStack,
  onLogoutResets
}) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [authScreen, setAuthScreen] = useState('login');
  const [selectedRole, setSelectedRole] = useState(0); // 0 = student, 1 = employer
  const [isEnterprise, setIsEnterprise] = useState(false);

  // Use refs for callbacks that might be defined inline in the parent component
  // to avoid infinite loops and stale closures.
  const setCurrentScreenRef = useRef(setCurrentScreen);
  const setNavigationStackRef = useRef(setNavigationStack);
  const onLogoutResetsRef = useRef(onLogoutResets);

  useEffect(() => {
    setCurrentScreenRef.current = setCurrentScreen;
    setNavigationStackRef.current = setNavigationStack;
    onLogoutResetsRef.current = onLogoutResets;
  });

  useEffect(() => {
    if (user) {
      const premiumTiers = ['Enterprise', 'Premium', 'Standard'];
      setIsEnterprise(premiumTiers.includes(user?.subscriptionTier));
    } else {
      setIsEnterprise(false);
    }
  }, [user]);

  const login = useCallback(async (email, password) => {
    try {
      setAuthLoading(true);
      const { token, refreshToken, user: resUser } = await loginApi(email, password);
      await saveAuthSession(token, refreshToken, resUser);

      setUser(resUser);

      const userRole = resUser?.role || 'student';
      const mappedRoleValue = userRole === 'student' ? 0 : 1;
      setSelectedRole(mappedRoleValue);

      if (userRole === 'student') {
        setCurrentScreenRef.current?.('student_dashboard');
        setNavigationStackRef.current?.(['student_dashboard']);
      } else {
        setCurrentScreenRef.current?.('employer_approvals');
        setNavigationStackRef.current?.(['employer_approvals']);
      }

      addNotification('Bảo mật', `Đăng nhập thành công với vai trò ${userRole === 'student' ? 'Sinh viên' : 'Chủ quán'}`, 'Vừa xong');
      showToast(`Đăng nhập thành công!`, 'success');
    } catch (error) {
      console.log('[ProxiJob Login] Auth execution error:', error.message);
      const friendlyMsg = translateError(error);
      showToast(friendlyMsg, 'error');
    } finally {
      setAuthLoading(false);
    }
  }, [showToast, addNotification]);

  const loginWithGoogle = useCallback(async (googleToken, role) => {
    try {
      setAuthLoading(true);
      const { token, refreshToken, user: resUser } = await loginWithGoogleApi(googleToken, role);
      await saveAuthSession(token, refreshToken, resUser);

      setUser(resUser);

      const userRole = resUser?.role || 'student';
      const mappedRoleValue = userRole === 'student' ? 0 : 1;
      setSelectedRole(mappedRoleValue);

      if (userRole === 'student') {
        setCurrentScreenRef.current?.('student_dashboard');
        setNavigationStackRef.current?.(['student_dashboard']);
      } else {
        setCurrentScreenRef.current?.('employer_approvals');
        setNavigationStackRef.current?.(['employer_approvals']);
      }

      addNotification('Bảo mật', `Đăng nhập bằng Google thành công với vai trò ${userRole === 'student' ? 'Sinh viên' : 'Chủ quán'}`, 'Vừa xong');
      showToast(`Đăng nhập Google thành công!`, 'success');
    } catch (error) {
      console.log('[ProxiJob Login Google] Auth execution error:', error.message);
      const friendlyMsg = translateError(error);
      showToast(friendlyMsg, 'error');
    } finally {
      setAuthLoading(false);
    }
  }, [showToast, addNotification]);

  const register = useCallback(async (fullName, email, password, confirmPassword, role) => {
    try {
      setAuthLoading(true);
      await registerApi(fullName, email, password, confirmPassword, role);
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
  }, [showToast]);

  const logout = useCallback(async () => {
    try {
      setAuthLoading(true);
      await clearAuthSession();
      setUser(null);
      setIsEnterprise(false);
      if (onLogoutResetsRef.current) onLogoutResetsRef.current();
      setCurrentScreenRef.current?.('login');
      setNavigationStackRef.current?.([]);
      addNotification('Bảo mật', 'Bạn đã đăng xuất khỏi hệ thống thành công.', 'Vừa xong');
      showToast('Đăng xuất thành công!', 'info');
    } catch (error) {
      console.log('[ProxiJob Logout] Error:', error);
      showToast('Lỗi đăng xuất!', 'error');
    } finally {
      setAuthLoading(false);
    }
  }, [showToast, addNotification]);

  useEffect(() => {
    async function restoreSession() {
      try {
        const token = await getStoredToken();
        const storedUser = await getStoredUser();

        if (token && storedUser) {
          try {
            const verifiedUser = await checkAuthApi(token);
            setUser(verifiedUser);
            if (verifiedUser.role === 'student') {
              setCurrentScreenRef.current?.('student_dashboard');
            } else {
              setCurrentScreenRef.current?.('employer_approvals');
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
                  setCurrentScreenRef.current?.('student_dashboard');
                } else {
                  setCurrentScreenRef.current?.('employer_approvals');
                }
              } catch (refreshErr) {
                console.log('[ProxiJob Auth] Token refresh failed, clearing session:', refreshErr.message);
                await clearAuthSession();
              }
            } else {
              console.log('[ProxiJob Auth] No valid refresh token, clearing session:', apiError.message);
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

    // Add overall timeout to prevent app from hanging on black screen
    let didFinish = false;
    const timeoutId = setTimeout(() => {
      if (!didFinish) {
        console.log('[ProxiJob Auth] Session restore timed out, showing login screen.');
        clearAuthSession().catch(() => {});
        setIsRestoringSession(false);
        setAuthLoading(false);
      }
    }, 8000);

    restoreSession().finally(() => {
      didFinish = true;
      clearTimeout(timeoutId);
    });
  }, []);

  return {
    user,
    setUser,
    authLoading,
    setAuthLoading,
    isRestoringSession,
    setIsRestoringSession,
    authScreen,
    setAuthScreen,
    selectedRole,
    setSelectedRole,
    isEnterprise,
    setIsEnterprise,
    login,
    loginWithGoogle,
    register,
    logout
  };
};
