import React, { createContext, useRef, useState } from "react";
import { useToast } from "./useToast";
import { useLocation } from "./useLocation";
import { useAuth } from "./useAuth";
import { useNavigation } from "./useNavigation";
import { useShifts } from "./useShifts";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const toastState = useToast();
  const locationState = useLocation();

  // Create refs to avoid circular dependencies and stale closures
  const navigationRef = useRef(null);
  const shiftsStateRef = useRef(null);

  // Set up authentication
  const authState = useAuth({
    showToast: toastState.showToast,
    addNotification: toastState.addNotification,
    setCurrentScreen: (screen) =>
      navigationRef.current?.setCurrentScreen(screen),
    setNavigationStack: (stack) =>
      navigationRef.current?.setNavigationStack(stack),
    onLogoutResets: () => {
      shiftsStateRef.current?.setActiveShift(null);
      locationState.setSimulatedDistanceToActive(3200);
    },
  });

  // Set up navigation with dynamically computed subscription access
  const navigationState = useNavigation(
    authState.isEnterprise,
    toastState.showToast,
    authState.user
  );
  navigationRef.current = navigationState;

  // Set up shifts state
  const shiftsState = useShifts({
    user: authState.user,
    STUDENT_MOCK_GPS: locationState.STUDENT_MOCK_GPS,
    showToast: toastState.showToast,
    addNotification: toastState.addNotification,
  });
  shiftsStateRef.current = shiftsState;

  // Static review state for backward compatibility
  const [reviews, setReviews] = useState([]);
  const [isChatRoomActive, setIsChatRoomActive] = useState(false);

  return (
    <AppContext.Provider
      value={{
        isChatRoomActive,
        setIsChatRoomActive,
        // Auth State & Actions
        user: authState.user,
        setUser: authState.setUser,
        authLoading: authState.authLoading,
        setAuthLoading: authState.setAuthLoading,
        isRestoringSession: authState.isRestoringSession,
        setIsRestoringSession: authState.setIsRestoringSession,
        authScreen: authState.authScreen,
        setAuthScreen: authState.setAuthScreen,
        selectedRole: authState.selectedRole,
        setSelectedRole: authState.setSelectedRole,
        isEnterprise: authState.isEnterprise,
        setIsEnterprise: authState.setIsEnterprise,
        login: authState.login,
        loginWithGoogle: authState.loginWithGoogle,
        register: authState.register,
        logout: authState.logout,

        // Toast & Notification
        toast: toastState.toast,
        showToast: toastState.showToast,
        hideToast: toastState.hideToast,
        notifications: toastState.notifications,
        setNotifications: toastState.setNotifications,
        addNotification: toastState.addNotification,

        // Location State
        STUDENT_MOCK_GPS: locationState.STUDENT_MOCK_GPS,
        studentCoords: locationState.studentCoords,
        setStudentCoords: locationState.setStudentCoords,
        simulatedDistanceToActive: locationState.simulatedDistanceToActive,
        setSimulatedDistanceToActive:
          locationState.setSimulatedDistanceToActive,
        getDistanceInMeters: locationState.getDistanceInMeters,

        // Navigation Router States
        currentScreen: navigationState.currentScreen,
        setCurrentScreen: navigationState.setCurrentScreen,
        navigationStack: navigationState.navigationStack,
        setNavigationStack: navigationState.setNavigationStack,
        navigationParams: navigationState.navigationParams,
        setNavigationParams: navigationState.setNavigationParams,
        upgradeRedirectScreen: navigationState.upgradeRedirectScreen,
        setUpgradeRedirectScreen: navigationState.setUpgradeRedirectScreen,
        navigateTo: navigationState.navigateTo,
        goBack: navigationState.goBack,

        // Shifts State & Actions
        shifts: shiftsState.shifts,
        setShifts: shiftsState.setShifts,
        activeShift: shiftsState.activeShift,
        setActiveShift: shiftsState.setActiveShift,
        employerJobs: shiftsState.employerJobs,
        setEmployerJobs: shiftsState.setEmployerJobs,
        leaveRequests: shiftsState.leaveRequests,
        setLeaveRequests: shiftsState.setLeaveRequests,
        loadShifts: shiftsState.loadShifts,
        loadMyApplications: shiftsState.loadMyApplications,
        loadEmployerJobs: shiftsState.loadEmployerJobs,
        applyToShift: shiftsState.applyToShift,
        checkInShift: shiftsState.checkInShift,
        checkOutShift: shiftsState.checkOutShift,
        createEmergencyShift: shiftsState.createEmergencyShift,
        createJobPostWizard: shiftsState.createJobPostWizard,
        updateJobPostWizard: shiftsState.updateJobPostWizard,
        deleteJobPost: shiftsState.deleteJobPost,
        approveStudentApplication: shiftsState.approveStudentApplication,
        rejectStudentApplication: shiftsState.rejectStudentApplication,

        // Reviews (backward-compatible mock state)
        reviews,
        setReviews,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
