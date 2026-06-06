import React, { useContext, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider, AppContext } from './src/context/AppContext';
import { theme } from './src/styles/theme';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import Toast from './src/components/Toast';

function MainAppShell() {
  const { user, logout, notifications, isRestoringSession, authScreen } = useContext(AppContext);
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  if (isRestoringSession) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return authScreen === 'register' ? <RegisterScreen /> : <LoginScreen />;
  }

  // Count unread notifications
  const unreadNotifsCount = notifications.filter(n => !n.read).length;
  const isStudent = user.role === 'student';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style="dark" />
      <SafeAreaView >
        {/* Universal Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logoText}>ProxiJob</Text>
            <View style={[
              styles.roleBadge,
              isStudent ? { backgroundColor: theme.colors.student + '1A' } : { backgroundColor: theme.colors.employer + '1A' }
            ]}>
              <Text style={[
                styles.roleBadgeText,
                isStudent ? { color: theme.colors.student } : { color: theme.colors.employer }
              ]}>
                {isStudent ? 'STUDENT' : 'EMPLOYER • ENTERPRISE'}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {/* Notification Button */}
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setNotifModalVisible(true)}
            >
              <Text style={styles.btnIcon}>🔔</Text>
              {unreadNotifsCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadNotifsCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity style={[styles.headerBtn, styles.logoutBtn]} onPress={logout}>
              <Text style={styles.logoutBtnText}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
      {/* Main Content Area using MainTabNavigator */}
      <MainTabNavigator isStudent={isStudent} />

      {/* Notification Drawer Modal */}
      <Modal
        visible={notifModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thông báo Hệ thống (RabbitMQ)</Text>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.notifList}>
              {notifications.length === 0 ? (
                <View style={styles.emptyNotif}>
                  <Text style={styles.emptyNotifText}>Không có thông báo mới.</Text>
                </View>
              ) : (
                notifications.map((notif) => (
                  <View key={notif.id} style={styles.notifCard}>
                    <View style={styles.notifBadgeCircle}>
                      <Text style={{ fontSize: 12 }}>🔔</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.notifTitleRow}>
                        <Text style={styles.notifTitle}>{notif.title}</Text>
                        <Text style={styles.notifTime}>{notif.time}</Text>
                      </View>
                      <Text style={styles.notifBody}>{notif.content}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>

  );
}

export default function App() {
  return (
    <AppProvider>
      <View style={{ flex: 1 }}>
        <MainAppShell />
        <Toast />
      </View>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  header: {
    height: 56,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  roleBadge: {
    marginLeft: theme.spacing.sm,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.full,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    position: 'relative',
  },
  btnIcon: {
    fontSize: 16,
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.colors.danger,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.white,
  },
  notifBadgeText: {
    color: theme.colors.white,
    fontSize: 8,
    fontWeight: 'bold',
  },
  logoutBtn: {
    width: 'auto',
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.sm,
  },
  logoutBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    paddingBottom: 30,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeText: {
    fontSize: 18,
    color: theme.colors.textMuted,
  },
  notifList: {
    padding: theme.spacing.md,
  },
  emptyNotif: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyNotifText: {
    color: theme.colors.textLight,
    fontSize: 13,
  },
  notifCard: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  notifBadgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary + '1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  notifTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  notifTime: {
    fontSize: 10,
    color: theme.colors.textLight,
  },
  notifBody: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  }
});
