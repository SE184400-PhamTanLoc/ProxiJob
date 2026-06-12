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
import { theme } from "./src/styles/theme";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import MainTabNavigator from "./src/navigation/MainTabNavigator";
import Toast from "./src/components/Toast";

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
  } = useContext(AppContext);
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
    if (currentScreen === "register") {
      return <RegisterScreen />;
    } else if (currentScreen === "forgot_password") {
      return <ForgotPasswordScreen />;
    } else {
      return <LoginScreen />;
    }
  }

  // Count unread notifications
  const unreadNotifsCount = notifications.filter((n) => !n.read).length;
  const isStudent = user.role === "student";

  const hideHeaderScreens = ["candidate_list", "job_detail"];
  const showHeader = !hideHeaderScreens.includes(currentScreen);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style="dark" />
      {showHeader && (
        <SafeAreaView
          edges={["top"]}
          style={{
            backgroundColor: theme.colors.white,
            zIndex: 999,
            position: "relative",
          }}
        >
          {/* Universal Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {isStudent ? (
                <>
                  <Text style={styles.logoText}>ProxiJob</Text>
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: theme.colors.student + "1A" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        { color: theme.colors.student },
                      ]}
                    >
                      STUDENT
                    </Text>
                  </View>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.headerLeftBtn}
                  onPress={() => setAvatarMenuOpen(!avatarMenuOpen)}
                  activeOpacity={0.8}
                >
                  <View style={styles.avatarWrapper}>
                    <Image
                      source={{
                        uri:
                          user?.avatarUrl ||
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
                      }}
                      style={styles.avatarImage}
                    />
                    {isEnterprise && (
                      <View style={styles.crownBadge}>
                        <Text style={styles.crownIcon}>👑</Text>
                      </View>
                    )}
                  </View>
                  <View>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text style={styles.brandTitle}>ProxiJob</Text>
                      {isEnterprise && (
                        <View style={styles.activePill}>
                          <Text style={styles.activePillText}>Enterprise</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.brandSubtitle}>
                      {isEnterprise
                        ? "Đã kích hoạt Enterprise"
                        : "Nâng cấp tài khoản"}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
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
                    <Text style={styles.notifBadgeText}>
                      {unreadNotifsCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Logout Button */}
              <TouchableOpacity
                style={[styles.headerBtn, styles.logoutBtn]}
                onPress={logout}
              >
                <Text style={styles.logoutBtnText}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar Dropdown Menu */}
          {avatarMenuOpen && !isStudent && (
            <View style={styles.dropdownMenu}>
              <Text style={styles.dropdownUser}>
                {user?.name || "Chủ quán"}
              </Text>
              <Text style={styles.dropdownEmail}>{user?.email}</Text>
              <View style={styles.dropdownDivider} />

              <View style={styles.dropdownStatusRow}>
                <Text style={styles.dropdownStatusLabel}>Gói dịch vụ:</Text>
                <Text
                  style={[
                    styles.dropdownStatusValue,
                    isEnterprise && { color: "#0A58CA", fontWeight: "800" },
                  ]}
                >
                  {user?.subscriptionTier || "Free"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setAvatarMenuOpen(false);
                  navigateTo("upgrade_package");
                }}
              >
                <Text style={styles.dropdownItemText}>
                  📋 Xem các gói dịch vụ
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dropdownItem, { borderBottomWidth: 0 }]}
                onPress={() => {
                  setAvatarMenuOpen(false);
                  logout();
                }}
              >
                <Text style={[styles.dropdownItemText, { color: "#EF4444" }]}>
                  🚪 Đăng xuất
                </Text>
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
      <AppProvider>
        <View style={{ flex: 1 }}>
          <MainAppShell />
          <Toast />
        </View>
      </AppProvider>
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
    height: 56,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    fontSize: 18,
    fontWeight: "bold",
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
    fontWeight: "bold",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    position: "relative",
  },
  btnIcon: {
    fontSize: 16,
  },
  notifBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: theme.colors.danger,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.white,
  },
  notifBadgeText: {
    color: theme.colors.white,
    fontSize: 8,
    fontWeight: "bold",
  },
  logoutBtn: {
    width: "auto",
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.sm,
  },
  logoutBtnText: {
    fontSize: 11,
    fontWeight: "bold",
    color: theme.colors.textMuted,
  },
  avatarWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2BFB0",
    marginRight: 8,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FF6B00",
    lineHeight: 18,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: "700",
    color: "#5A4136",
    opacity: 0.7,
  },
  headerLeftBtn: {
    flexDirection: "row",
    alignItems: "center",
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
  activePill: {
    backgroundColor: "#0A58CA1F",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 6,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0A58CA",
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
    top: 56,
    left: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    width: 220,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 9999,
  },
  dropdownUser: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
  },
  dropdownEmail: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },
  dropdownStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderRadius: 8,
  },
  dropdownStatusLabel: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "600",
  },
  dropdownStatusValue: {
    fontSize: 11,
    color: "#1F2937",
    fontWeight: "700",
  },
  dropdownItem: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
});
