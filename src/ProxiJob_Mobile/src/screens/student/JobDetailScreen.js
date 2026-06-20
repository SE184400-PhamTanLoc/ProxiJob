import React, { useContext, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';

export default function JobDetailScreen() {
  const { shifts, applyToShift, navigationParams, goBack, navigateTo, studentCoords, getDistanceInMeters } = useContext(AppContext);
  const [applying, setApplying] = useState(false);
  const [success, setSuccess] = useState(false);

  const shiftId = navigationParams?.shiftId;
  const shift = shifts.find((s) => s.id === shiftId);

  if (!shift) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Không tìm thấy thông tin công việc!</Text>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleApply = async () => {
    setApplying(true);
    const ok = await applyToShift(shift.id);
    setApplying(false);
    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        navigateTo('student_calendar');
      }, 1500);
    }
  };

  const isApplied = shift.status === 'applied';
  const isApproved = shift.status === 'approved' || shift.status === 'checkin_active' || shift.status === 'completed';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi Tiết Công Việc</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {shift.isEmergency && (
          <View style={styles.emergencyHeader}>
            <Ionicons name="flash" size={16} color={theme.colors.danger} style={{ marginRight: 6 }} />
            <Text style={styles.emergencyHeaderText}>TUYỂN GẤP (+30% LƯƠNG TRỰC TIẾP)</Text>
          </View>
        )}

        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{shift.shopName || 'Cửa hàng'}</Text>
          </View>
          <Text style={styles.jobTitle}>{shift.title}</Text>
          
          <View style={styles.wageBox}>
            <View>
              <Text style={styles.wageLabel}>Mức lương thực nhận</Text>
              <Text style={styles.wageValue}>
                {(shift.hourlyRate).toLocaleString('vi-VN')} <Text style={styles.wageUnit}>đ/giờ</Text>
              </Text>
            </View>
            <View style={styles.instantPayBadge}>
              <Ionicons name="flash-sharp" size={12} color="#10B981" style={{ marginRight: 2 }} />
              <Text style={styles.instantPayText}>Liền ca</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionIndicator} />
            <Text style={styles.sectionTitle}>Thông tin ca làm</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="calendar-outline" size={18} color="#FF6B00" />
            </View>
            <View style={styles.infoMeta}>
              <Text style={styles.infoLabel}>Ngày làm việc</Text>
              <Text style={styles.infoText}>{shift.date}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="time-outline" size={18} color="#FF6B00" />
            </View>
            <View style={styles.infoMeta}>
              <Text style={styles.infoLabel}>Thời gian ca làm</Text>
              <Text style={styles.infoText}>{shift.time} (4 giờ)</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="location-outline" size={18} color="#FF6B00" />
            </View>
            <View style={[styles.infoMeta, { flex: 1 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.infoLabel}>Địa điểm</Text>
                {(() => {
                  const hasGps = shift.latitude && shift.longitude && !(shift.latitude === 0 && shift.longitude === 0);
                  let distanceText = 'Chưa định vị';
                  if (hasGps && studentCoords) {
                    const distMeters = getDistanceInMeters(
                      studentCoords.latitude,
                      studentCoords.longitude,
                      shift.latitude,
                      shift.longitude
                    );
                    const distKm = (distMeters / 1000).toFixed(1);
                    distanceText = `${distKm} km`;
                  }
                  return (
                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceBadgeText}>Cách bạn: {distanceText}</Text>
                    </View>
                  );
                })()}
              </View>
              <Text style={styles.infoText} numberOfLines={2}>{shift.address || 'Chưa có địa chỉ'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="star-outline" size={18} color="#FF6B00" />
            </View>
            <View style={styles.infoMeta}>
              <Text style={styles.infoLabel}>Đánh giá nơi làm việc</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Ionicons name="star" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={styles.infoText}>{shift.rating} / 5.0</Text>
                <Text style={styles.reviewsCountText}> ({shift.reviewsCount || 10} đánh giá)</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionIndicator} />
            <Text style={styles.sectionTitle}>Mô tả công việc</Text>
          </View>
          <Text style={styles.bodyText}>{shift.description}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionIndicator} />
            <Text style={styles.sectionTitle}>Yêu cầu công việc</Text>
          </View>
          
          <View style={styles.requirementItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#FF6B00" style={styles.bulletIcon} />
            <Text style={styles.requirementText}>{shift.requirements}</Text>
          </View>
          <View style={styles.requirementItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#FF6B00" style={styles.bulletIcon} />
            <Text style={styles.requirementText}>Có mặt trước giờ nhận ca ít nhất 10 phút để quét camera và kiểm định GPS.</Text>
          </View>
          <View style={styles.requirementItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#FF6B00" style={styles.bulletIcon} />
            <Text style={styles.requirementText}>Trang phục chỉnh tề, thái độ làm việc nhiệt tình.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Action */}
      <View style={[styles.footer, theme.shadows.medium]}>
        {success ? (
          <View style={styles.successBtn}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.successBtnText}>ỨNG TUYỂN THÀNH CÔNG!</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.applyBtn,
              (isApplied || isApproved) && styles.disabledBtn
            ]}
            disabled={isApplied || isApproved || applying}
            onPress={handleApply}
            activeOpacity={0.8}
          >
            {applying ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.applyBtnText}>
                {isApproved ? 'ĐÃ ĐƯỢC DUYỆT NHẬN VIỆC' : isApplied ? 'ĐÃ ỨNG TUYỂN - CHỜ DUYỆT' : 'ỨNG TUYỂN NGAY ⚡'}
              </Text>
            )}
          </TouchableOpacity>
        )}
        <Text style={styles.applyTip}>Tuyển dụng Hyperlocal tức thì. Chủ quán duyệt hồ sơ trong vòng 5 phút!</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 15,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  backBtn: {
    backgroundColor: theme.colors.student,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  backBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 140,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  emergencyHeaderText: {
    color: theme.colors.danger,
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 12,
    fontWeight: '800',
  },
  cardHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
    marginBottom: 8,
  },
  categoryText: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jobTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 28,
    marginBottom: 16,
  },
  wageBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  wageLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  wageValue: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  wageUnit: {
    fontSize: 13,
    fontWeight: '500',
  },
  instantPayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  instantPayText: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIndicator: {
    width: 3,
    height: 16,
    backgroundColor: '#FF6B00',
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FF6B000F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  infoMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  infoLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  infoText: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
  },
  distanceBadge: {
    backgroundColor: '#FF6B0014',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 99,
  },
  distanceBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B00',
  },
  reviewsCountText: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  bodyText: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 13,
    color: '#475569',
    lineHeight: 22,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 6,
  },
  bulletIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  requirementText: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  applyBtn: {
    backgroundColor: '#FF6B00',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  disabledBtn: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  applyBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  successBtn: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  applyTip: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
  }
});
