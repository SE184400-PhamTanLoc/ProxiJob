import React, { createContext, useRef, useState } from 'react';
import { useToast } from './useToast';
import { useLocation } from './useLocation';
import { useAuth } from './useAuth';
import { useNavigation } from './useNavigation';
import { useShifts } from './useShifts';
import { useManagement } from './useManagement';
import { deleteSchedule } from '../api/management';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const toastState = useToast();
  const locationState = useLocation();

  // Create refs to avoid circular dependencies and stale closures
  const navigationRef = useRef(null);
  const shiftsRef = useRef(null);
  const loadStaffListRef = useRef(null);

  // Set up authentication
  const authState = useAuth({
    showToast: toastState.showToast,
    addNotification: toastState.addNotification,
    setCurrentScreen: (screen) => navigationRef.current?.setCurrentScreen(screen),
    setNavigationStack: (stack) => navigationRef.current?.setNavigationStack(stack),
    onLogoutResets: () => {
      if (shiftsRef.current) {
        shiftsRef.current.setActiveShift(null);
        shiftsRef.current.setEmployerJobs([]);
        shiftsRef.current.setShifts([]);
      }
      locationState.setSimulatedDistanceToActive(3200);
      // Clean up HRM and logs via setters
      if (loadStaffListRef.current) {
        // We will reset these directly if needed, or through direct setters exposed
      }
    }
  });

  // Set up navigation with dynamically computed subscription access
  const navigationState = useNavigation(
    authState.isEnterprise,
    toastState.showToast
  );
  navigationRef.current = navigationState;

  // Set up shift management
  const shiftsState = useShifts({
    user: authState.user,
    STUDENT_MOCK_GPS: locationState.STUDENT_MOCK_GPS,
    showToast: toastState.showToast,
    addNotification: toastState.addNotification,
    loadStaffListRef
  });
  shiftsRef.current = shiftsState;

  // Set up management / HRM / scheduling / payroll
  const managementState = useManagement({
    user: authState.user,
    showToast: toastState.showToast,
    approveStudentApplication: shiftsState.approveStudentApplication,
    rejectStudentApplication: shiftsState.rejectStudentApplication
  });
  loadStaffListRef.current = managementState.loadStaffList;

  // Static review state for backward compatibility
  const [reviews, setReviews] = useState([]);

  return (
    <AppContext.Provider
      value={{
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
        setSimulatedDistanceToActive: locationState.setSimulatedDistanceToActive,
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

        // Shifts & Jobs State
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
        approveStudentApplication: shiftsState.approveStudentApplication,
        rejectStudentApplication: shiftsState.rejectStudentApplication,

        // HRM/Management State
        staffList: managementState.staffList,
        setStaffList: () => {}, // Backward compatibility dummy
        loadStaffList: managementState.loadStaffList,
        addStaffMember: managementState.addStaffMember,
        removeStaffMember: managementState.removeStaffMember,
        hrmSingleApplicants: managementState.hrmSingleApplicants,
        setHrmSingleApplicants: managementState.setHrmSingleApplicants,
        attendanceLogs: managementState.attendanceLogs,
        setAttendanceLogs: managementState.setAttendanceLogs,
        loadAttendanceLogs: managementState.loadAttendanceLogs,
        payrolls: managementState.payrolls,
        loadPayrolls: managementState.loadPayrolls,
        runCalculatePayroll: managementState.runCalculatePayroll,
        runApprovePayroll: managementState.runApprovePayroll,

        // Scheduling State
        schedulesList: managementState.schedulesList,
        loadSchedules: managementState.loadSchedules,
        addEmployeeSchedule: managementState.addEmployeeSchedule,
        removeEmployeeSchedule: managementState.removeEmployeeSchedule,
        deleteSchedule,

        // Reviews (backward-compatible mock state)
        reviews,
        setReviews,

        // Other Actions
        handleLeaveRequest: managementState.handleLeaveRequest
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
