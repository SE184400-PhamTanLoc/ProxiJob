import React, { useContext, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AppProvider, AppContext } from "./src/context/AppContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "./src/styles/theme";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import MainTabNavigator from "./src/navigation/MainTabNavigator";
import Toast from "./src/components/Toast";
import { Ionicons } from "@expo/vector-icons";

import { getAvatarSource, isValidAvatar } from "./src/utils/avatarHelper";

const cacheBuster = Date.now();
const queryClient = new QueryClient();

function MainAppShell() {
  const {
    user,
    logout,
    notifications,
    isRestoringSession,
    currentScreen,
    isEnterprise,
    navigateTo,
    showToast,
    goBack,
    isChatRoomActive,
  } = useContext(AppContext);

  const getHeaderTitle = (screen) => {
    return null;
  };
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  if (isRestoringSession) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!user) {
    const guestAllowedScreens = ["student_dashboard", "job_detail"];
    if (!guestAllowedScreens.includes(currentScreen)) {
      if (currentScreen === "register") {
        return <RegisterScreen />;
      } else if (currentScreen === "forgot_password") {
        return <ForgotPasswordScreen />;
      } else {
        return <LoginScreen />;
      }
    }
  }

  // Count unread notifications
  const unreadNotifsCount = user ? notifications.filter((n) => !n.read).length : 0;
  const isStudent = !user || user.role === "student";

  const tier = user?.subscriptionTier?.toLowerCase() || '';
  const hasStandard = tier === 'standard' || tier === 'premium' || tier === 'enterprise';

  const hideHeaderScreens = ["candidate_list", "payment_qr", "upgrade_package", "employer_emergency_post"];
  const showHeader = !hideHeaderScreens.includes(currentScreen) && !isChatRoomActive;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style="dark" />
      {avatarMenuOpen && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setAvatarMenuOpen(false)}
        />
      )}
      {showHeader && (
        <SafeAreaView
          edges={["top"]}
          style={{
            backgroundColor: "#FFFFFF",
            zIndex: 999,
            position: "relative",
          }}
        >
          {/* Universal Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {(currentScreen === "job_detail" || currentScreen === "upgrade_package" || currentScreen === "payment_qr" || (currentScreen === "employer_profile" && hasStandard)) && (
                <TouchableOpacity
                  style={{ marginRight: 8, paddingVertical: 4, paddingRight: 4 }}
                  onPress={goBack}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={24} color="#FF6B00" />
                </TouchableOpacity>
              )}
              {getHeaderTitle(currentScreen) ? (
                <Text style={styles.headerTitleText}>{getHeaderTitle(currentScreen)}</Text>
              ) : (
                <>
                  <Image
                    source={require("./src/img/logoproxijobcamden.png")}
                    style={styles.headerLogo}
                    resizeMode="contain"
                  />
                  <Text style={styles.headerBrandText}>ProxiJob</Text>
                </>
              )}
            </View>

            <View style={styles.headerRight}>
              {user ? (
                <>
                  {/* Notification Button */}
                  <TouchableOpacity
                    style={styles.bellButton}
                    onPress={() => setNotifModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={unreadNotifsCount > 0 ? "notifications" : "notifications-outline"} size={22} color="#F59E0B" />
                    {unreadNotifsCount > 0 && (
                      <View style={styles.bellBadge}>
                        <Text style={styles.bellBadgeText}>{unreadNotifsCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Avatar Button */}
                  <TouchableOpacity
                    style={[styles.avatarTouch, isStudent ? styles.studentAvatarRing : styles.employerAvatarRing]}
                    onPress={() => setAvatarMenuOpen(!avatarMenuOpen)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={getAvatarSource(user?.avatarUrl, user?.gender, user?.name)}
                      style={[styles.headerAvatar, { borderWidth: 0 }]}
                    />
                    {!isStudent && isEnterprise && (
                      <View style={styles.crownBadge}>
                        <Text style={styles.crownIcon}>👑</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.loginHeaderBtn}
                  onPress={() => navigateTo('login')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-in-outline" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.loginHeaderBtnText}>Đăng nhập</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Avatar Dropdown Menu */}
          {avatarMenuOpen && (
            <View style={styles.dropdownMenu}>
              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeDropdownBtn}
                onPress={() => setAvatarMenuOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.closeDropdownText}>✕</Text>
              </TouchableOpacity>

              {/* Section 1: Current Plan */}
              <View style={styles.dropdownSection1}>
                <Text style={styles.dropdownStoreName}>
                  {isStudent ? (user?.name || "Sinh viên") : "DN Test ProxiJob"}
                </Text>
                <Text style={styles.dropdownEmail}>
                  {isStudent ? (user?.email || "student@proxijob.test") : "business@proxijob.test"}
                </Text>
                <View style={styles.planRow}>
                  <Text style={styles.planLabel}>
                    {isStudent ? "Vai trò:" : "Gói dịch vụ:"}
                  </Text>
                  <View style={isStudent ? styles.studentPill : styles.enterprisePill}>
                    <Text style={isStudent ? styles.studentPillText : styles.enterprisePillText}>
                      {isStudent ? "Student" : "Enterprise"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Section 2: All Packages */}
              {!isStudent && (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  activeOpacity={0.6}
                  onPress={() => {
                    setAvatarMenuOpen(false);
                    navigateTo("upgrade_package");
                  }}
                >
                  <Ionicons name="grid-outline" size={18} color="#64748B" style={styles.dropdownItemIcon} />
                  <Text style={styles.dropdownItemText}>Xem các gói dịch vụ</Text>
                </TouchableOpacity>
              )}

              {/* Section 3: Store Profile */}
              {!isStudent && (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  activeOpacity={0.6}
                  onPress={() => {
                    setAvatarMenuOpen(false);
                    navigateTo("employer_profile");
                  }}
                >
                  <Ionicons name="storefront-outline" size={18} color="#64748B" style={styles.dropdownItemIcon} />
                  <Text style={styles.dropdownItemText}>Profile của quán</Text>
                </TouchableOpacity>
              )}

              {/* Section 4: Sign Out */}
              <View style={styles.dropdownDivider} />

              <TouchableOpacity
                style={[styles.dropdownItem, { paddingBottom: 2 }]}
                activeOpacity={0.6}
                onPress={() => {
                  setAvatarMenuOpen(false);
                  logout();
                }}
              >
                <Ionicons name="log-out-outline" size={18} color="#EF4444" style={styles.dropdownItemIcon} />
                <Text style={[styles.dropdownItemText, { color: "#EF4444" }]}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      )}
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
              <Text style={styles.modalTitle}>
                Thông báo Hệ thống (RabbitMQ)
              </Text>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.notifList}>
              {notifications.length === 0 ? (
                <View style={styles.emptyNotif}>
                  <Text style={styles.emptyNotifText}>
                    Không có thông báo mới.
                  </Text>
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
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <View style={{ flex: 1 }}>
            <MainAppShell />
            <Toast />
          </View>
        </AppProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  header: {
    height: 70,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLogo: {
    width: 42,
    height: 42,
    marginRight: 12,
  },
  headerBrandText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FF6B00",
    letterSpacing: -0.5,
  },
  headerTitleText: {
    fontSize: 36,
    fontWeight: "900",
    color: "#1E293B",
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginRight: 10,
  },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444", // vibrant red
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  bellBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
  },
  avatarTouch: {
    position: "relative",
    shadowColor: "rgba(0, 0, 0, 0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  studentAvatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  employerAvatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#0A58CA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    resizeMode: "cover",
  },
  crownBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#FFD700",
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  crownIcon: {
    fontSize: 8,
    lineHeight: 10,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    paddingBottom: 30,
    maxHeight: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "bold",
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
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyNotifText: {
    color: theme.colors.textLight,
    fontSize: 13,
  },
  notifCard: {
    flexDirection: "row",
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  notifBadgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary + "1A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.sm,
  },
  notifTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: "bold",
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
  },
  dropdownMenu: {
    position: "absolute",
    top: 64,
    right: 16,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 24, // rounded-3xl
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    padding: 18, // p-4.5
    width: 272, // w-68
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
      },
    }),
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 8,
    zIndex: 99999,
  },
  dropdownSection1: {
    paddingHorizontal: 10,
    paddingBottom: 12,
  },
  dropdownStoreName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B", // deep graphite slate-800
  },
  dropdownEmail: {
    fontSize: 11,
    color: "#64748B", // muted slate-500
    marginTop: 2,
  },
  planRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#F8FAFC",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  planLabel: {
    fontSize: 11,
    color: "#475569", // slate-600
    fontWeight: "600",
  },
  enterprisePill: {
    backgroundColor: "#EFF6FF", // blue-50/80
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  enterprisePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2563EB", // blue-600
  },
  studentPill: {
    backgroundColor: "#FFF7ED", // orange-50/80
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  studentPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#EA580C", // orange-600
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 10,
    marginHorizontal: 10,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  dropdownItemIcon: {
    marginRight: 10,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155", // slate-700
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 998,
  },
  closeDropdownBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    padding: 6,
    zIndex: 10,
  },
  closeDropdownText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "bold",
  },
  loginHeaderBtn: {
    backgroundColor: "#FF6B00",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  loginHeaderBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
});
