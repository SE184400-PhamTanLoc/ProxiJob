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
import { getPlansApi, purchasePlanApi } from '../../api/auth';

export default function UpgradePackageScreen() {
  const { setIsEnterprise, upgradeRedirectScreen, navigateTo, goBack, showToast } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [fetchingPlans, setFetchingPlans] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  React.useEffect(() => {
    async function loadPlans() {
      try {
        const data = await getPlansApi();
        setPlans(data || []);
        if (data && data.length > 0) {
          // Default to Enterprise (Id: 2) or Premium if available
          const defaultPlan = data.find(p => p.planName === 'Enterprise' || p.planName === 'Premium') || data[0];
          setSelectedPlanId(defaultPlan.id);
        }
      } catch (err) {
        console.log('Error loading plans from API:', err);
        // Fallback plans matching DB table perfectly
        const fallbackPlans = [
          { id: 1, planName: 'Free', price: 0, jobPostLimit: 3, description: 'Gói thử nghiệm cơ bản dành cho chủ quán mới' },
          { id: 2, planName: 'Enterprise', price: 499000, jobPostLimit: 999, description: 'Đầy đủ tính năng quản trị & xếp lịch tự động' },
          { id: 3, planName: 'PerShift', price: 15000, jobPostLimit: 1, description: 'Thanh toán lẻ cho từng ca đăng tuyển dụng' },
          { id: 4, planName: 'Basic', price: 99000, jobPostLimit: 15, description: 'Gói tháng tiết kiệm cho cửa hàng nhỏ lẻ' },
          { id: 5, planName: 'Standard', price: 199000, jobPostLimit: 999, description: 'Đăng tuyển không giới hạn tin tuyển dụng' },
          { id: 6, planName: 'Premium', price: 299000, jobPostLimit: 999, description: 'Ưu tiên hiển thị bài đăng + Quản trị HRM Lite' }
        ];
        setPlans(fallbackPlans);
        setSelectedPlanId(2); // Default to Enterprise
      } finally {
        setFetchingPlans(false);
      }
    }
    loadPlans();
  }, []);

  const handleUpgrade = async () => {
    if (!selectedPlanId) return;
    const selectedPlan = plans.find(p => p.id === selectedPlanId);
    setLoading(true);
    try {
      // Call purchase plan API
      const res = await purchasePlanApi(selectedPlanId);
      
      // Since it's a bank transfer flow, it initiates payment instructions
      showToast(`Khởi tạo đơn thanh toán gói ${selectedPlan?.planName || ''} thành công!`, 'success');
      
      // Set Enterprise state if they upgraded to a premium tier for immediate mock access in the client
      const premiumTiers = ['Enterprise', 'Premium', 'Standard'];
      if (premiumTiers.includes(selectedPlan?.planName)) {
        setIsEnterprise(true);
      } else {
        setIsEnterprise(false);
      }

      // Redirect
      if (upgradeRedirectScreen) {
        navigateTo(upgradeRedirectScreen);
      } else {
        navigateTo('employer_approvals');
      }
    } catch (err) {
      console.log('API purchase failed, using mock upgrade fallback:', err.message);
      // Mock fallback
      const premiumTiers = ['Enterprise', 'Premium', 'Standard'];
      if (premiumTiers.includes(selectedPlan?.planName)) {
        setIsEnterprise(true);
      } else {
        setIsEnterprise(false);
      }
      showToast(`Đã nâng cấp gói ${selectedPlan?.planName || ''} thành công! (Giả lập)`, 'success');
      
      if (upgradeRedirectScreen) {
        navigateTo(upgradeRedirectScreen);
      } else {
        navigateTo('employer_approvals');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={goBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn Gói Dịch Vụ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerEmoji}>🏢</Text>
          <Text style={styles.bannerTitle}>ProxiJob Business Plans</Text>
          <Text style={styles.bannerSubtitle}>Chọn gói dịch vụ phù hợp để quản trị nhân sự & tối ưu tuyển dụng</Text>
        </View>

        {/* Feature List (Quick Reference) */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Tính năng mở khóa:</Text>
          <View style={styles.featureGrid}>
            <Text style={styles.featureItemText}>🚀 Quản trị HRM Lite</Text>
            <Text style={styles.featureItemText}>🗓️ Xếp lịch tự động</Text>
            <Text style={styles.featureItemText}>📡 Live Check-in GPS</Text>
            <Text style={styles.featureItemText}>💵 Tự động quyết toán</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Danh sách gói dịch vụ khả dụng:</Text>

        {fetchingPlans ? (
          <ActivityIndicator size="large" color={theme.colors.secondary} style={{ marginVertical: 30 }} />
        ) : (
          <View style={styles.plansList}>
            {plans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const isPremiumPlan = ['Enterprise', 'Premium', 'Standard'].includes(plan.planName);
              
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    theme.shadows.light,
                    isSelected && styles.selectedPlanCard,
                    isSelected && { borderColor: theme.colors.secondary }
                  ]}
                  onPress={() => setSelectedPlanId(plan.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.planHeader}>
                    <Text style={[styles.planName, isSelected && { color: theme.colors.secondary }]}>
                      Gói {plan.planName}
                    </Text>
                    {isPremiumPlan && (
                      <View style={styles.premiumBadge}>
                        <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.planDesc}>{plan.description}</Text>
                  
                  <View style={styles.planDetailsRow}>
                    <Text style={styles.detailText}>
                      📤 Hạn mức: <Text style={styles.boldText}>{plan.jobPostLimit} tin đăng</Text>
                    </Text>
                    <Text style={styles.planPrice}>
                      {plan.price === 0 ? 'Miễn phí' : `${plan.price.toLocaleString('vi-VN')} đ`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Upgrade Action Button */}
        {!fetchingPlans && (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.upgradeBtn}
              disabled={loading || !selectedPlanId}
              onPress={handleUpgrade}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <Text style={styles.upgradeBtnText}>NÂNG CẤP NGAY ⚡</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.pricingFooter}>Gói của bạn sẽ có hiệu lực ngay lập tức. Thanh toán qua cổng BankTransfer.</Text>
          </View>
        )}
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
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  bannerEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.secondary,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  featuresSection: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItemText: {
    width: '48%',
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginVertical: 4,
  },
  plansList: {
    width: '100%',
    marginBottom: theme.spacing.lg,
  },
  planCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  selectedPlanCard: {
    borderWidth: 2,
    backgroundColor: theme.colors.secondary + '03',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  premiumBadge: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  premiumBadgeText: {
    color: theme.colors.white,
    fontSize: 8,
    fontWeight: 'bold',
  },
  planDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 16,
    marginBottom: theme.spacing.sm,
  },
  planDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border + '33',
    paddingTop: 8,
  },
  detailText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  boldText: {
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  planPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  actionSection: {
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  upgradeBtn: {
    backgroundColor: theme.colors.secondary,
    width: '100%',
    height: 46,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  upgradeBtnText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  pricingFooter: {
    fontSize: 9,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 14,
    paddingHorizontal: theme.spacing.md,
  }
});
