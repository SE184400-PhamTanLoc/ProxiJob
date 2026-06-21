import { useState, useCallback } from 'react';

export const useNavigation = (isEnterprise, showToast, user) => {
  const [currentScreen, setCurrentScreen] = useState('student_dashboard');
  const [navigationStack, setNavigationStack] = useState([]);
  const [navigationParams, setNavigationParams] = useState({});
  const [upgradeRedirectScreen, setUpgradeRedirectScreen] = useState(null);

  const navigateTo = useCallback((screenName, params = {}) => {
    // Guest protection for student screens
    const protectedStudentScreens = [
      'student_calendar',
      'student_checkin',
      'student_portfolio',
      'student_chat'
    ];
    if (protectedStudentScreens.includes(screenName) && !user) {
      showToast('Vui lòng đăng nhập để sử dụng chức năng này!', 'warning');
      setNavigationParams(params);
      setNavigationStack(prev => [...prev, currentScreen]);
      setCurrentScreen('login');
      return;
    }

    // Avoid double routing to tab screens to prevent rendering loops and jitter
    const tabScreens = [
      'student_dashboard',
      'student_calendar',
      'student_checkin',
      'student_portfolio',
      'student_chat',
      'employer_approvals',
      'employer_hrm',
      'employer_scheduling',
      'employer_monitor',
      'employer_chat',
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
  }, [currentScreen, isEnterprise, showToast, user]);

  const goBack = useCallback(() => {
    if (navigationStack.length > 0) {
      const nextStack = [...navigationStack];
      const prevScreen = nextStack.pop();
      setNavigationStack(nextStack);
      setCurrentScreen(prevScreen);
    }
  }, [navigationStack]);

  return {
    currentScreen,
    setCurrentScreen,
    navigationStack,
    setNavigationStack,
    navigationParams,
    setNavigationParams,
    upgradeRedirectScreen,
    setUpgradeRedirectScreen,
    navigateTo,
    goBack
  };
};
