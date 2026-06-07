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
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { AppContext } from '../context/AppContext';

export default function RegisterScreen() {
  const { register, navigateTo, authLoading, selectedRole, setSelectedRole } = useContext(AppContext);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);
  const [errors, setErrors] = useState({});

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setErrors({});
  };

  const validateForm = () => {
    let tempErrors = {};

    if (!fullName.trim()) {
      tempErrors.fullName = 'Họ và tên không được để trống.';
    }

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

    if (!confirmPassword) {
      tempErrors.confirmPassword = 'Xác nhận mật khẩu không được để trống.';
    } else if (confirmPassword !== password) {
      tempErrors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp.';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleRegister = async () => {
    if (validateForm()) {
      const success = await register(
        fullName.trim(),
        email.trim(),
        password,
        confirmPassword,
        selectedRole
      );
      if (success) {
        navigateTo('login');
      }
    }
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
            <View style={styles.logoBadge}>
              <Text style={styles.logoSymbol}>⚡</Text>
            </View>
            <Text style={styles.logoText}>ProxiJob</Text>
            <Text style={styles.logoSubText}>Tạo tài khoản và tham gia cùng cộng đồng tuyển dụng hyperlocal</Text>
          </View>

          {/* Card Body */}
          <View style={[styles.loginCard, theme.shadows.medium]}>
            <Text style={styles.cardTitle}>Đăng ký Tài khoản</Text>

            {/* Role Switcher Tabs */}
            <View style={styles.roleTabsContainer}>
              <TouchableOpacity
                style={[
                  styles.roleTab,
                  selectedRole === 0 && styles.activeStudentTab
                ]}
                activeOpacity={0.8}
                onPress={() => handleRoleChange(0)}
                disabled={authLoading}
              >
                <Text
                  style={[
                    styles.roleTabText,
                    selectedRole === 0 && styles.activeStudentTabText
                  ]}
                >
                  🎓 Sinh Viên
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleTab,
                  selectedRole === 1 && styles.activeEmployerTab
                ]}
                activeOpacity={0.8}
                onPress={() => handleRoleChange(1)}
                disabled={authLoading}
              >
                <Text
                  style={[
                    styles.roleTabText,
                    selectedRole === 1 && styles.activeEmployerTabText
                  ]}
                >
                  💼 Chủ Quán
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Inputs */}
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Họ và tên</Text>
              <TextInput
                style={[
                  styles.input,
                  isNameFocused && { borderColor: selectedRole === 0 ? theme.colors.student : theme.colors.employer, borderWidth: 1.5 },
                  errors.fullName && { borderColor: theme.colors.danger, borderWidth: 1.5 }
                ]}
                placeholder="Nhập họ và tên..."
                placeholderTextColor={theme.colors.textLight}
                value={fullName}
                onChangeText={(e) => {
                  setFullName(e);
                  if (errors.fullName) setErrors(prev => ({ ...prev, fullName: null }));
                }}
                onFocus={() => setIsNameFocused(true)}
                onBlur={() => setIsNameFocused(false)}
                autoCapitalize="words"
                editable={!authLoading}
              />
              {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}

              <Text style={styles.inputLabel}>Tài khoản Email</Text>
              <TextInput
                style={[
                  styles.input,
                  isEmailFocused && { borderColor: selectedRole === 0 ? theme.colors.student : theme.colors.employer, borderWidth: 1.5 },
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

              <Text style={styles.inputLabel}>Mật khẩu (tối thiểu 8 ký tự)</Text>
              <TextInput
                style={[
                  styles.input,
                  isPasswordFocused && { borderColor: selectedRole === 0 ? theme.colors.student : theme.colors.employer, borderWidth: 1.5 },
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
                secureTextEntry
                editable={!authLoading}
              />
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

              <Text style={styles.inputLabel}>Xác nhận mật khẩu</Text>
              <TextInput
                style={[
                  styles.input,
                  isConfirmPasswordFocused && { borderColor: selectedRole === 0 ? theme.colors.student : theme.colors.employer, borderWidth: 1.5 },
                  errors.confirmPassword && { borderColor: theme.colors.danger, borderWidth: 1.5 }
                ]}
                placeholder="Nhập lại mật khẩu..."
                placeholderTextColor={theme.colors.textLight}
                value={confirmPassword}
                onChangeText={(e) => {
                  setConfirmPassword(e);
                  if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: null }));
                }}
                onFocus={() => setIsConfirmPasswordFocused(true)}
                onBlur={() => setIsConfirmPasswordFocused(false)}
                secureTextEntry
                editable={!authLoading}
              />
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

              {/* Register Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  selectedRole === 0
                    ? { backgroundColor: theme.colors.student }
                    : { backgroundColor: theme.colors.employer },
                  authLoading && { opacity: 0.6 }
                ]}
                activeOpacity={0.9}
                onPress={handleRegister}
                disabled={authLoading}
              >
                {authLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={styles.loginButtonText}>Đăng ký tài khoản</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Footer */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Đã có tài khoản?</Text>
            <TouchableOpacity onPress={() => navigateTo('login')} disabled={authLoading}>
              <Text
                style={[
                  styles.registerText,
                  selectedRole === 0 ? { color: theme.colors.student } : { color: theme.colors.employer }
                ]}
              >
                Đăng nhập ngay
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
    minHeight: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    marginTop: Platform.OS === 'web' ? theme.spacing.xl : 0,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary + '1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  logoSymbol: {
    fontSize: 32,
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
    marginTop: 10,
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
  }
});
