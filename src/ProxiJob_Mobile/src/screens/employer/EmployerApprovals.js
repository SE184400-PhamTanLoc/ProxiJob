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
    approveStudentApplication, 
    rejectStudentApplication, 
    handleLeaveRequest 
  } = useContext(AppContext);

  const [activeSegment, setActiveSegment] = useState('applications'); // 'applications' | 'leaves'

  // Filter shifts that are currently applied by a student
  const appliedShifts = shifts.filter(s => s.status === 'applied');

  // Filter pending leave requests
  const pendingLeaves = leaveRequests.filter(l => l.status === 'pending');

  const handleApproveApp = (shiftId) => {
    approveStudentApplication(shiftId);
  };

  const handleRejectApp = (shiftId) => {
    rejectStudentApplication(shiftId);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Approvals Selector Segments */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'applications' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('applications')}
        >
          <Text style={[styles.segmentText, activeSegment === 'applications' && styles.segmentTextActive]}>
            Ứng Tuyển Ca Lẻ ({appliedShifts.length})
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
        {activeSegment === 'applications' ? (
          /* Job Applications Queue */
          appliedShifts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📬</Text>
              <Text style={styles.emptyText}>Không có đơn ứng tuyển nào đang chờ duyệt.</Text>
              <Text style={styles.emptySub}>Khi sinh viên nhấn "Ứng tuyển 1-Click", hồ sơ của họ sẽ hiện ở đây.</Text>
            </View>
          ) : (
            appliedShifts.map((shift) => (
              <View key={shift.id} style={[styles.approvalCard, theme.shadows.light]}>
                <View style={styles.applicantHeader}>
                  <View style={styles.applicantAvatar}>
                    <Text style={styles.avatarText}>VA</Text>
                  </View>
                  <View style={styles.applicantInfo}>
                    <Text style={styles.applicantName}>Nguyễn Văn A</Text>
                    <Text style={styles.applicantStats}>🎓 Sinh viên • ⭐ 4.9 (12 ca thành công)</Text>
                  </View>
                </View>

                <View style={styles.shiftDetails}>
                  <Text style={styles.shiftTitleLabel}>Ca ứng tuyển:</Text>
                  <Text style={styles.shiftTitleValue}>{shift.title}</Text>
                  <Text style={styles.shiftTimeValue}>📅 {shift.date} • ⏰ {shift.time}</Text>
                  <Text style={styles.shiftPayValue}>💰 Lương dự kiến: {((shift.hourlyRate) * 4).toLocaleString('vi-VN')} đ</Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleRejectApp(shift.id)}
                  >
                    <Text style={styles.rejectBtnText}>Từ chối</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleApproveApp(shift.id)}
                  >
                    <Text style={styles.approveBtnText}>Duyệt Nhận Việc</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        ) : (
          /* Staff Leave / Shift Swap Requests Queue */
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
                  <View style={[styles.applicantAvatar, { backgroundColor: theme.colors.primary + '1A' }]}>
                    <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
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
  }
});
