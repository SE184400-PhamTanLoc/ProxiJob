import { useState, useCallback } from 'react';

export const useNavigation = (isEnterprise, showToast) => {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [navigationStack, setNavigationStack] = useState([]);
  const [navigationParams, setNavigationParams] = useState({});
  const [upgradeRedirectScreen, setUpgradeRedirectScreen] = useState(null);

  const navigateTo = useCallback((screenName, params = {}) => {
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
  }, [currentScreen, isEnterprise, showToast]);

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
