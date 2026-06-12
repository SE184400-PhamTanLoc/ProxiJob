import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image
} from 'react-native';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';

export default function EmployerApprovals() {
  const { 
    shifts, 
    leaveRequests, 
    handleLeaveRequest,
    navigateTo,
    loadEmployerJobs,
    user
  } = useContext(AppContext);

  const [activeSegment, setActiveSegment] = useState('job_posts'); // 'job_posts' | 'leaves'

  React.useEffect(() => {
    loadEmployerJobs();
  }, []);

  // Filter pending leave requests
  const pendingLeaves = leaveRequests.filter(l => l.status === 'pending');

  // Sort leaves so pending is first, followed by approved and rejected
  const sortedLeaves = [...leaveRequests].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return 0;
  });

  // Stats calculation
  const activeShiftsCount = shifts.filter(s => s.status !== 'completed').length;
  const totalApplicantsCount = shifts.reduce((acc, s) => acc + (s.applicantCount || 0), 0);
  const simulatedViews = shifts.reduce((acc, s) => acc + (s.applicantCount || 0) * 15 + 120, 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome Block */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeGreeting}>Chào buổi sáng, {user?.name || 'Quản lý'}</Text>
          <Text style={styles.welcomeSubtitle}>
            Hôm nay bạn có {shifts.length} tin tuyển dụng cần theo dõi.
          </Text>
        </View>

        {/* Bento Stats Bar */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.statsContainer}
        >
          <View style={[styles.statsBadge, { borderLeftColor: theme.colors.primary }]}>
            <View style={[styles.statsDot, { backgroundColor: '#FF6B00' }]} />
            <Text style={styles.statsText}>{simulatedViews >= 1000 ? (simulatedViews / 1000).toFixed(1) + 'k' : simulatedViews} Lượt xem</Text>
          </View>

          <View style={[styles.statsBadge, { borderLeftColor: theme.colors.secondary }]}>
            <View style={[styles.statsDot, { backgroundColor: '#0A58CA' }]} />
            <Text style={styles.statsText}>{activeShiftsCount} Đang chạy</Text>
          </View>

          <View style={[styles.statsBadge, { borderLeftColor: '#10B981' }]}>
            <View style={[styles.statsDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.statsText}>{totalApplicantsCount} Ứng viên mới</Text>
          </View>
        </ScrollView>

        {/* Capsule Navigation Tabs */}
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

        {activeSegment === 'job_posts' ? (
          /* Job Posts Management Tab */
          <View style={styles.cardsWrapper}>
            {shifts.map((shift) => {
              const applicantCount = shift.applicantCount !== undefined ? shift.applicantCount : (shift.status === 'applied' ? 1 : 0);
              const hasApplicants = applicantCount > 0;
              return (
                <View key={shift.id} style={styles.approvalCard}>
                  {/* Futuristic Viewfinder Bracket Accents */}
                  <View style={styles.viewfinderCornerTL} />
                  <View style={styles.viewfinderCornerBR} />

                  <View style={styles.jobHeaderRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.jobShopName}>{shift.shopName.toUpperCase()}</Text>
                      <Text style={styles.jobTitleText}>{shift.title}</Text>
                    </View>
                    <View style={[
                      styles.candidateBadge,
                      hasApplicants ? styles.candidateBadgeActive : styles.candidateBadgeInactive
                    ]}>
                      <Text style={[
                        styles.candidateBadgeText,
                        hasApplicants ? styles.candidateBadgeTextActive : styles.candidateBadgeTextInactive
                      ]}>
                        Ứng viên: {applicantCount}
                      </Text>
                    </View>
                  </View>

                  {/* Info Tags */}
                  <View style={styles.infoRow}>
                    <View style={styles.infoTag}>
                      <Text style={styles.infoTagIcon}>📅</Text>
                      <Text style={styles.infoTagText}>{shift.date}</Text>
                    </View>
                    <View style={styles.infoTag}>
                      <Text style={styles.infoTagIcon}>⏰</Text>
                      <Text style={styles.infoTagText}>{shift.time}</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Footer Rate & Action */}
                  <View style={styles.postFooter}>
                    <View style={styles.rateContainer}>
                      <Text style={styles.jobHourlyRate}>
                        {(shift.hourlyRate).toLocaleString('vi-VN')} đ/h
                      </Text>
                      <Text style={[
                        styles.statusValue, 
                        shift.status === 'completed' && { color: theme.colors.textMuted },
                        shift.status === 'checkin_active' && { color: theme.colors.success },
                        shift.status === 'approved' && { color: theme.colors.secondary }
                      ]}>
                        • {shift.status === 'completed' 
                          ? 'Đã hoàn thành' 
                          : shift.status === 'checkin_active' 
                            ? 'Sinh viên đang làm' 
                            : shift.status === 'approved' 
                              ? 'Đã duyệt hồ sơ' 
                              : 'Đang hiển thị'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.actionLinkBtn}
                      disabled={!hasApplicants}
                      onPress={() => navigateTo('candidate_list', { shiftId: shift.id })}
                    >
                      <Text style={[
                        styles.actionLinkText,
                        !hasApplicants && styles.actionLinkTextDisabled
                      ]}>
                        {hasApplicants ? 'Xem ứng viên' : 'Chưa có ứng viên'}
                      </Text>
                      <Text style={[
                        styles.actionLinkChevron,
                        !hasApplicants && styles.actionLinkChevronDisabled
                      ]}>
                        {hasApplicants ? ' ➔' : ' 🔒'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          /* Leaves / Swaps Tab */
          <View style={styles.cardsWrapper}>
            {leaveRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🏖️</Text>
                <Text style={styles.emptyText}>Mọi người đều đi làm đầy đủ!</Text>
                <Text style={styles.emptySub}>Không có yêu cầu xin nghỉ hoặc đổi ca nào đang chờ duyệt.</Text>
              </View>
            ) : (
              sortedLeaves.map((request) => {
                const isPending = request.status === 'pending';
                const isSwap = request.type === 'swap';
                const isApproved = request.status === 'approved';
                const isRejected = request.status === 'rejected';

                // Styles for type tags
                let tagBg = '#E8DDFF';
                let tagColor = '#5300CD';
                let tagText = '🔄 ĐỔI CA';

                if (!isSwap) {
                  tagBg = '#FFDAD6';
                  tagColor = '#93000A';
                  tagText = '❌ XIN NGHỈ';
                }

                if (isApproved) {
                  tagBg = '#E6F4EA';
                  tagColor = '#137333';
                  tagText = '✅ ĐÃ CHẤP THUẬN';
                } else if (isRejected) {
                  tagBg = '#FCE8E6';
                  tagColor = '#C5221F';
                  tagText = '❌ ĐÃ TỪ CHỐI';
                }

                const borderLeftColor = isSwap ? '#FF6B00' : '#EF4444';

                return (
                  <View 
                    key={request.id} 
                    style={[
                      styles.approvalCard, 
                      !isPending && { opacity: 0.7, borderStyle: 'dashed', borderColor: '#8E7164' }
                    ]}
                  >
                    {/* Viewfinder brackets for pending items only */}
                    {isPending && (
                      <>
                        <View style={[styles.viewfinderCornerTL, { borderColor: isSwap ? '#5B00DF' : '#FF6B00' }]} />
                        <View style={[styles.viewfinderCornerBR, { borderColor: isSwap ? '#5B00DF' : '#FF6B00' }]} />
                      </>
                    )}

                    {/* Tag Header Row */}
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.typeTag, { backgroundColor: tagBg }]}>
                        <Text style={[styles.typeTagText, { color: tagColor }]}>{tagText}</Text>
                      </View>
                    </View>

                    {/* Employee Info Row */}
                    <View style={styles.applicantHeader}>
                      <View style={[styles.applicantAvatar, { backgroundColor: (isSwap ? '#5B00DF' : '#FF6B00') + '1A' }]}>
                        <Text style={[styles.avatarText, { color: isSwap ? '#5B00DF' : '#FF6B00' }]}>
                          {request.staffName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.applicantInfo}>
                        <Text style={styles.applicantName}>{request.staffName}</Text>
                        <Text style={styles.applicantStats}>👤 {request.position || 'Nhân viên'}</Text>
                      </View>
                    </View>

                    {/* Request Details Box */}
                    <View style={[styles.shiftDetailsBox, { borderLeftColor }]}>
                      <View style={styles.detailTitleRow}>
                        <Text style={styles.detailTitleIcon}>{isSwap ? '🔄' : '📅'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailTitleText}>
                            {isSwap ? 'Muốn đổi sang ca làm:' : 'Xin nghỉ ca làm:'}
                          </Text>
                          <Text style={styles.detailValueText}>
                            {request.jobTitle}
                          </Text>
                          <Text style={styles.detailTimeText}>
                            {request.shiftTime} | Ngày {request.shiftDate}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.reasonQuoteContainer}>
                        <Text style={styles.reasonQuoteText}>
                          "Lý do: {request.reason}"
                        </Text>
                      </View>
                    </View>

                    {/* Action Row for Pending Items only */}
                    {isPending && (
                      <View style={styles.actionRowCapsule}>
                        <TouchableOpacity
                          style={styles.rejectBtnCapsule}
                          onPress={() => handleLeaveRequest(request.id, 'rejected')}
                        >
                          <Text style={styles.rejectTextCapsule}>Từ chối</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.approveBtnCapsule}
                          onPress={() => handleLeaveRequest(request.id, 'approved')}
                        >
                          <Text style={styles.approveTextCapsule}>
                            {isSwap ? 'Duyệt Đổi ⚡' : 'Duyệt Nghỉ ⚡'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity 
        style={styles.floatingFab}
        onPress={() => navigateTo('employer_emergency_post')}
        activeOpacity={0.8}
      >
        <Text style={styles.floatingFabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC', // light background depth from design system
  },
  headerShell: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E9EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2BFB0',
    marginRight: 10,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  brandTitle: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '800',
    color: '#FF6B00', // Neon Orange primary
    lineHeight: 20,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5A4136',
    opacity: 0.7,
  },
  notificationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E9EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 110, // Generous padding to clear the FAB and Navigation tabs
  },
  welcomeSection: {
    marginBottom: 16,
  },
  welcomeGreeting: {
    fontFamily: 'System',
    fontSize: 22,
    fontWeight: '800',
    color: '#181C1E',
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#5A4136',
    opacity: 0.8,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
    marginBottom: 20,
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#EEF1F3',
    borderRadius: 9999,
    marginRight: 10,
    borderLeftWidth: 3,
  },
  statsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#181C1E',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E9EB',
    borderRadius: 9999,
    padding: 4,
    marginBottom: 24,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 9999,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5A4136',
  },
  segmentTextActive: {
    color: '#FF6B00', // Active brand neon orange
  },
  cardsWrapper: {
    width: '100%',
  },
  approvalCard: {
    position: 'relative', // Necessary for viewfinder corners placement
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E9EB',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 2,
  },
  viewfinderCornerTL: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: 12,
    height: 12,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FF6B00',
    borderTopLeftRadius: 6,
  },
  viewfinderCornerBR: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: '#FF6B00',
    borderBottomRightRadius: 6,
  },
  jobHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobShopName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5B00DF', // Soft Electric Violet brand color
    letterSpacing: 0.5,
  },
  jobTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#181C1E',
    marginTop: 2,
  },
  candidateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  candidateBadgeActive: {
    backgroundColor: '#FFDBCC',
  },
  candidateBadgeInactive: {
    backgroundColor: '#EEF1F3',
    opacity: 0.6,
  },
  candidateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  candidateBadgeTextActive: {
    color: '#7A3000',
  },
  candidateBadgeTextInactive: {
    color: '#5A4136',
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  infoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  infoTagIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  infoTagText: {
    fontSize: 13,
    color: '#5A4136',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E9EB',
    opacity: 0.6,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateContainer: {
    flexDirection: 'column',
  },
  jobHourlyRate: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00A86B',
  },
  statusValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5A4136',
    marginTop: 1,
  },
  actionLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B00',
  },
  actionLinkTextDisabled: {
    color: '#5A4136',
    opacity: 0.4,
  },
  actionLinkChevron: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6B00',
  },
  actionLinkChevronDisabled: {
    color: '#5A4136',
    opacity: 0.4,
  },
  floatingFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FF6B00', // Neon Orange accent
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 99,
  },
  floatingFabIcon: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#181C1E',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: '#5A4136',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  applicantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  applicantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  applicantInfo: {
    flex: 1,
  },
  applicantName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#181C1E',
  },
  applicantStats: {
    fontSize: 11,
    color: '#5A4136',
    opacity: 0.7,
    marginTop: 1,
  },
  shiftDetails: {
    backgroundColor: '#EEF1F3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  shiftTitleLabel: {
    fontSize: 10,
    color: '#5A4136',
    fontWeight: 'bold',
  },
  leaveReasonText: {
    fontSize: 13,
    color: '#181C1E',
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
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  rejectBtn: {
    borderWidth: 1,
    borderColor: '#EF4444' + '33',
  },
  approveBtn: {
    backgroundColor: '#0A58CA',
  },
  rejectBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardHeaderRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  typeTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  typeTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  shiftDetailsBox: {
    backgroundColor: '#F1F4F6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  detailTitleIcon: {
    fontSize: 18,
    marginRight: 8,
    marginTop: 2,
  },
  detailTitleText: {
    fontSize: 10,
    color: '#5A4136',
    fontWeight: '700',
  },
  detailValueText: {
    fontSize: 14,
    color: '#181C1E',
    fontWeight: '800',
    marginTop: 1,
  },
  detailTimeText: {
    fontSize: 11,
    color: '#5A4136',
    opacity: 0.8,
    marginTop: 2,
  },
  reasonQuoteContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  reasonQuoteText: {
    fontSize: 12,
    color: '#181C1E',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionRowCapsule: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtnCapsule: {
    flex: 1,
    height: 40,
    borderRadius: 9999,
    backgroundColor: '#E5E9EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtnCapsule: {
    flex: 2,
    height: 40,
    borderRadius: 9999,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  rejectTextCapsule: {
    color: '#5A4136',
    fontSize: 12,
    fontWeight: '800',
  },
  approveTextCapsule: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  }
});
