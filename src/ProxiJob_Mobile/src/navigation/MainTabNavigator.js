import React, { useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform
} from 'react-native';
import { theme } from '../styles/theme';
import { BlurView } from 'expo-blur';
import { AppContext } from '../context/AppContext';

// Student Screens
import StudentDashboard from '../screens/student/StudentDashboard';
import JobDetailScreen from '../screens/student/JobDetailScreen';
import StudentCalendar from '../screens/student/StudentCalendar';
import StudentCheckIn from '../screens/student/StudentCheckIn';
import StudentPortfolio from '../screens/student/StudentPortfolio';

// Employer Screens
import EmployerApprovals from '../screens/employer/EmployerApprovals';
import EmployerEmergencyPost from '../screens/employer/EmployerEmergencyPost';
import CandidateListScreen from '../screens/employer/CandidateListScreen';
import UpgradePackageScreen from '../screens/employer/UpgradePackageScreen';
import EmployerHRM from '../screens/employer/EmployerHRM';
import EmployerScheduling from '../screens/employer/EmployerScheduling';
import EmployerMonitor from '../screens/employer/EmployerMonitor';
import PayrollSettlementScreen from '../screens/employer/PayrollSettlementScreen';
import PaymentQRScreen from '../screens/employer/PaymentQRScreen';

export default function MainTabNavigator({ isStudent }) {
  const { currentScreen, navigateTo } = useContext(AppContext);

  // Render Student Screens based on global currentScreen state
  const renderStudentContent = () => {
    switch (currentScreen) {
      case 'student_dashboard':
        return <StudentDashboard />;
      case 'job_detail':
        return <JobDetailScreen />;
      case 'student_calendar':
        return <StudentCalendar />;
      case 'student_checkin':
        return <StudentCheckIn />;
      case 'student_portfolio':
        return <StudentPortfolio />;
      default:
        return <StudentDashboard />;
    }
  };

  // Render Employer Screens based on global currentScreen state
  const renderEmployerContent = () => {
    switch (currentScreen) {
      case 'employer_approvals':
        return <EmployerApprovals />;
      case 'employer_emergency_post':
        return <EmployerEmergencyPost />;
      case 'candidate_list':
        return <CandidateListScreen />;
      case 'upgrade_package':
        return <UpgradePackageScreen />;
      case 'employer_hrm':
        return <EmployerHRM />;
      case 'employer_scheduling':
        return <EmployerScheduling />;
      case 'employer_monitor':
        return <EmployerMonitor />;
      case 'payroll_settlement':
        return <PayrollSettlementScreen />;
      case 'payment_qr':
        return <PaymentQRScreen />;
      default:
        return <EmployerApprovals />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Main Content Area */}
      <View style={styles.content}>
        {isStudent ? renderStudentContent() : renderEmployerContent()}
      </View>

      {/* Student Bottom Navigation Bar */}
      {isStudent && (
        <BlurView intensity={75} tint="light" style={styles.tabBar}>
          <TouchableOpacity
            style={[
              styles.tabItem,
              (currentScreen === 'student_dashboard' || currentScreen === 'job_detail') && styles.activeTabItemStudent
            ]}
            onPress={() => navigateTo('student_dashboard')}
          >
            <Text style={styles.tabIcon}>🔍</Text>
            <Text style={[
              styles.tabLabel,
              (currentScreen === 'student_dashboard' || currentScreen === 'job_detail') && styles.activeTabLabelStudent
            ]}>Tìm Việc</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'student_calendar' && styles.activeTabItemStudent]}
            onPress={() => navigateTo('student_calendar')}
          >
            <Text style={styles.tabIcon}>📅</Text>
            <Text style={[styles.tabLabel, currentScreen === 'student_calendar' && styles.activeTabLabelStudent]}>Lịch Roster</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'student_checkin' && styles.activeTabItemStudent]}
            onPress={() => navigateTo('student_checkin')}
          >
            <Text style={styles.tabIcon}>📍</Text>
            <Text style={[styles.tabLabel, currentScreen === 'student_checkin' && styles.activeTabLabelStudent]}>GPS Điểm Danh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'student_portfolio' && styles.activeTabItemStudent]}
            onPress={() => navigateTo('student_portfolio')}
          >
            <Text style={styles.tabIcon}>👤</Text>
            <Text style={[styles.tabLabel, currentScreen === 'student_portfolio' && styles.activeTabLabelStudent]}>Hồ Sơ</Text>
          </TouchableOpacity>
        </BlurView>
      )}

      {/* Employer Bottom Navigation Bar */}
      {!isStudent && (
        <BlurView intensity={75} tint="light" style={styles.tabBar}>
          <TouchableOpacity
            style={[
              styles.tabItem,
              (currentScreen === 'employer_approvals' || currentScreen === 'employer_emergency_post' || currentScreen === 'candidate_list') && styles.activeTabItemEmployer
            ]}
            onPress={() => navigateTo('employer_approvals')}
          >
            <Text style={styles.tabIcon}>📋</Text>
            <Text style={[
              styles.tabLabel,
              (currentScreen === 'employer_approvals' || currentScreen === 'employer_emergency_post' || currentScreen === 'candidate_list') && styles.activeTabLabelEmployer
            ]}>Tin Tuyển</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'employer_hrm' && styles.activeTabItemEmployer]}
            onPress={() => navigateTo('employer_hrm')}
          >
            <Text style={styles.tabIcon}>👥</Text>
            <Text style={[styles.tabLabel, currentScreen === 'employer_hrm' && styles.activeTabLabelEmployer]}>Nhân Sự</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'employer_scheduling' && styles.activeTabItemEmployer]}
            onPress={() => navigateTo('employer_scheduling')}
          >
            <Text style={styles.tabIcon}>🗓️</Text>
            <Text style={[styles.tabLabel, currentScreen === 'employer_scheduling' && styles.activeTabLabelEmployer]}>Xếp Lịch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'employer_monitor' && styles.activeTabItemEmployer]}
            onPress={() => navigateTo('employer_monitor')}
          >
            <Text style={styles.tabIcon}>📡</Text>
            <Text style={[styles.tabLabel, currentScreen === 'employer_monitor' && styles.activeTabLabelEmployer]}>GPS Live</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              (currentScreen === 'payroll_settlement' || currentScreen === 'upgrade_package' || currentScreen === 'payment_qr') && styles.activeTabItemEmployer
            ]}
            onPress={() => navigateTo('payroll_settlement')}
          >
            <Text style={styles.tabIcon}>💵</Text>
            <Text style={[
              styles.tabLabel,
              (currentScreen === 'payroll_settlement' || currentScreen === 'upgrade_package' || currentScreen === 'payment_qr') && styles.activeTabLabelEmployer
            ]}>Quyết Toán</Text>
          </TouchableOpacity>
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 96 : 84,
  },
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 12,
    right: 12,
    height: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 3,
    marginVertical: 4,
    height: 52,
  },
  activeTabItemStudent: {
    backgroundColor: '#FF6B001F',
  },
  activeTabItemEmployer: {
    backgroundColor: '#0A58CA1F',
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  activeTabLabelStudent: {
    color: '#FF6B00',
  },
  activeTabLabelEmployer: {
    color: '#0A58CA',
  },
});
