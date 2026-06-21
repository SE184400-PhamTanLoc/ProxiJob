import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { AppContext } from '../context/AppContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const { login, loginWithGoogle, navigateTo, authLoading, showToast } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const validateForm = () => {
    let tempErrors = {};

    if (!email.trim()) {
      tempErrors.email = 'Email không được để trống.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        tempErrors.email = 'Định dạng email không hợp lệ.';
      }
    }

    if (!password) {
      tempErrors.password = 'Mật khẩu không được để trống.';
    } else if (password.length < 8) {
      tempErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      showToast("Vui lòng kiểm tra lại thông tin", "error");
      return;
    }
    login(email.trim(), password);
  };

  const handleGoogleLogin = () => {
    // Show role selection modal first before triggering login flow
    setShowRoleModal(true);
  };

  const handleRoleSelect = (role) => {
    setShowRoleModal(false);

    // =========================================================================
    // --- WORKFLOW TO INTEGRATE @react-native-google-signin/google-signin ---
    // 1. Install dependency: npm install @react-native-google-signin/google-signin
    // 2. Import GoogleSignin in this file:
    //    import { GoogleSignin } from '@react-native-google-signin/google-signin';
    // 3. Configure it on app load (e.g. inside a useEffect):
    //    GoogleSignin.configure({ webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com' });
    // 4. Implement the actual signing process:
    //    try {
    //      await GoogleSignin.hasPlayServices();
    //      const response = await GoogleSignin.signIn();
    //      const idToken = response.data.idToken; // Get ID Token
    //      loginWithGoogle(idToken, role);
    //    } catch (err) {
    //      console.log('Google Sign-in failed', err);
    //    }
    // =========================================================================

    // Trigger context callback using a mock Google ID Token for testing/development
    console.log('[LoginScreen] Initiating Google Sign-In with mock token and role:', role);
    loginWithGoogle('mock-google-id-token-xyz789', role);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Logo / Header Area */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../img/proxijob logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>ProxiJob</Text>
            <Text style={styles.logoSubText}>Kết nối việc làm tức thì quanh bạn trong bán kính 3-5km</Text>
          </View>

          {/* Card Body */}
          <View style={[styles.loginCard, theme.shadows.medium]}>
            <Text style={styles.cardTitle}>Đăng nhập Hệ thống</Text>



            {/* Form Inputs */}
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Tài khoản Email</Text>
              <TextInput
                style={[
                  styles.input,
                  isEmailFocused && { borderColor: theme.colors.primary, borderWidth: 1.5 },
                  errors.email && { borderColor: theme.colors.danger, borderWidth: 1.5 }
                ]}
                placeholder="Nhập địa chỉ email..."
                placeholderTextColor={theme.colors.textLight}
                value={email}
                onChangeText={(e) => {
                  setEmail(e);
                  if (errors.email) setErrors(prev => ({ ...prev, email: null }));
                }}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!authLoading}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    { paddingRight: 48, marginBottom: 0 },
                    isPasswordFocused && { borderColor: theme.colors.primary, borderWidth: 1.5 },
                    errors.password && { borderColor: theme.colors.danger, borderWidth: 1.5 }
                  ]}
                  placeholder="Nhập mật khẩu..."
                  placeholderTextColor={theme.colors.textLight}
                  value={password}
                  onChangeText={(e) => {
                    setPassword(e);
                    if (errors.password) setErrors(prev => ({ ...prev, password: null }));
                  }}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  editable={!authLoading}
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye" : "eye-off"}
                    size={20}
                    color={theme.colors.textMuted || "#6B7280"}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

              <View style={styles.forgotPasswordRow}>
                <TouchableOpacity
                  disabled={authLoading}
                  onPress={() => navigateTo('forgot_password')}
                >
                  <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                </TouchableOpacity>
              </View>

              {/* Dynamic Login Button */}
              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    { backgroundColor: theme.colors.primary },
                    authLoading && { opacity: 0.6 }
                  ]}
                  activeOpacity={0.9}
                  onPress={handleSubmit}
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.white} />
                  ) : (
                    <Text style={styles.loginButtonText}>Đăng nhập</Text>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Hoặc đăng nhập bằng</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Google Sign In Button */}
                <TouchableOpacity
                  style={[
                    styles.googleButton,
                    authLoading && { opacity: 0.7 }
                  ]}
                  activeOpacity={0.8}
                  onPress={handleGoogleLogin}
                  disabled={authLoading}
                >
                  <Ionicons name="logo-google" size={18} color="#4081EC" style={{ marginRight: 10 }} />
                  <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
                </TouchableOpacity>

                {/* Continue as Guest */}
                <TouchableOpacity
                  style={styles.guestButton}
                  onPress={() => navigateTo('student_dashboard')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="home-outline" size={16} color={theme.colors.textMuted || "#6B7280"} style={{ marginRight: 6 }} />
                  <Text style={styles.guestButtonText}>Tiếp tục xem việc làm (Khách)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Google Role Selection Modal */}
          <Modal
            visible={showRoleModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowRoleModal(false)}
          >
            <TouchableWithoutFeedback onPress={() => setShowRoleModal(false)}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Bạn đăng nhập với vai trò nào?</Text>
                    <Text style={styles.modalSubtitle}>
                      Vui lòng chọn vai trò để ProxiJob cấu hình giao diện phù hợp với nhu cầu của bạn.
                    </Text>

                    <View style={styles.roleSelectionRow}>
                      {/* Student Card */}
                      <TouchableOpacity
                        style={[styles.roleSelectCard, styles.studentSelectCard]}
                        activeOpacity={0.85}
                        onPress={() => handleRoleSelect('student')}
                      >
                        <View style={[styles.roleSelectIconContainer, { backgroundColor: theme.colors.student + '15' }]}>
                          <Ionicons name="school-outline" size={28} color={theme.colors.student} />
                        </View>
                        <Text style={[styles.roleSelectCardTitle, { color: theme.colors.student }]}>Sinh viên</Text>
                        <Text style={styles.roleSelectCardDesc}>Tìm việc làm quanh đây kiếm thêm thu nhập</Text>
                      </TouchableOpacity>

                      {/* Employer Card */}
                      <TouchableOpacity
                        style={[styles.roleSelectCard, styles.employerSelectCard]}
                        activeOpacity={0.85}
                        onPress={() => handleRoleSelect('employer')}
                      >
                        <View style={[styles.roleSelectIconContainer, { backgroundColor: theme.colors.employer + '15' }]}>
                          <Ionicons name="storefront-outline" size={28} color={theme.colors.employer} />
                        </View>
                        <Text style={[styles.roleSelectCardTitle, { color: theme.colors.employer }]}>Chủ quán</Text>
                        <Text style={styles.roleSelectCardDesc}>Đăng tin tuyển nhân sự tức thì cho cửa hàng</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setShowRoleModal(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalCloseButtonText}>Đóng</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Register Footer */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Chưa có tài khoản?</Text>
            <TouchableOpacity onPress={() => navigateTo('register')}>
              <Text
                style={[
                  styles.registerText,
                  { color: theme.colors.primary }
                ]}
              >
                Đăng ký ngay
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    marginTop: Platform.OS === 'web' ? theme.spacing.xl : 0,
  },
  logoImage: {
    width: 90,
    height: 110,
    marginBottom: -20,

  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  logoSubText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
    lineHeight: 18,
  },
  loginCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  roleTabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  activeStudentTab: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeEmployerTab: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  roleTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  activeStudentTabText: {
    color: theme.colors.student,
  },
  activeEmployerTabText: {
    color: theme.colors.employer,
  },
  formContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 11,
    marginTop: -10,
    marginBottom: 10,
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginBottom: theme.spacing.lg,
  },
  forgotText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  loginButton: {
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  footerContainer: {
    flexDirection: 'row',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  footerText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  registerText: {
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  demoNoticeContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.primary + '0B',
    borderColor: theme.colors.primary + '33',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: 10,
  },
  demoNoticeHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.warning,
    marginBottom: 4,
  },
  demoNoticeText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  eyeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#F8FAFC',
    marginTop: 0,
    width: '100%',
    maxWidth: 400,
  },
  guestButtonText: {
    color: theme.colors.textMuted || '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border || '#E5E7EB',
  },
  dividerText: {
    fontSize: 12,
    color: theme.colors.textMuted || '#6B7280',
    paddingHorizontal: 10,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: theme.borderRadius.md || 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  googleButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.56)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  roleSelectionRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    marginBottom: 24,
  },
  roleSelectCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentSelectCard: {
    borderColor: '#FFEBE0',
  },
  employerSelectCard: {
    borderColor: '#E0EBFF',
  },
  roleSelectIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleSelectCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  roleSelectCardDesc: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 15,
  },
  modalCloseButton: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  }
});
