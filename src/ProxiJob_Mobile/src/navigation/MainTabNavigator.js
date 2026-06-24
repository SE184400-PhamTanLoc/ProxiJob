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
import StudentChat from '../screens/student/StudentChat';

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
import EmployerChat from '../screens/employer/EmployerChat';
import EmployerProfileScreen from '../screens/employer/EmployerProfileScreen';

export default function MainTabNavigator({ isStudent }) {
  const { currentScreen, navigateTo, isChatRoomActive, user } = useContext(AppContext);

  const tier = user?.subscriptionTier?.toLowerCase() || '';
  const hasPremium = tier === 'premium' || tier === 'enterprise';
  const hasStandard = tier === 'standard' || tier === 'premium' || tier === 'enterprise';

  const hideTabBarScreens = [
    'employer_emergency_post',
    'candidate_list',
    'upgrade_package',
    'job_detail',
    ...(hasStandard ? ['employer_profile'] : [])
  ];
  const showTabBar = !hideTabBarScreens.includes(currentScreen) && !isChatRoomActive;

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
      case 'student_chat':
        return <StudentChat />;
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
      case 'employer_chat':
        return <EmployerChat />;
      case 'job_detail':
        return <JobDetailScreen />;
      case 'payroll_settlement':
        return <PayrollSettlementScreen />;
      case 'payment_qr':
        return <PaymentQRScreen />;
      case 'employer_profile':
        return <EmployerProfileScreen />;
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
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigateTo('student_dashboard')}
          >
            <View style={[
              styles.iconContainer,
              (currentScreen === 'student_dashboard' || currentScreen === 'job_detail') && styles.activeIconContainerStudent
            ]}>
              <Ionicons
                name={currentScreen === 'student_dashboard' || currentScreen === 'job_detail' ? 'search' : 'search-outline'}
                size={22}
                color={currentScreen === 'student_dashboard' || currentScreen === 'job_detail' ? '#FFFFFF' : '#64748B'}
              />
            </View>
            <Text style={[
              styles.tabLabel,
              (currentScreen === 'student_dashboard' || currentScreen === 'job_detail') && styles.activeTabLabelStudent
            ]}>Tìm Việc</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigateTo('student_calendar')}
          >
            <View style={[
              styles.iconContainer,
              currentScreen === 'student_calendar' && styles.activeIconContainerStudent
            ]}>
              <Ionicons
                name={currentScreen === 'student_calendar' ? 'calendar' : 'calendar-outline'}
                size={22}
                color={currentScreen === 'student_calendar' ? '#FFFFFF' : '#64748B'}
              />
            </View>
            <Text style={[
              styles.tabLabel,
              currentScreen === 'student_calendar' && styles.activeTabLabelStudent
            ]}>Lịch Roster</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigateTo('student_checkin')}
          >
            <View style={[
              styles.iconContainer,
              currentScreen === 'student_checkin' && styles.activeIconContainerStudent
            ]}>
              <Ionicons
                name={currentScreen === 'student_checkin' ? 'location' : 'location-outline'}
                size={22}
                color={currentScreen === 'student_checkin' ? '#FFFFFF' : '#64748B'}
              />
            </View>
            <Text style={[
              styles.tabLabel,
              currentScreen === 'student_checkin' && styles.activeTabLabelStudent
            ]}>Điểm Danh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigateTo('student_chat')}
          >
            <View style={[
              styles.iconContainer,
              currentScreen === 'student_chat' && styles.activeIconContainerStudent
            ]}>
              <Ionicons
                name={currentScreen === 'student_chat' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                size={22}
                color={currentScreen === 'student_chat' ? '#FFFFFF' : '#64748B'}
              />
            </View>
            <Text style={[
              styles.tabLabel,
              currentScreen === 'student_chat' && styles.activeTabLabelStudent
            ]}>Trò Chuyện</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigateTo('student_portfolio')}
          >
            <View style={[
              styles.iconContainer,
              currentScreen === 'student_portfolio' && styles.activeIconContainerStudent
            ]}>
              <Ionicons
                name={currentScreen === 'student_portfolio' ? 'person' : 'person-outline'}
                size={22}
                color={currentScreen === 'student_portfolio' ? '#FFFFFF' : '#64748B'}
              />
            </View>
            <Text style={[
              styles.tabLabel,
              currentScreen === 'student_portfolio' && styles.activeTabLabelStudent
            ]}>Hồ Sơ</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Employer Bottom Navigation Bar */}
      {!isStudent && showTabBar && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigateTo('employer_approvals')}
          >
            <View style={[
              styles.iconContainer,
              (currentScreen === 'employer_approvals' || currentScreen === 'employer_emergency_post' || currentScreen === 'candidate_list') && styles.activeIconContainerEmployer
            ]}>
              <Ionicons
                name={currentScreen === 'employer_approvals' || currentScreen === 'employer_emergency_post' || currentScreen === 'candidate_list' ? 'briefcase' : 'briefcase-outline'}
                size={22}
                color={currentScreen === 'employer_approvals' || currentScreen === 'employer_emergency_post' || currentScreen === 'candidate_list' ? '#FFFFFF' : '#64748B'}
              />
            </View>
            <Text style={[
              styles.tabLabel,
              (currentScreen === 'employer_approvals' || currentScreen === 'employer_emergency_post' || currentScreen === 'candidate_list') && styles.activeTabLabelEmployer
            ]}>Tin Tuyển</Text>
          </TouchableOpacity>

          {hasPremium && (
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigateTo('employer_hrm')}
            >
              <View style={[
                styles.iconContainer,
                currentScreen === 'employer_hrm' && styles.activeIconContainerEmployer
              ]}>
                <Ionicons
                  name={currentScreen === 'employer_hrm' ? 'people' : 'people-outline'}
                  size={22}
                  color={currentScreen === 'employer_hrm' ? '#FFFFFF' : '#64748B'}
                />
              </View>
              <Text style={[
                styles.tabLabel,
                currentScreen === 'employer_hrm' && styles.activeTabLabelEmployer
              ]}>Nhân Sự</Text>
            </TouchableOpacity>
          )}

          {hasStandard && (
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigateTo('employer_scheduling')}
            >
              <View style={[
                styles.iconContainer,
                currentScreen === 'employer_scheduling' && styles.activeIconContainerEmployer
              ]}>
                <Ionicons
                  name={currentScreen === 'employer_scheduling' ? 'calendar' : 'calendar-outline'}
                  size={22}
                  color={currentScreen === 'employer_scheduling' ? '#FFFFFF' : '#64748B'}
                />
              </View>
              <Text style={[
                styles.tabLabel,
                currentScreen === 'employer_scheduling' && styles.activeTabLabelEmployer
              ]}>Xếp Lịch</Text>
            </TouchableOpacity>
          )}

          {hasStandard && (
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigateTo('employer_monitor')}
            >
              <View style={[
                styles.iconContainer,
                currentScreen === 'employer_monitor' && styles.activeIconContainerEmployer
              ]}>
                <Ionicons
                  name={currentScreen === 'employer_monitor' ? 'navigate' : 'navigate-outline'}
                  size={22}
                  color={currentScreen === 'employer_monitor' ? '#FFFFFF' : '#64748B'}
                />
              </View>
              <Text style={[
                styles.tabLabel,
                currentScreen === 'employer_monitor' && styles.activeTabLabelEmployer
              ]}>GPS Live</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigateTo('employer_chat')}
          >
            <View style={[
              styles.iconContainer,
              currentScreen === 'employer_chat' && styles.activeIconContainerEmployer
            ]}>
              <Ionicons
                name={currentScreen === 'employer_chat' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                size={22}
                color={currentScreen === 'employer_chat' ? '#FFFFFF' : '#64748B'}
              />
            </View>
            <Text style={[
              styles.tabLabel,
              currentScreen === 'employer_chat' && styles.activeTabLabelEmployer
            ]}>Trò Chuyện</Text>
          </TouchableOpacity>

          {hasStandard && (
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigateTo('payroll_settlement')}
            >
              <View style={[
                styles.iconContainer,
                (currentScreen === 'payroll_settlement' || currentScreen === 'upgrade_package' || currentScreen === 'payment_qr') && styles.activeIconContainerEmployer
              ]}>
                <Ionicons
                  name={currentScreen === 'payroll_settlement' || currentScreen === 'upgrade_package' ? 'wallet' : 'wallet-outline'}
                  size={22}
                  color={currentScreen === 'payroll_settlement' || currentScreen === 'upgrade_package' ? '#FFFFFF' : '#64748B'}
                />
              </View>
              <Text style={[
                styles.tabLabel,
                (currentScreen === 'payroll_settlement' || currentScreen === 'upgrade_package' || currentScreen === 'payment_qr') && styles.activeTabLabelEmployer
              ]}>Quyết Toán</Text>
            </TouchableOpacity>
          )}

          {!hasStandard && (
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigateTo('employer_profile')}
            >
              <View style={[
                styles.iconContainer,
                currentScreen === 'employer_profile' && styles.activeIconContainerEmployer
              ]}>
                <Ionicons
                  name={currentScreen === 'employer_profile' ? 'storefront' : 'storefront-outline'}
                  size={22}
                  color={currentScreen === 'employer_profile' ? '#FFFFFF' : '#64748B'}
                />
              </View>
              <Text style={[
                styles.tabLabel,
                currentScreen === 'employer_profile' && styles.activeTabLabelEmployer
              ]}>Hồ Sơ</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    paddingBottom: 0,
  },
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 20,
    right: 20,
    height: 74,
    backgroundColor: '#FFFFFF',
    borderRadius: 37,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 68,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeIconContainerStudent: {
    backgroundColor: '#FF6B00',
    borderRadius: 21,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  activeIconContainerEmployer: {
    backgroundColor: '#0A58CA',
    borderRadius: 21,
    shadowColor: '#0A58CA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
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
