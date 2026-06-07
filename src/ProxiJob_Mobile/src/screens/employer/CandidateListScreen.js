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

export default function CandidateListScreen() {
  const { shifts, approveStudentApplication, rejectStudentApplication, navigationParams, goBack, navigateTo } = useContext(AppContext);
  const [processingId, setProcessingId] = useState(null);

  const shiftId = navigationParams?.shiftId;
  const shift = shifts.find((s) => s.id === shiftId);

  // Filter if the shift has a student application
  const hasApplicant = shift && shift.status === 'applied';

  const handleApprove = () => {
    if (!shift) return;
    setProcessingId('approve');
    const targetId = shift.applicationId || shift.id;
    approveStudentApplication(targetId).then(() => {
      setProcessingId(null);
      navigateTo('employer_hrm');
    }).catch(() => {
      setProcessingId(null);
    });
  };

  const handleReject = () => {
    if (!shift) return;
    setProcessingId('reject');
    const targetId = shift.applicationId || shift.id;
    rejectStudentApplication(targetId).then(() => {
      setProcessingId(null);
      goBack();
    }).catch(() => {
      setProcessingId(null);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={goBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ứng Viên Đang Chờ Duyệt</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {shift && (
          <View style={styles.jobBriefCard}>
            <Text style={styles.jobLabel}>Tin tuyển dụng:</Text>
            <Text style={styles.jobTitle}>{shift.title}</Text>
            <Text style={styles.jobTime}>📅 {shift.date} • ⏰ {shift.time}</Text>
            <Text style={styles.jobRate}>💰 Lương: {(shift.hourlyRate).toLocaleString('vi-VN')} đ/h</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Danh sách đơn ứng tuyển</Text>

        {!hasApplicant ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📬</Text>
            <Text style={styles.emptyText}>Không có ứng viên nào đang chờ duyệt cho ca này.</Text>
            <Text style={styles.emptySub}>Khi có sinh viên bấm ứng tuyển, thông tin hồ sơ sẽ hiển thị tại đây.</Text>
          </View>
        ) : (
          <View style={[styles.applicantCard, theme.shadows.light]}>
            {/* Applicant Profile */}
            <View style={styles.applicantHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>VA</Text>
              </View>
              <View style={styles.applicantInfo}>
                <Text style={styles.applicantName}>Nguyễn Văn A</Text>
                <Text style={styles.applicantMeta}>🎓 Sinh viên Đại học Quốc Gia</Text>
                <View style={styles.statsRow}>
                  <Text style={styles.ratingText}>⭐ 4.9</Text>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.shiftsCompleted}>12 ca hoàn thành</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Resume/E-Portfolio link preview */}
            <View style={styles.ePortfolioBox}>
              <Text style={styles.portfolioTitle}>⚡ Hồ sơ E-Portfolio (Bảo chứng GPS)</Text>
              <Text style={styles.portfolioText}>• Tỷ lệ đúng giờ: <Text style={{fontWeight: 'bold', color: theme.colors.success}}>98%</Text></Text>
              <Text style={styles.portfolioText}>• Đánh giá từ các shop khác: 5/5 (Highlands, Katinat, Circle K)</Text>
              <Text style={styles.portfolioText}>• Quãng đường làm việc TB: 2.8 km (Gần khu vực Bến Nghé)</Text>
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                disabled={processingId !== null}
                onPress={handleReject}
              >
                {processingId === 'reject' ? (
                  <ActivityIndicator size="small" color={theme.colors.danger} />
                ) : (
                  <Text style={styles.rejectBtnText}>Từ chối</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                disabled={processingId !== null}
                onPress={handleApprove}
              >
                {processingId === 'approve' ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={styles.approveBtnText}>Duyệt Nhận Việc</Text>
                )}
              </TouchableOpacity>
            </View>
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
  jobBriefCard: {
    backgroundColor: theme.colors.surfaceSecondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  jobLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 2,
  },
  jobTime: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  jobRate: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: 'bold',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  applicantCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  applicantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.student + '1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.student,
  },
  applicantInfo: {
    flex: 1,
  },
  applicantName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  applicantMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 11,
    color: theme.colors.warning,
    fontWeight: 'bold',
  },
  bullet: {
    marginHorizontal: 6,
    color: theme.colors.textLight,
  },
  shiftsCompleted: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  ePortfolioBox: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  portfolioTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.secondary,
    marginBottom: 6,
  },
  portfolioText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  rejectBtn: {
    borderWidth: 1,
    borderColor: theme.colors.danger + '44',
  },
  approveBtn: {
    backgroundColor: theme.colors.secondary,
  },
  rejectBtnText: {
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: 'bold',
  },
  approveBtnText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: theme.spacing.lg,
  }
});
