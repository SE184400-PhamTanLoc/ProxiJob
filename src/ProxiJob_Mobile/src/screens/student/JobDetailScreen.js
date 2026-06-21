import React, { useContext, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Share,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../context/AppContext';
import { useShiftsQuery, useApplyMutation, useEmployerJobsQuery } from '../../hooks/queries';
import { getAvatarSource } from '../../utils/avatarHelper';

export default function JobDetailScreen() {
  const {
    navigationParams,
    goBack,
    navigateTo,
    user,
    showToast,
    studentCoords,
    getDistanceInMeters,
    addNotification
  } = useContext(AppContext);

  const { data: shifts = [] } = useShiftsQuery(user, studentCoords);
  const { data: employerData } = useEmployerJobsQuery(user);
  const employerShifts = employerData?.shifts || [];
  const applyMutation = useApplyMutation(user, showToast, addNotification);

  const applyToShift = async (shiftId) => {
    return applyMutation.mutateAsync({ shiftId });
  };

  const [applying, setApplying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const shiftId = navigationParams?.shiftId;
  const shift = shifts.find((s) => s.id === shiftId) || employerShifts.find((s) => s.id === shiftId);

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
    if (!user) {
      showToast('Vui lòng đăng nhập hoặc đăng ký tài khoản để ứng tuyển công việc!', 'warning');
      navigateTo('login');
      return;
    }
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

  const handleToggleSave = () => {
    setIsSaved(!isSaved);
    showToast(!isSaved ? 'Đã lưu công việc thành công!' : 'Đã bỏ lưu công việc!', 'success');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Công việc hấp dẫn tại ProxiJob: ${shift.title} ở ${shift.shopName}. Lương ${shift.hourlyRate.toLocaleString('vi-VN')} đ/giờ!`,
      });
    } catch (error) {
      showToast('Không thể chia sẻ công việc này.', 'error');
    }
  };

  const isApplied = shift.status === 'applied';
  const isApproved = shift.status === 'approved' || shift.status === 'checkin_active' || shift.status === 'completed';

  // Helper: Get shop initials for avatar logo
  const getShopInitials = (shopName) => {
    if (!shopName) return 'PJ';
    const cleanName = shopName.replace(/(Coffee|Tea|Restaurant|Store|Shop|Quán|Café)/gi, '').trim();
    const parts = cleanName.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  };

  // Helper: Get dynamic logo background color
  const getShopBgColor = (shopName) => {
    if (!shopName) return '#EFF6FF';
    const charCode = shopName.charCodeAt(0) || 0;
    const colors = ['#FFE4E6', '#FEF3C7', '#ECFDF5', '#EFF6FF', '#F5F3FF', '#FFF7ED'];
    return colors[charCode % colors.length];
  };

  // Helper: Get dynamic logo text color
  const getShopTextColor = (shopName) => {
    if (!shopName) return '#475569';
    const charCode = shopName.charCodeAt(0) || 0;
    const colors = ['#E11D48', '#D97706', '#059669', '#2563EB', '#7C3AED', '#EA580C'];
    return colors[charCode % colors.length];
  };

  // Helper: Get experience text based on requirements
  const getExperienceText = (requirementsText) => {
    if (!requirementsText) return 'Không yêu cầu';
    const match = requirementsText.match(/(\d+)\s*(năm|tháng)\s*kinh\s*nghiệm/i) || 
                  requirementsText.match(/kinh\s*nghiệm\s*(\d+)\s*(năm|tháng)/i) || 
                  requirementsText.match(/(\d+)\+\s*(năm|tháng)/i);
    if (match) return match[0];
    if (requirementsText.toLowerCase().includes('kinh nghiệm')) return 'Có kinh nghiệm';
    return 'Không yêu cầu';
  };

  // Helper: Get dynamic skills list based on job title
  const getSkillsForJob = (title, shopName) => {
    const t = (title || '').toLowerCase();
    const s = (shopName || '').toLowerCase();
    if (t.includes('pha chế') || t.includes('barista') || s.includes('coffee') || s.includes('cafe') || s.includes('trà')) {
      return ['Pha chế chuyên nghiệp', 'Tiếng Anh giao tiếp', 'Làm việc nhóm', 'Latte Art'];
    }
    if (t.includes('phục vụ') || t.includes('waiter') || t.includes('chạy bàn')) {
      return ['Giao tiếp tự tin', 'Chăm chỉ', 'Giải quyết tình huống', 'Làm việc nhóm'];
    }
    if (t.includes('thu ngân') || t.includes('cashier')) {
      return ['Tính toán nhanh', 'Cẩn thận', 'Sử dụng POS', 'Trung thực'];
    }
    if (t.includes('bán hàng') || t.includes('sale') || t.includes('tư vấn')) {
      return ['Giao tiếp tốt', 'Thuyết phục khách hàng', 'Thân thiện', 'Đúng giờ'];
    }
    return ['Chăm chỉ', 'Đúng giờ', 'Làm việc nhóm', 'Thân thiện'];
  };

  // Helper: Parse bullet points from text
  const parseBullets = (text) => {
    if (!text) return [];
    return text
      .split(/\n|•|;\s*-/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  const getDistanceText = () => {
    if (!shift.latitude || !shift.longitude || !studentCoords) return null;
    if (shift.latitude === 0 && shift.longitude === 0) return null;
    if (!getDistanceInMeters) return null;
    const distMeters = getDistanceInMeters(
      studentCoords.latitude,
      studentCoords.longitude,
      shift.latitude,
      shift.longitude
    );
    const distKm = (distMeters / 1000).toFixed(1);
    return `Cách bạn ${distKm} km`;
  };

  // Get raw arrays of items
  const descBullets = parseBullets(shift.description);
  const reqBullets = parseBullets(shift.requirements);

  // Guarantee at least some items to keep layout robust and identical to mockup length
  const finalDescBullets = descBullets.length > 0 ? descBullets : [
    'Pha chế các loại thức uống theo tiêu chuẩn cao cấp của cửa hàng.',
    'Sáng tạo và đề xuất các công thức đồ uống mới theo mùa.',
    'Quản lý kho nguyên vật liệu và đảm bảo vệ sinh khu vực quầy bar.',
    'Đào tạo và hướng dẫn các phụ tá mới gia nhập đội ngũ.'
  ];

  const finalReqBullets = reqBullets.length > 0 ? reqBullets : [
    'Có ít nhất 1 năm kinh nghiệm ở vị trí tương đương tại các chuỗi cửa hàng.',
    'Kỹ năng giao tiếp và làm việc nhóm là một điểm cộng lớn.',
    'Ngoại hình ưa nhìn, giao tiếp tự tin và thái độ phục vụ khách hàng tốt.'
  ];

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {/* Main Job Info Card */}
        <View style={styles.mainInfoCard}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.shopLogoBox, { backgroundColor: getShopBgColor(shift.shopName) }]}>
              <Text style={[styles.shopLogoText, { color: getShopTextColor(shift.shopName) }]}>
                {getShopInitials(shift.shopName)}
              </Text>
            </View>
            <View style={styles.jobTypeTagContainer}>
              <Text style={styles.jobTypeTagText}>
                {shift.isEmergency ? 'TUYỂN GẤP ⚡' : 'TOÀN THỜI GIAN'}
              </Text>
            </View>
          </View>

          <View style={styles.jobTitleSection}>
            <Text style={styles.companyNameText}>{shift.shopName || 'CỬA HÀNG'}</Text>
            <Text style={styles.jobTitleText}>{shift.title}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={17} color="#FF6B00" style={{ marginRight: 6, marginTop: 1.5 }} />
              <Text style={styles.locationText}>
                {shift.address || 'TP. Hồ Chí Minh'}
                {getDistanceText() ? ` • ${getDistanceText()}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Job Metadata Grid */}
          <View style={styles.metadataGrid}>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>MỨC LƯƠNG</Text>
              <Text style={styles.metadataValue}>
                {shift.hourlyRate ? `${(shift.hourlyRate).toLocaleString('vi-VN')} đ` : '35.000 đ'}
              </Text>
              <Text style={styles.metadataSubLabel}>VND / Giờ</Text>
            </View>

            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>KINH NGHIỆM</Text>
              <Text style={styles.metadataValue}>
                {getExperienceText(shift.requirements)}
              </Text>
            </View>
          </View>

          <View style={[styles.metadataGrid, { marginTop: 16 }]}>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>NGÀY ĐĂNG</Text>
              <Text style={styles.metadataValue}>Hôm nay</Text>
            </View>
          </View>

          {/* Action Button */}
          {user?.role === 'employer' ? (
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={goBack}
              activeOpacity={0.8}
            >
              <View style={styles.applyBtnContent}>
                <Text style={styles.applyBtnText}>Quay lại tin tuyển</Text>
              </View>
            </TouchableOpacity>
          ) : success ? (
            <View style={styles.successBtn}>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" style={{ marginRight: 6 }} />
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
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.applyBtnContent}>
                  <Text style={styles.applyBtnText}>
                    {isApproved ? 'ĐÃ ĐƯỢC DUYỆT NHẬN VIỆC' : isApplied ? 'ĐÃ ỨNG TUYỂN - CHỜ DUYỆT' : 'Ứng tuyển ngay'}
                  </Text>
                  {!isApproved && !isApplied && (
                    <Ionicons name="flash" size={20} color="#FFFFFF" style={{ marginTop: 4 }} />
                  )}
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Bookmark & Share row */}
          <View style={styles.secondaryActionsRow}>
            <TouchableOpacity 
              style={[styles.circleActionBtn, isSaved && styles.activeCircleBtn]} 
              onPress={handleToggleSave}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isSaved ? "bookmark" : "bookmark-outline"} 
                size={22} 
                color={isSaved ? "#FF6B00" : "#475569"} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.circleActionBtn} 
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Ionicons name="share-social-outline" size={22} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Job Description Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="compass-outline" size={24} color="#B45309" />
            <Text style={styles.sectionTitleText}>Mô tả công việc</Text>
          </View>

          <View style={styles.bulletListContainer}>
            {finalDescBullets.map((bullet, idx) => (
              <View key={`desc-bullet-${idx}`} style={styles.bulletRow}>
                <View style={styles.customBulletDotOuter}>
                  <View style={styles.customBulletDotInner} />
                </View>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Candidate Requirements Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="star-outline" size={24} color="#7C3AED" />
            <Text style={styles.sectionTitleText}>Yêu cầu ứng viên</Text>
          </View>

          {/* Skill Tag Pills */}
          <View style={styles.skillsTagRow}>
            {getSkillsForJob(shift.title, shift.shopName).map((skill, idx) => (
              <View key={`skill-tag-${idx}`} style={styles.skillTagPill}>
                <Text style={styles.skillTagText}>{skill}</Text>
              </View>
            ))}
          </View>

          <View style={styles.bulletListContainer}>
            {finalReqBullets.map((bullet, idx) => (
              <View key={`req-bullet-${idx}`} style={styles.bulletRow}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#7C3AED" style={styles.checkIcon} />
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Slate soft grey background
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
    color: '#64748B',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  backBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  /* Main Info Card Styles */
  mainInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  shopLogoBox: {
    width: 68,
    height: 68,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  shopLogoText: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 24,
    fontWeight: '900',
  },
  jobTypeTagContainer: {
    backgroundColor: '#FAF5FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  jobTypeTagText: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 12,
    fontWeight: '800',
    color: '#7E22CE',
  },
  jobTitleSection: {
    marginBottom: 16,
  },
  companyNameText: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  jobTitleText: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 36,
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    backgroundColor: '#FFF7ED',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  locationText: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 14,
    fontWeight: '600',
    color: '#B45309',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  metadataGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metadataItem: {
    flex: 1,
    alignItems: 'flex-start',
  },
  metadataLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  metadataValue: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  metadataSubLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  /* Apply Button Styles */
  applyBtn: {
    backgroundColor: '#FF6B00',
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 18,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  applyBtnContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  disabledBtn: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  successBtn: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 18,
  },
  successBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  circleActionBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCircleBtn: {
    borderColor: '#FF6B0033',
    backgroundColor: '#FF6B0008',
  },
  /* Section Card Styles */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 24,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleText: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginLeft: 8,
  },
  bulletListContainer: {
    gap: 14,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  customBulletDotOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 5,
  },
  customBulletDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B45309',
  },
  checkIcon: {
    marginRight: 12,
    marginTop: 3,
  },
  bulletText: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
  },
  /* Skills Tags Styles */
  skillsTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  skillTagPill: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
  },
  skillTagText: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 13,
    fontWeight: '700',
    color: '#7E22CE',
  }
});
