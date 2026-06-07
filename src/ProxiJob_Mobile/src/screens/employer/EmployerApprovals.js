import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';

export default function EmployerApprovals() {
  const { 
    shifts, 
    leaveRequests, 
    handleLeaveRequest,
    navigateTo,
    loadEmployerJobs
  } = useContext(AppContext);

  const [activeSegment, setActiveSegment] = useState('job_posts'); // 'job_posts' | 'leaves'

  React.useEffect(() => {
    loadEmployerJobs();
  }, []);

  // Filter pending leave requests
  const pendingLeaves = leaveRequests.filter(l => l.status === 'pending');

  return (
    <SafeAreaView style={styles.container}>
      {/* Segment tabs */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'job_posts' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('job_posts')}
        >
          <Text style={[styles.segmentText, activeSegment === 'job_posts' && styles.segmentTextActive]}>
            Quản Lý Tin Đăng ({shifts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'leaves' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('leaves')}
        >
          <Text style={[styles.segmentText, activeSegment === 'leaves' && styles.segmentTextActive]}>
            Xin Nghỉ / Đổi Ca ({pendingLeaves.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeSegment === 'job_posts' ? (
          /* Job Posts Management Tab */
          <View>
            {/* Create new shift button */}
            <TouchableOpacity 
              style={[styles.createShiftBtn, theme.shadows.light]}
              onPress={() => navigateTo('employer_emergency_post')}
            >
              <Text style={styles.createShiftBtnText}>+ Tạo Ca Làm Mới ⚡</Text>
            </TouchableOpacity>

            {shifts.map((shift) => {
              const applicantCount = shift.applicantCount !== undefined ? shift.applicantCount : (shift.status === 'applied' ? 1 : 0);
              const hasApplicants = applicantCount > 0;
              return (
                <View key={shift.id} style={[styles.approvalCard, theme.shadows.light]}>
                  <View style={styles.jobHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.jobShopName}>{shift.shopName}</Text>
                      <Text style={styles.jobTitleText}>{shift.title}</Text>
                      <Text style={styles.jobTimeText}>📅 {shift.date} • ⏰ {shift.time}</Text>
                      <Text style={styles.jobHourlyRate}>💰 Lương: {(shift.hourlyRate).toLocaleString('vi-VN')} đ/h</Text>
                    </View>
                    {shift.isEmergency && (
                      <View style={styles.emergencyBadge}>
                        <Text style={styles.emergencyBadgeText}>GẤP</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.postFooter}>
                    <View style={styles.statusBox}>
                      <Text style={styles.statusLabel}>Trạng thái: </Text>
                      <Text style={[
                        styles.statusValue, 
                        shift.status === 'completed' && { color: theme.colors.textMuted },
                        shift.status === 'checkin_active' && { color: theme.colors.success },
                        shift.status === 'approved' && { color: theme.colors.secondary }
                      ]}>
                        {shift.status === 'completed' 
                          ? 'Đã hoàn thành' 
                          : shift.status === 'checkin_active' 
                            ? 'Sinh viên đang làm' 
                            : shift.status === 'approved' 
                              ? 'Đã duyệt hồ sơ' 
                              : 'Đang hiển thị'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.candidateCountBtn,
                        hasApplicants ? styles.candidateCountBtnActive : styles.candidateCountBtnInactive
                      ]}
                      onPress={() => navigateTo('candidate_list', { shiftId: shift.id })}
                    >
                      <Text style={[
                        styles.candidateCountText,
                        hasApplicants ? styles.candidateCountTextActive : styles.candidateCountTextInactive
                      ]}>
                        👥 Ứng viên: {applicantCount}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          /* Leaves / Swaps Tab */
          pendingLeaves.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏖️</Text>
              <Text style={styles.emptyText}>Mọi người đều đi làm đầy đủ!</Text>
              <Text style={styles.emptySub}>Không có yêu cầu xin nghỉ hoặc đổi ca nào đang chờ duyệt.</Text>
            </View>
          ) : (
            pendingLeaves.map((request) => (
              <View key={request.id} style={[styles.approvalCard, theme.shadows.light]}>
                <View style={styles.applicantHeader}>
                  <View style={[styles.applicantAvatar, { backgroundColor: theme.colors.secondary + '1A' }]}>
                    <Text style={[styles.avatarText, { color: theme.colors.secondary }]}>
                      {request.staffName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.applicantInfo}>
                    <Text style={styles.applicantName}>{request.staffName}</Text>
                    <Text style={styles.applicantStats}>👤 Nhân viên cố định</Text>
                  </View>
                </View>

                <View style={styles.shiftDetails}>
                  <Text style={styles.shiftTitleLabel}>Lý do xin nghỉ ca ngày {request.shiftDate}:</Text>
                  <Text style={styles.leaveReasonText}>"{request.reason}"</Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleLeaveRequest(request.id, 'rejected')}
                  >
                    <Text style={styles.rejectBtnText}>Từ chối</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleLeaveRequest(request.id, 'approved')}
                  >
                    <Text style={styles.approveBtnText}>Chấp Thuận</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
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
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSecondary,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.white,
    borderWidth: 0.5,
    borderColor: theme.colors.border,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  segmentTextActive: {
    color: theme.colors.employer,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  approvalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  applicantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  applicantAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.student + '1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarText: {
    fontSize: 14,
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
  applicantStats: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  shiftDetails: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  shiftTitleLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
  },
  shiftTitleValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 2,
  },
  shiftTimeValue: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  shiftPayValue: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: 'bold',
    marginTop: 4,
  },
  leaveReasonText: {
    fontSize: 13,
    color: theme.colors.text,
    fontStyle: 'italic',
    marginTop: 4,
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
    borderColor: theme.colors.danger + '33',
  },
  approveBtn: {
    backgroundColor: theme.colors.employer,
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
    paddingVertical: 60,
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
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: theme.spacing.lg,
    lineHeight: 18,
  },
  createShiftBtn: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  createShiftBtnText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  jobHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  jobShopName: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  jobTitleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 2,
  },
  jobTimeText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  jobHourlyRate: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: 'bold',
    marginTop: 4,
  },
  emergencyBadge: {
    backgroundColor: theme.colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emergencyBadgeText: {
    color: theme.colors.white,
    fontSize: 9,
    fontWeight: 'bold',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  statusValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  candidateCountBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
  },
  candidateCountBtnActive: {
    backgroundColor: theme.colors.student + '1A',
    borderWidth: 1,
    borderColor: theme.colors.student + '33',
  },
  candidateCountBtnInactive: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
  candidateCountText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  candidateCountTextActive: {
    color: theme.colors.student,
  },
  candidateCountTextInactive: {
    color: theme.colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  }
});
