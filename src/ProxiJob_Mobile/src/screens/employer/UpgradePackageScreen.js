import React, { useContext, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';

export default function UpgradePackageScreen() {
  const { setIsEnterprise, upgradeRedirectScreen, navigateTo, goBack, showToast } = useContext(AppContext);
  const [loading, setLoading] = useState(false);

  const handleUpgrade = () => {
    setLoading(true);
    // Simulate payment transaction
    setTimeout(() => {
      setIsEnterprise(true);
      setLoading(false);
      showToast('Nâng cấp gói Enterprise thành công! Đã mở khóa toàn bộ tính năng.', 'success');
      
      // Navigate to previous page or default
      if (upgradeRedirectScreen) {
        navigateTo(upgradeRedirectScreen);
      } else {
        navigateTo('employer_hrm');
      }
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={goBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nâng Cấp Gói Dịch Vụ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerEmoji}>🏢</Text>
          <Text style={styles.bannerTitle}>ProxiJob Enterprise</Text>
          <Text style={styles.bannerSubtitle}>Giải pháp quản trị nhân sự & tối ưu chi phí vận hành cho chủ quán</Text>
        </View>

        {/* Feature List */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Tính năng độc quyền Enterprise:</Text>
          
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureName}>HRM Lite (Quản lý nhân sự lẻ & nội bộ)</Text>
              <Text style={styles.featureDesc}>Lưu trữ không giới hạn hồ sơ nhân viên, phân nhóm theo ca làm việc.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureName}>Ma Trận Xếp Lịch Tự Động (Scheduling)</Text>
              <Text style={styles.featureDesc}>Thuật toán tự động sắp lịch tránh trùng ca, gửi thông báo nhắc lịch tự động.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureName}>Giám sát GPS thời gian thực (Live Ops)</Text>
              <Text style={styles.featureDesc}>Theo dõi bản đồ check-in GPS và tình trạng hiện diện thực tế của sinh viên.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureName}>Quyết toán lương tức thì (Payroll)</Text>
              <Text style={styles.featureDesc}>Tính giờ công chính xác theo phút dựa trên check-in/out, xuất file Excel kết toán.</Text>
            </View>
          </View>
        </View>

        {/* Pricing Card */}
        <View style={[styles.pricingCard, theme.shadows.medium]}>
          <Text style={styles.pricingBadge}>PHỔ BIẾN NHẤT</Text>
          <Text style={styles.pricingName}>Gói Thành Viên Vàng</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceValue}>1.999.000 đ</Text>
            <Text style={styles.priceUnit}> / tháng</Text>
          </View>
          <Text style={styles.priceSave}>Tiết kiệm 20% khi thanh toán gói 6 tháng</Text>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.upgradeBtn}
            disabled={loading}
            onPress={handleUpgrade}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.upgradeBtnText}>NÂNG CẤP NGAY ⚡</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.pricingFooter}>Hủy gói bất cứ lúc nào. Hoàn tiền trong 3 ngày nếu không hài lòng.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: theme.colors.secondary + '0A',
    borderColor: theme.colors.secondary + '33',
    borderWidth: 1.5,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  bannerEmoji: {
    fontSize: 40,
    marginBottom: theme.spacing.sm,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.secondary,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  featuresSection: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: theme.spacing.sm,
  },
  featureIcon: {
    fontSize: 18,
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  featureName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  featureDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  pricingCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.secondary,
    borderWidth: 2,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  pricingBadge: {
    position: 'absolute',
    top: 12,
    right: -32,
    backgroundColor: theme.colors.secondary,
    color: theme.colors.white,
    fontSize: 8,
    fontWeight: 'bold',
    paddingVertical: 4,
    paddingHorizontal: 36,
    transform: [{ rotate: '45deg' }],
  },
  pricingName: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: theme.spacing.sm,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.secondary,
  },
  priceUnit: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  priceSave: {
    fontSize: 11,
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    width: '100%',
    marginVertical: theme.spacing.lg,
  },
  upgradeBtn: {
    backgroundColor: theme.colors.secondary,
    width: '100%',
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeBtnText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  pricingFooter: {
    fontSize: 9,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 14,
  }
});
