import React, { useContext, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi Tiết Công Việc</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {shift.isEmergency && (
          <View style={styles.emergencyHeader}>
            <Text style={styles.emergencyHeaderText}>🔥 TUYỂN GẤP (+30% LƯƠNG TRỰC TIẾP)</Text>
          </View>
        )}

        <View style={styles.cardHeader}>
          <Text style={styles.shopName}>{shift.shopName}</Text>
          <Text style={styles.jobTitle}>{shift.title}</Text>
          
          <View style={styles.wageBox}>
            <Text style={styles.wageLabel}>Mức lương thực nhận:</Text>
            <Text style={styles.wageValue}>{(shift.hourlyRate).toLocaleString('vi-VN')} đ / giờ</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin ca làm</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <View>
              <Text style={styles.infoLabel}>Ngày làm việc</Text>
              <Text style={styles.infoText}>{shift.date}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>⏰</Text>
            <View>
              <Text style={styles.infoLabel}>Thời gian ca làm</Text>
              <Text style={styles.infoText}>{shift.time} (4 giờ)</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Địa điểm</Text>
              <Text style={styles.infoText}>{shift.address || 'Chưa có địa chỉ'}</Text>
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
                  <Text style={[styles.infoLabel, { marginTop: 2 }]}>Cách bạn: {distanceText}</Text>
                );
              })()}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>⭐</Text>
            <View>
              <Text style={styles.infoLabel}>Đánh giá nơi làm việc</Text>
              <Text style={styles.infoText}>{shift.rating} / 5.0 ({shift.reviewsCount || 10} đánh giá)</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mô tả công việc</Text>
          <Text style={styles.bodyText}>{shift.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yêu cầu công việc</Text>
          <Text style={styles.bodyText}>• {shift.requirements}</Text>
          <Text style={styles.bodyText}>• Có mặt trước giờ nhận ca ít nhất 10 phút để quét camera và kiểm định GPS.</Text>
          <Text style={styles.bodyText}>• Trang phục chỉnh tề, thái độ làm việc nhiệt tình.</Text>
        </View>
      </ScrollView>

      {/* Footer Action */}
      <View style={styles.footer}>
        {success ? (
          <View style={styles.successBtn}>
            <Text style={styles.successBtnText}>⚡ ỨNG TUYỂN THÀNH CÔNG!</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.applyBtn,
              (isApplied || isApproved) && styles.disabledBtn
            ]}
            disabled={isApplied || isApproved || applying}
            onPress={handleApply}
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
    backgroundColor: theme.colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  backBtn: {
    backgroundColor: theme.colors.student,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.borderRadius.sm,
  },
  backBtnText: {
    color: theme.colors.white,
    fontWeight: 'bold',
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
  emergencyHeader: {
    backgroundColor: theme.colors.danger + '1A',
    borderColor: theme.colors.danger + '33',
    borderWidth: 1,
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
  },
  emergencyHeaderText: {
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardHeader: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  shopName: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 4,
    marginBottom: theme.spacing.md,
  },
  wageBox: {
    backgroundColor: theme.colors.success + '0D',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.success + '22',
  },
  wageLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  wageValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginTop: 4,
  },
  section: {
    marginBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.xs,
  },
  infoIcon: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
    marginRight: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  infoText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  bodyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginVertical: 2,
  },
  footer: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  applyBtn: {
    backgroundColor: theme.colors.student,
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: theme.colors.textLight,
  },
  applyBtnText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  successBtn: {
    backgroundColor: theme.colors.success,
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBtnText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  applyTip: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  }
});
