import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform
} from 'react-native';
import { theme } from '../styles/theme';
import { BlurView } from 'expo-blur';
// Student Screens
import StudentDashboard from '../screens/student/StudentDashboard';
import StudentCalendar from '../screens/student/StudentCalendar';
import StudentCheckIn from '../screens/student/StudentCheckIn';
import StudentPortfolio from '../screens/student/StudentPortfolio';

// Employer Screens
import EmployerHRM from '../screens/employer/EmployerHRM';
import EmployerScheduling from '../screens/employer/EmployerScheduling';
import EmployerMonitor from '../screens/employer/EmployerMonitor';
import EmployerApprovals from '../screens/employer/EmployerApprovals';
import EmployerEmergencyPost from '../screens/employer/EmployerEmergencyPost';

export default function MainTabNavigator({ isStudent }) {
  const [activeStudentTab, setActiveStudentTab] = useState('dashboard'); // 'dashboard' | 'calendar' | 'checkin' | 'portfolio'
  const [activeEmployerTab, setActiveEmployerTab] = useState('hrm'); // 'hrm' | 'scheduling' | 'monitor' | 'approvals' | 'emergency'

  // Render Student Screens
  const renderStudentContent = () => {
    switch (activeStudentTab) {
      case 'dashboard':
        return <StudentDashboard />;
      case 'calendar':
        return (
          <StudentCalendar
            onNavigateToCheckIn={(shift) => {
              setActiveStudentTab('checkin');
            }}
          />
        );
      case 'checkin':
        return <StudentCheckIn />;
      case 'portfolio':
        return <StudentPortfolio />;
      default:
        return <StudentDashboard />;
    }
  };

  // Render Employer Screens
  const renderEmployerContent = () => {
    switch (activeEmployerTab) {
      case 'hrm':
        return <EmployerHRM />;
      case 'scheduling':
        return <EmployerScheduling />;
      case 'monitor':
        return <EmployerMonitor />;
      case 'approvals':
        return <EmployerApprovals />;
      case 'emergency':
        return (
          <EmployerEmergencyPost
            onPostSuccess={() => {
              setActiveEmployerTab('approvals');
            }}
          />
        );
      default:
        return <EmployerHRM />;
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
        <BlurView
          intensity={65}
          tint="dark"
          style={styles.tabBar}
        >
          <TouchableOpacity
            style={[styles.tabItem, activeStudentTab === 'dashboard' && styles.activeTabItem]}
            onPress={() => setActiveStudentTab('dashboard')}
          >
            <Text style={styles.tabIcon}>🔍</Text>
            <Text style={[styles.tabLabel, activeStudentTab === 'dashboard' && styles.activeTabLabelStudent]}>Tìm Việc</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeStudentTab === 'calendar' && styles.activeTabItem]}
            onPress={() => setActiveStudentTab('calendar')}
          >
            <Text style={styles.tabIcon}>📅</Text>
            <Text style={[styles.tabLabel, activeStudentTab === 'calendar' && styles.activeTabLabelStudent]}>Lịch Roster</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeStudentTab === 'checkin' && styles.activeTabItem]}
            onPress={() => setActiveStudentTab('checkin')}
          >
            <Text style={styles.tabIcon}>📍</Text>
            <Text style={[styles.tabLabel, activeStudentTab === 'checkin' && styles.activeTabLabelStudent]}>GPS Điểm Danh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeStudentTab === 'portfolio' && styles.activeTabItem]}
            onPress={() => setActiveStudentTab('portfolio')}
          >
            <Text style={styles.tabIcon}>👤</Text>
            <Text style={[styles.tabLabel, activeStudentTab === 'portfolio' && styles.activeTabLabelStudent]}>Hồ Sơ</Text>
          </TouchableOpacity>
        </BlurView>
      )}

      {/* Employer Bottom Navigation Bar */}
      {!isStudent && (
        <BlurView
          intensity={65}
          tint="dark"
          style={styles.tabBar}
        >
          <TouchableOpacity
            style={[styles.tabItem, activeEmployerTab === 'hrm' && styles.activeTabItem]}
            onPress={() => setActiveEmployerTab('hrm')}
          >
            <Text style={styles.tabIcon}>👥</Text>
            <Text style={[styles.tabLabel, activeEmployerTab === 'hrm' && styles.activeTabLabelEmployer]}>Nhân Sự</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeEmployerTab === 'scheduling' && styles.activeTabItem]}
            onPress={() => setActiveEmployerTab('scheduling')}
          >
            <Text style={styles.tabIcon}>🗓️</Text>
            <Text style={[styles.tabLabel, activeEmployerTab === 'scheduling' && styles.activeTabLabelEmployer]}>Xếp Lịch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeEmployerTab === 'monitor' && styles.activeTabItem]}
            onPress={() => setActiveEmployerTab('monitor')}
          >
            <Text style={styles.tabIcon}>📡</Text>
            <Text style={[styles.tabLabel, activeEmployerTab === 'monitor' && styles.activeTabLabelEmployer]}>GPS Live</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeEmployerTab === 'approvals' && styles.activeTabItem]}
            onPress={() => setActiveEmployerTab('approvals')}
          >
            <Text style={styles.tabIcon}>✍️</Text>
            <Text style={[styles.tabLabel, activeEmployerTab === 'approvals' && styles.activeTabLabelEmployer]}>Duyệt Ca</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeEmployerTab === 'emergency' && styles.activeTabItem]}
            onPress={() => setActiveEmployerTab('emergency')}
          >
            <Text style={styles.tabIcon}>🔥</Text>
            <Text style={[styles.tabLabel, activeEmployerTab === 'emergency' && styles.activeTabLabelEmployer]}>Tuyển Gấp</Text>
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
  },
  content: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 96 : 84,
  },
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 35 : 35,
    left: 16,
    right: 16,
    height: 64,
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // Translucent dark glassmorphism background
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)', // Light white border for contrast
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8, // Shadows for Android
    shadowColor: '#000000', // Shadows for iOS
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    overflow: 'hidden', // Crucial to crop the BlurView inside the rounded border
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 32, // Pill shape for individual items
    marginHorizontal: 4,
    marginVertical: 6,
    height: 52,
  },
  activeTabItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)', // Translucent white pill background
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)', // Semi-transparent white for inactive tabs
  },
  activeTabLabelStudent: {
    color: '#FFFFFF', // High-contrast solid white when selected
    fontWeight: 'bold',
  },
  activeTabLabelEmployer: {
    color: '#FFFFFF', // High-contrast solid white when selected
    fontWeight: 'bold',
  },
});
