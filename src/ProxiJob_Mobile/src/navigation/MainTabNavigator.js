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
import { Ionicons } from '@expo/vector-icons';

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

export default function MainTabNavigator({ isStudent }) {
  const { currentScreen, navigateTo } = useContext(AppContext);

  const hideTabBarScreens = [
    'employer_emergency_post',
    'candidate_list',
    'upgrade_package',
    'job_detail'
  ];
  const showTabBar = !hideTabBarScreens.includes(currentScreen);

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
      default:
        return <EmployerApprovals />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Main Content Area */}
      <View style={[styles.content, !showTabBar && { paddingBottom: 0 }]}>
        {isStudent ? renderStudentContent() : renderEmployerContent()}
      </View>

      {/* Student Bottom Navigation Bar */}
      {isStudent && showTabBar && (
        <BlurView intensity={75} tint="light" style={styles.tabBar}>
          <TouchableOpacity
            style={[
              styles.tabItem,
              (currentScreen === 'student_dashboard' || currentScreen === 'job_detail') && styles.activeTabItemStudent
            ]}
            onPress={() => navigateTo('student_dashboard')}
          >
            <Ionicons
              name={currentScreen === 'student_dashboard' || currentScreen === 'job_detail' ? 'search' : 'search-outline'}
              size={20}
              color={currentScreen === 'student_dashboard' || currentScreen === 'job_detail' ? '#FF6B00' : '#9CA3AF'}
            />
            <Text style={[
              styles.tabLabel,
              (currentScreen === 'student_dashboard' || currentScreen === 'job_detail') && styles.activeTabLabelStudent
            ]}>Tìm Việc</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'student_calendar' && styles.activeTabItemStudent]}
            onPress={() => navigateTo('student_calendar')}
          >
            <Ionicons
              name={currentScreen === 'student_calendar' ? 'calendar' : 'calendar-outline'}
              size={20}
              color={currentScreen === 'student_calendar' ? '#FF6B00' : '#9CA3AF'}
            />
            <Text style={[styles.tabLabel, currentScreen === 'student_calendar' && styles.activeTabLabelStudent]}>Lịch Roster</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'student_checkin' && styles.activeTabItemStudent]}
            onPress={() => navigateTo('student_checkin')}
          >
            <Ionicons
              name={currentScreen === 'student_checkin' ? 'location' : 'location-outline'}
              size={20}
              color={currentScreen === 'student_checkin' ? '#FF6B00' : '#9CA3AF'}
            />
            <Text style={[styles.tabLabel, currentScreen === 'student_checkin' && styles.activeTabLabelStudent]}>Điểm Danh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'student_portfolio' && styles.activeTabItemStudent]}
            onPress={() => navigateTo('student_portfolio')}
          >
            <Ionicons
              name={currentScreen === 'student_portfolio' ? 'person' : 'person-outline'}
              size={20}
              color={currentScreen === 'student_portfolio' ? '#FF6B00' : '#9CA3AF'}
            />
            <Text style={[styles.tabLabel, currentScreen === 'student_portfolio' && styles.activeTabLabelStudent]}>Hồ Sơ</Text>
          </TouchableOpacity>
        </BlurView>
      )}

      {/* Employer Bottom Navigation Bar */}
      {!isStudent && showTabBar && (
        <BlurView intensity={75} tint="light" style={styles.tabBar}>
          <TouchableOpacity
            style={[
              styles.tabItem,
              (currentScreen === 'employer_approvals' || currentScreen === 'employer_emergency_post' || currentScreen === 'candidate_list') && styles.activeTabItemEmployer
            ]}
            onPress={() => navigateTo('employer_approvals')}
          >
            <Ionicons
              name={currentScreen === 'employer_approvals' || currentScreen === 'employer_emergency_post' || currentScreen === 'candidate_list' ? 'briefcase' : 'briefcase-outline'}
              size={20}
              color={currentScreen === 'employer_approvals' || currentScreen === 'employer_emergency_post' || currentScreen === 'candidate_list' ? '#0A58CA' : '#9CA3AF'}
            />
            <Text style={[
              styles.tabLabel,
              (currentScreen === 'employer_approvals' || currentScreen === 'employer_emergency_post' || currentScreen === 'candidate_list') && styles.activeTabLabelEmployer
            ]}>Tin Tuyển</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'employer_hrm' && styles.activeTabItemEmployer]}
            onPress={() => navigateTo('employer_hrm')}
          >
            <Ionicons
              name={currentScreen === 'employer_hrm' ? 'people' : 'people-outline'}
              size={20}
              color={currentScreen === 'employer_hrm' ? '#0A58CA' : '#9CA3AF'}
            />
            <Text style={[styles.tabLabel, currentScreen === 'employer_hrm' && styles.activeTabLabelEmployer]}>Nhân Sự</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'employer_scheduling' && styles.activeTabItemEmployer]}
            onPress={() => navigateTo('employer_scheduling')}
          >
            <Ionicons
              name={currentScreen === 'employer_scheduling' ? 'calendar' : 'calendar-outline'}
              size={20}
              color={currentScreen === 'employer_scheduling' ? '#0A58CA' : '#9CA3AF'}
            />
            <Text style={[styles.tabLabel, currentScreen === 'employer_scheduling' && styles.activeTabLabelEmployer]}>Xếp Lịch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'employer_monitor' && styles.activeTabItemEmployer]}
            onPress={() => navigateTo('employer_monitor')}
          >
            <Ionicons
              name={currentScreen === 'employer_monitor' ? 'navigate' : 'navigate-outline'}
              size={20}
              color={currentScreen === 'employer_monitor' ? '#0A58CA' : '#9CA3AF'}
            />
            <Text style={[styles.tabLabel, currentScreen === 'employer_monitor' && styles.activeTabLabelEmployer]}>GPS Live</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              (currentScreen === 'payroll_settlement' || currentScreen === 'upgrade_package') && styles.activeTabItemEmployer
            ]}
            onPress={() => navigateTo('payroll_settlement')}
          >
            <Ionicons
              name={currentScreen === 'payroll_settlement' || currentScreen === 'upgrade_package' ? 'wallet' : 'wallet-outline'}
              size={20}
              color={currentScreen === 'payroll_settlement' || currentScreen === 'upgrade_package' ? '#0A58CA' : '#9CA3AF'}
            />
            <Text style={[
              styles.tabLabel,
              (currentScreen === 'payroll_settlement' || currentScreen === 'upgrade_package') && styles.activeTabLabelEmployer
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
    left: 16,
    right: 16,
    height: 68,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 14,
    marginHorizontal: 4,
    marginVertical: 4,
    height: 56,
  },
  activeTabItemStudent: {
    backgroundColor: '#FF6B000C',
  },
  activeTabItemEmployer: {
    backgroundColor: '#0A58CA0C',
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 3,
  },
  activeTabLabelStudent: {
    color: '#FF6B00',
    fontWeight: '700',
  },
  activeTabLabelEmployer: {
    color: '#0A58CA',
    fontWeight: '700',
  },
});
