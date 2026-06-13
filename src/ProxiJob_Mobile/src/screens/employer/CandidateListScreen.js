import React, { useContext, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image
} from 'react-native';
import { AppContext } from '../../context/AppContext';
import * as Font from 'expo-font';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAvatarSource } from '../../utils/avatarHelper';

export default function CandidateListScreen() {
  const { shifts, approveStudentApplication, rejectStudentApplication, navigationParams, goBack, navigateTo } = useContext(AppContext);
  const [processingId, setProcessingId] = useState(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const insets = useSafeAreaInsets();

  const shiftId = navigationParams?.shiftId;
  const shift = shifts.find((s) => s.id === shiftId);

  // Filter if the shift has a student application (pending or approved)
  const hasApplicant = shift && (shift.status === 'applied' || shift.status === 'approved');

  useEffect(() => {
    if (Platform.OS === 'web') {
      const linkId = 'google-fonts-plus-jakarta-sans';
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap';
        document.head.appendChild(link);
      }
      setFontsLoaded(true);
    } else {
      Font.loadAsync({
        'PlusJakartaSans-Regular': require('../../../assets/fonts/PlusJakartaSans-Regular.ttf'),
        'PlusJakartaSans-Bold': require('../../../assets/fonts/PlusJakartaSans-Bold.ttf'),
        'PlusJakartaSans-ExtraBold': require('../../../assets/fonts/PlusJakartaSans-ExtraBold.ttf')
      }).then(() => {
        setFontsLoaded(true);
      }).catch(err => {
        console.log('[ProxiJob Font Loader] CandidateList local font load failed:', err);
      });
    }
  }, []);

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

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7FAFC' }}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, height: 60 + insets.top }]}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={goBack} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ỨNG VIÊN CHỜ DUYỆT</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {shift && (
          <View style={styles.jobBriefCard}>
            {/* Viewfinder Accent Brackets for Bento design */}
            <View style={styles.viewfinderTL} />
            <View style={styles.viewfinderBR} />
            
            <Text style={styles.jobLabel}>TIN TUYỂN DỤNG</Text>
            <Text style={styles.jobTitle}>{shift.title}</Text>
            
            <View style={styles.jobMetaRow}>
              <View style={styles.jobMetaItem}>
                <Text style={styles.jobMetaIcon}>📅</Text>
                <Text style={styles.jobMetaText}>{shift.date}</Text>
              </View>
              <View style={styles.jobMetaDivider} />
              <View style={styles.jobMetaItem}>
                <Text style={styles.jobMetaIcon}>⏰</Text>
                <Text style={styles.jobMetaText}>{shift.time}</Text>
              </View>
            </View>

            <View style={styles.rateBox}>
              <Text style={styles.rateLabel}>LƯƠNG CA LÀM:</Text>
              <Text style={styles.jobRate}>
                {(shift.hourlyRate).toLocaleString('vi-VN')} đ/h
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>DANH SÁCH ĐƠN ỨNG TUYỂN</Text>

        {!hasApplicant ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📬</Text>
            <Text style={styles.emptyTitle}>Chưa có ứng viên nào</Text>
            <Text style={styles.emptySub}>Khi có sinh viên ứng tuyển, thông tin và hồ sơ bảo chứng GPS sẽ xuất hiện tại đây.</Text>
          </View>
        ) : (
          <View style={styles.applicantCard}>
            {/* Viewfinder Accent Brackets */}
            <View style={styles.viewfinderTL} />
            <View style={styles.viewfinderBR} />

            {/* Applicant Profile */}
            <View style={styles.applicantHeader}>
              <Image 
                source={getAvatarSource(shift.applicantAvatar, null, shift.applicantName)} 
                style={styles.avatar} 
              />
              <View style={styles.applicantInfo}>
                <Text style={styles.applicantName}>{shift.applicantName || 'Nguyễn Văn A'}</Text>
                <View style={styles.schoolBadge}>
                  <Text style={styles.schoolBadgeText}>🎓 {shift.applicantSchool || 'Đại Học Quốc Gia TP.HCM'}</Text>
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.ratingText}>★ {shift.applicantRating ? shift.applicantRating.toFixed(1) : '5.0'}</Text>
                  <View style={styles.statsDivider} />
                  <Text style={styles.shiftsCompleted}>{shift.applicantShiftsCount || 0} ca làm</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Resume/E-Portfolio link preview */}
            <View style={styles.ePortfolioBox}>
              <Text style={styles.portfolioTitle}>⚡ HỒ SƠ E-PORTFOLIO (BẢO CHỨNG GPS)</Text>
              
              {shift.applicantShiftsCount > 0 ? (
                <>
                  <View style={styles.portfolioRow}>
                    <Text style={styles.portfolioDot}>•</Text>
                    <Text style={styles.portfolioText}>
                      Tỷ lệ đúng giờ: <Text style={styles.portfolioHighlight}>98%</Text>
                    </Text>
                  </View>
                  
                  <View style={styles.portfolioRow}>
                    <Text style={styles.portfolioDot}>•</Text>
                    <Text style={styles.portfolioText}>
                      Đánh giá từ các cửa hàng: <Text style={styles.portfolioHighlight}>{shift.applicantRating ? shift.applicantRating.toFixed(1) : '5.0'} ★</Text> (Highlands, Katinat, Circle K)
                    </Text>
                  </View>

                  <View style={styles.portfolioRow}>
                    <Text style={styles.portfolioDot}>•</Text>
                    <Text style={styles.portfolioText}>
                      Quãng đường làm việc TB: <Text style={styles.portfolioHighlight}>2.8 km</Text> (Bán kính an toàn)
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.portfolioRow}>
                  <Text style={styles.portfolioDot}>•</Text>
                  <Text style={[styles.portfolioText, { fontStyle: 'italic', color: '#94A3B8' }]}>
                    Sinh viên mới, chưa phát sinh lịch sử làm việc & dữ liệu GPS bảo chứng.
                  </Text>
                </View>
              )}
            </View>

            {/* Academic & Intro info */}
            {(shift.applicantMajor || shift.applicantBio || shift.applicantSkills) ? (
              <View style={[styles.ePortfolioBox, { marginTop: 0, marginBottom: 20, borderColor: '#E5E9EB', backgroundColor: '#FFFFFF' }]}>
                <Text style={[styles.portfolioTitle, { color: '#5B00DF' }]}>📝 HỒ SƠ CÁ NHÂN CHI TIẾT</Text>
                {shift.applicantMajor ? (
                  <View style={styles.portfolioRow}>
                    <Text style={styles.portfolioDot}>•</Text>
                    <Text style={styles.portfolioText}>
                      Chuyên ngành: <Text style={styles.portfolioHighlight}>{shift.applicantMajor}</Text> (Năm {shift.applicantYearOfStudy || 1})
                    </Text>
                  </View>
                ) : null}
                {shift.applicantSkills ? (
                  <View style={styles.portfolioRow}>
                    <Text style={styles.portfolioDot}>•</Text>
                    <Text style={styles.portfolioText}>
                      Kỹ năng: <Text style={styles.portfolioHighlight}>{shift.applicantSkills}</Text>
                    </Text>
                  </View>
                ) : null}
                {shift.applicantBio ? (
                  <View style={styles.portfolioRow}>
                    <Text style={styles.portfolioDot}>•</Text>
                    <Text style={styles.portfolioText}>
                      Giới thiệu: <Text style={[styles.portfolioHighlight, { fontWeight: '400', fontStyle: 'italic' }]}>"{shift.applicantBio}"</Text>
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.actionRow}>
              {shift.status === 'approved' ? (
                <View style={[styles.actionBtn, styles.approveBtn, { backgroundColor: '#10B981', flex: 1, height: 46, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ fontFamily: FONT_BOLD, color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>✓ Đã duyệt nhận việc</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    disabled={processingId !== null}
                    onPress={handleReject}
                    activeOpacity={0.8}
                  >
                    {processingId === 'reject' ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Text style={styles.rejectBtnText}>Từ chối</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    disabled={processingId !== null}
                    onPress={handleApprove}
                    activeOpacity={0.85}
                  >
                    {processingId === 'approve' ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.approveBtnText}>Duyệt nhận việc</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const FONT_REGULAR = Platform.OS === 'web' ? '"Plus Jakarta Sans", sans-serif' : 'PlusJakartaSans-Regular';
const FONT_BOLD = Platform.OS === 'web' ? '"Plus Jakarta Sans", sans-serif' : 'PlusJakartaSans-Bold';
const FONT_EXTRABOLD = Platform.OS === 'web' ? '"Plus Jakarta Sans", sans-serif' : 'PlusJakartaSans-ExtraBold';

const getFontWeight = (weight) => Platform.OS === 'web' ? weight : undefined;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F4F6',
    backgroundColor: '#FFFFFF',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    color: '#5A4136',
    fontWeight: getFontWeight('700'),
  },
  headerTitle: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 16,
    fontWeight: getFontWeight('800'),
    color: '#181C1E',
    letterSpacing: -0.3,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  
  // ─── Job Brief Card ────────────────────────
  jobBriefCard: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F4F6',
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 3,
  },
  viewfinderTL: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: 12,
    height: 12,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: '#FF6B00',
    borderTopLeftRadius: 12,
    zIndex: 1,
  },
  viewfinderBR: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: '#FF6B00',
    borderBottomRightRadius: 12,
    zIndex: 1,
  },
  jobLabel: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 10,
    color: '#FF6B00',
    fontWeight: getFontWeight('800'),
    letterSpacing: 1,
    marginBottom: 6,
  },
  jobTitle: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 18,
    fontWeight: getFontWeight('800'),
    color: '#181C1E',
    letterSpacing: -0.3,
    lineHeight: 22,
    marginBottom: 10,
  },
  jobMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  jobMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobMetaIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  jobMetaText: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: '#64748B',
  },
  jobMetaDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 10,
  },
  rateBox: {
    backgroundColor: '#FFF0EA',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateLabel: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 10,
    fontWeight: getFontWeight('800'),
    color: '#7A3000',
    letterSpacing: 0.5,
  },
  jobRate: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 14,
    color: '#FF6B00',
    fontWeight: getFontWeight('800'),
  },
  
  // ─── Section Title ─────────────────────────
  sectionTitle: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 12,
    fontWeight: getFontWeight('800'),
    color: '#5A4136',
    letterSpacing: 1,
    marginBottom: 16,
  },
  
  // ─── Applicant Card ────────────────────────
  applicantCard: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F4F6',
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 3,
  },
  applicantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#E5E9EB',
  },
  applicantInfo: {
    flex: 1,
  },
  applicantName: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 18,
    fontWeight: getFontWeight('800'),
    color: '#181C1E',
  },
  schoolBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(91, 0, 223, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  schoolBadgeText: {
    fontFamily: FONT_BOLD,
    fontSize: 10,
    color: '#5B00DF',
    fontWeight: getFontWeight('700'),
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    color: '#FF6B00',
    fontWeight: getFontWeight('700'),
  },
  statsDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  shiftsCompleted: {
    fontFamily: FONT_REGULAR,
    fontSize: 11,
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F4F6',
    marginVertical: 16,
  },
  
  // ─── E-portfolio Box ──────────────────────
  ePortfolioBox: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E9EB',
    marginBottom: 20,
  },
  portfolioTitle: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 11,
    fontWeight: getFontWeight('800'),
    color: '#5B00DF',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  portfolioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  portfolioDot: {
    fontFamily: FONT_REGULAR,
    fontSize: 11,
    color: '#64748B',
    marginRight: 6,
  },
  portfolioText: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    flex: 1,
  },
  portfolioHighlight: {
    fontFamily: FONT_BOLD,
    color: '#1E293B',
    fontWeight: getFontWeight('700'),
  },
  
  // ─── Actions ───────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E9EB',
  },
  approveBtn: {
    backgroundColor: '#5B00DF',
    shadowColor: '#5B00DF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  rejectBtnText: {
    fontFamily: FONT_BOLD,
    color: '#DC2626',
    fontSize: 13,
    fontWeight: getFontWeight('700'),
  },
  approveBtnText: {
    fontFamily: FONT_BOLD,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: getFontWeight('700'),
  },
  
  // ─── Empty State ──────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 15,
    fontWeight: getFontWeight('800'),
    color: '#181C1E',
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: '#5A4136',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 32,
    lineHeight: 18,
    opacity: 0.7,
  }
});
