import React, { useContext, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  TextInput
} from 'react-native';
import { AppContext } from '../../context/AppContext';
import * as Font from 'expo-font';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAvatarSource } from '../../utils/avatarHelper';
import { getActiveStudentProfilesApi } from '../../api/studentApi';
import { handleCallUser } from '../../utils/callHelper';
import { getApplicationsByShift } from '../../api/jobs';

export default function CandidateListScreen() {
  const {
    user,
    shifts,
    approveStudentApplication,
    rejectStudentApplication,
    navigationParams,
    goBack,
    navigateTo,
    studentCoords,
    getDistanceInMeters
  } = useContext(AppContext);

  const [processingId, setProcessingId] = useState(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const insets = useSafeAreaInsets();

  const shiftId = navigationParams?.shiftId;
  const shift = shifts.find((s) => s.id === shiftId);

  // Segment Tab state: 'applied' | 'nearby'
  const [candidateTab, setCandidateTab] = useState('applied');
  
  // Candidates State
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [errorCandidates, setErrorCandidates] = useState(null);
  const [candidateRadius, setCandidateRadius] = useState(5.0); // 5km radius default
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState({});

  // Applications State
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [errorApplications, setErrorApplications] = useState(null);

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

  const loadCandidates = async () => {
    setLoadingCandidates(true);
    setErrorCandidates(null);
    try {
      const res = await getActiveStudentProfilesApi();
      setCandidates(res || []);
    } catch (err) {
      console.log('Error loading candidates:', err);
      setErrorCandidates(err.message || 'Lỗi tải danh sách ứng viên.');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const loadApplications = async () => {
    if (!shiftId || !user?.id) return;
    setLoadingApplications(true);
    setErrorApplications(null);
    try {
      const res = await getApplicationsByShift(shiftId, user.id);
      const appsList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.items || res?.data?.items || []));
      const activeApps = appsList.filter(a => a.status !== 'Cancelled' && a.status !== 'CancelledApproved' && a.status !== 'CancelledRejected' && a.status !== 'Rejected');
      setApplications(activeApps);
    } catch (err) {
      console.log('Error loading applications:', err);
      setErrorApplications(err.message || 'Lỗi tải danh sách đơn ứng tuyển.');
    } finally {
      setLoadingApplications(false);
    }
  };

  useEffect(() => {
    if (candidateTab === 'applied') {
      loadApplications();
    } else if (candidateTab === 'nearby') {
      loadCandidates();
    }
  }, [candidateTab, shiftId, user?.id]);

  const toggleExpand = (id) => {
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Coordinates of the job post (or fallbacks)
  const activeLatitude = shift?.latitude || 10.8231;
  const activeLongitude = shift?.longitude || 106.6297;

  // Filtered list
  const filteredCandidates = candidates.map(cand => {
    let dist = Infinity;
    
    if (cand.latitude && cand.longitude) {
      const distMeters = getDistanceInMeters(
        parseFloat(activeLatitude),
        parseFloat(activeLongitude),
        parseFloat(cand.latitude),
        parseFloat(cand.longitude)
      );
      dist = Math.round((distMeters / 1000) * 10) / 10;
    }
    return { ...cand, distanceKm: dist };
  }).filter(cand => {
    if (cand.distanceKm > candidateRadius) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const nameMatch = cand.fullName?.toLowerCase().includes(query);
      const skillMatch = cand.skills?.toLowerCase().includes(query);
      const majorMatch = cand.major?.toLowerCase().includes(query);
      return nameMatch || skillMatch || majorMatch;
    }
    return true;
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  const renderEmptyState = (emoji, title, sub) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
    </View>
  );

  const renderCandidateCard = (cand, index) => {
    const isFirst = index === 0;
    const isExpanded = !!expandedIds[`candidate_${cand.userId}`];
    const avatarSource = getAvatarSource(null, cand.gender, cand.fullName);
    
    const skillList = cand.skills 
      ? cand.skills.split(',').map(s => s.trim()).filter(Boolean) 
      : [];

    return (
      <TouchableOpacity
        key={`candidate_${cand.userId}`}
        activeOpacity={0.9}
        onPress={() => toggleExpand(`candidate_${cand.userId}`)}
        style={[
          styles.accordionItem,
          isExpanded && styles.accordionItemActive
        ]}
      >
        {isFirst && (
          <>
            <View style={styles.viewfinderTL} />
            <View style={styles.viewfinderBR} />
          </>
        )}

        <View style={styles.accordionHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarWrapper}>
              <Image source={avatarSource} style={styles.avatarImage} />
            </View>

            <View style={styles.infoColumn}>
              <View style={styles.badgeRow}>
                <View style={[styles.badgeItem, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Text style={[styles.badgeText, { color: '#10B981' }]}>ONLINE</Text>
                </View>
                <View style={[styles.badgeItem, { backgroundColor: '#EBEEF0' }]}>
                  <Text style={[styles.badgeText, { color: '#5A4136' }]}>
                    {cand.distanceKm === Infinity ? 'Không rõ vị trí' : `${cand.distanceKm} km`}
                  </Text>
                </View>
              </View>
              <Text style={styles.staffNameText} numberOfLines={1}>
                {cand.fullName}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.actionsRow}>
              {cand.phoneNumber ? (
                <TouchableOpacity
                  style={[styles.actionBtnCall, { marginRight: 8 }]}
                  activeOpacity={0.7}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleCallUser(cand.phoneNumber);
                  }}
                >
                  <Text style={styles.actionBtnCallText}>📞</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.actionBtnChat}
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  navigateTo('employer_chat', {
                    partnerId: cand.userId,
                    partnerName: cand.fullName,
                    partnerPhone: cand.phoneNumber,
                    partnerGender: cand.gender
                  });
                }}
              >
                <Text style={styles.actionBtnChatText}>💬</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.chevronIcon, isExpanded && styles.chevronIconRotated]}>
              ▼
            </Text>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.accordionContentContainer}>
            <View style={styles.accordionInnerCard}>
              <View style={styles.grid2Col}>
                <View style={styles.gridCol}>
                  <Text style={styles.metaLabelText}>TRƯỜNG HỌC</Text>
                  <Text style={styles.metaValueText} numberOfLines={1}>
                    {cand.school || 'Chưa cập nhật'}
                  </Text>
                </View>
                <View style={styles.gridCol}>
                  <Text style={styles.metaLabelText}>CHUYÊN NGÀNH</Text>
                  <Text style={styles.metaValueText} numberOfLines={1}>
                    {cand.major || 'Chưa cập nhật'}
                  </Text>
                </View>
              </View>

              <View style={[styles.grid2Col, { marginTop: 8 }]}>
                <View style={styles.gridCol}>
                  <Text style={styles.metaLabelText}>ĐIỂM UY TÍN</Text>
                  <View style={styles.ratingWrapper}>
                    <Text style={styles.metaValueText}>
                      {cand.reputationScore ? parseFloat(cand.reputationScore).toFixed(1) : '5.0'}
                    </Text>
                    <Text style={styles.starIconYellow}>★</Text>
                    <Text style={[styles.detailsBodyText, { marginBottom: 0, marginLeft: 4, fontSize: 11, color: '#64748B' }]}>
                      ({cand.reviewCount || 0} lượt)
                    </Text>
                  </View>
                </View>
                <View style={styles.gridCol}>
                  <Text style={styles.metaLabelText}>SỐ ĐIỆN THOẠI</Text>
                  <Text style={styles.metaValueText}>{cand.phoneNumber || 'Không hiển thị'}</Text>
                </View>
              </View>

              {cand.bio ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.metaLabelText}>GIỚI THIỆU BẢN THÂN</Text>
                  <Text style={styles.detailsBodyText}>{cand.bio}</Text>
                </View>
              ) : null}

              {skillList.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.metaLabelText}>KỸ NĂNG NỔI BẬT</Text>
                  <View style={styles.skillsBadgeRow}>
                    {skillList.map((skill, sIdx) => (
                      <View key={sIdx} style={styles.skillBadge}>
                        <Text style={styles.skillBadgeText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const handleApprove = (appId) => {
    if (!appId) return;
    setProcessingId(`approve_${appId}`);
    approveStudentApplication(appId).then(() => {
      setProcessingId(null);
      loadApplications();
    }).catch(() => {
      setProcessingId(null);
    });
  };

  const handleReject = (appId) => {
    if (!appId) return;
    setProcessingId(`reject_${appId}`);
    rejectStudentApplication(appId).then(() => {
      setProcessingId(null);
      loadApplications();
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

        {/* Capsule Tab Selector - 2 tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, candidateTab === 'applied' && styles.tabBtnActive]}
            onPress={() => setCandidateTab('applied')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, candidateTab === 'applied' && styles.tabTextActive]}>
              Đơn ứng tuyển
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, candidateTab === 'nearby' && styles.tabBtnActive]}
            onPress={() => setCandidateTab('nearby')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, candidateTab === 'nearby' && styles.tabTextActive]}>
              Ứng viên lân cận
            </Text>
          </TouchableOpacity>
        </View>

        {candidateTab === 'applied' ? (
          <>
            <Text style={styles.sectionTitle}>DANH SÁCH ĐƠN ỨNG TUYỂN</Text>

            {loadingApplications ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color="#FF6B00" />
                <Text style={styles.loadingText}>Đang tải danh sách đơn ứng tuyển...</Text>
              </View>
            ) : errorApplications ? (
              <View style={styles.centerLoading}>
                <Text style={styles.errorText}>{errorApplications}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={loadApplications}>
                  <Text style={styles.retryBtnText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : applications.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📬</Text>
                <Text style={styles.emptyTitle}>Chưa có ứng viên nào</Text>
                <Text style={styles.emptySub}>Khi có sinh viên ứng tuyển, thông tin và hồ sơ bảo chứng GPS sẽ xuất hiện tại đây.</Text>
              </View>
            ) : (
              applications.map((app) => (
                <View key={`app_${app.id}`} style={[styles.applicantCard, { marginBottom: 16 }]}>
                  {/* Viewfinder Accent Brackets */}
                  <View style={styles.viewfinderTL} />
                  <View style={styles.viewfinderBR} />

                  {/* Applicant Profile */}
                  <View style={styles.applicantHeader}>
                    <Image 
                      source={getAvatarSource(app.studentAvatarUrl, null, app.studentName)} 
                      style={styles.avatar} 
                    />
                    <View style={styles.applicantInfo}>
                      <Text style={styles.applicantName}>{app.studentName || 'Nguyễn Văn A'}</Text>
                      <View style={styles.schoolBadge}>
                        <Text style={styles.schoolBadgeText}>🎓 {app.studentSchool || 'Đại Học Quốc Gia TP.HCM'}</Text>
                      </View>
                      <View style={styles.statsRow}>
                        <Text style={styles.ratingText}>★ {app.studentReputationScore ? app.studentReputationScore.toFixed(1) : '5.0'}</Text>
                        <View style={styles.statsDivider} />
                        <Text style={styles.shiftsCompleted}>{app.studentReviewCount || 0} ca làm</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Resume/E-Portfolio link preview */}
                  <View style={styles.ePortfolioBox}>
                    <Text style={styles.portfolioTitle}>⚡ HỒ SƠ E-PORTFOLIO (BẢO CHỨNG GPS)</Text>
                    
                    {app.studentReviewCount > 0 ? (
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
                            Đánh giá từ các cửa hàng: <Text style={styles.portfolioHighlight}>{app.studentReputationScore ? app.studentReputationScore.toFixed(1) : '5.0'} ★</Text> (Highlands, Katinat, Circle K)
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
                  {(app.studentMajor || app.studentBio || app.studentSkills) ? (
                    <View style={[styles.ePortfolioBox, { marginTop: 0, marginBottom: 20, borderColor: '#E5E9EB', backgroundColor: '#FFFFFF' }]}>
                      <Text style={[styles.portfolioTitle, { color: '#5B00DF' }]}>📝 HỒ SƠ CÁ NHÂN CHI TIẾT</Text>
                      {app.studentMajor ? (
                        <View style={styles.portfolioRow}>
                          <Text style={styles.portfolioDot}>•</Text>
                          <Text style={styles.portfolioText}>
                            Chuyên ngành: <Text style={styles.portfolioHighlight}>{app.studentMajor}</Text> (Năm {app.studentYearOfStudy || 1})
                          </Text>
                        </View>
                      ) : null}
                      {app.studentSkills ? (
                        <View style={styles.portfolioRow}>
                          <Text style={styles.portfolioDot}>•</Text>
                          <Text style={styles.portfolioText}>
                            Kỹ năng: <Text style={styles.portfolioHighlight}>{app.studentSkills}</Text>
                          </Text>
                        </View>
                      ) : null}
                      {app.studentBio ? (
                        <View style={styles.portfolioRow}>
                          <Text style={styles.portfolioDot}>•</Text>
                          <Text style={styles.portfolioText}>
                            Giới thiệu: <Text style={[styles.portfolioHighlight, { fontWeight: '400', fontStyle: 'italic' }]}>"{app.studentBio}"</Text>
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Actions */}
                  <View style={styles.actionRow}>
                    {app.status === 'Approved' || app.status === 'CheckedIn' || app.status === 'CheckIn' || app.status === 'Completed' ? (
                      <View style={[styles.actionBtn, styles.approveBtn, { backgroundColor: '#10B981', flex: 1, height: 46, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ fontFamily: FONT_BOLD, color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>✓ Đã duyệt nhận việc</Text>
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.rejectBtn]}
                          disabled={processingId !== null}
                          onPress={() => handleReject(app.id)}
                          activeOpacity={0.8}
                        >
                          {processingId === `reject_${app.id}` ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                          ) : (
                            <Text style={styles.rejectBtnText}>Từ chối</Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.approveBtn]}
                          disabled={processingId !== null}
                          onPress={() => handleApprove(app.id)}
                          activeOpacity={0.85}
                        >
                          {processingId === `approve_${app.id}` ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.approveBtnText}>Duyệt nhận việc</Text>
                          )}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <View style={styles.nearbyContainer}>
            {/* Radius Options Selector */}
            <View style={styles.radiusContainer}>
              <Text style={styles.radiusLabel}>
                Bán kính quanh địa điểm tin tuyển dụng: <Text style={{ color: '#FF6B00', fontWeight: 'bold' }}>{candidateRadius.toFixed(1)} km</Text>
              </Text>
              <View style={styles.sliderTrackContainer}>
                {[3.0, 5.0, 8.0, 10.0, 20.0].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.radiusOption, candidateRadius === r && styles.activeRadius]}
                    onPress={() => setCandidateRadius(r)}
                  >
                    <Text style={[styles.radiusOptionText, candidateRadius === r && styles.activeRadiusText]}>{r}km</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Search input for candidates */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm theo tên hoặc kỹ năng..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== '' && (
                <TouchableOpacity style={styles.clearBtn} onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* List Content */}
            {loadingCandidates ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color="#FF6B00" />
                <Text style={styles.loadingText}>Đang quét tìm ứng viên lân cận địa điểm...</Text>
              </View>
            ) : errorCandidates ? (
              <View style={styles.centerLoading}>
                <Text style={styles.errorText}>{errorCandidates}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={loadCandidates}>
                  <Text style={styles.retryBtnText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : filteredCandidates.length === 0 ? (
              renderEmptyState('🔍', 'Không tìm thấy ứng viên lân cận', `Không tìm thấy ứng viên sẵn sàng nhận việc nào trong bán kính ${candidateRadius}km quanh địa điểm này.`)
            ) : (
              filteredCandidates.map((cand, idx) => renderCandidateCard(cand, idx))
            )}
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
  },
  // ─── Capsule Tab Selector ──────────────────
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FF6B00',
  },

  // ─── Nearby Candidate container ────────────
  nearbyContainer: {
    paddingBottom: 20,
  },
  radiusContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EBEEF0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  radiusLabel: {
    fontFamily: FONT_REGULAR,
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  sliderTrackContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 9999,
    padding: 3,
  },
  radiusOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9999,
  },
  activeRadius: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  radiusOptionText: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    color: '#64748B',
  },
  activeRadiusText: {
    color: '#FF6B00',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#EBEEF0',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT_REGULAR,
    fontSize: 13,
    color: '#1E293B',
    height: '100%',
    padding: 0,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: 'bold',
  },
  centerLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontFamily: FONT_REGULAR,
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
  },
  errorText: {
    fontFamily: FONT_REGULAR,
    fontSize: 13,
    color: '#EF4444',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  retryBtnText: {
    fontFamily: FONT_BOLD,
    color: '#FFFFFF',
    fontSize: 12,
  },

  // ─── Candidate Accordion Cards ─────────────
  accordionItem: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EBEEF0',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  accordionItemActive: {
    borderColor: '#FF6B00',
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F4F6',
  },
  infoColumn: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  badgeItem: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: FONT_BOLD,
    fontSize: 8,
    fontWeight: getFontWeight('700'),
  },
  staffNameText: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 14,
    fontWeight: getFontWeight('800'),
    color: '#181C1E',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  actionBtnCall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnCallText: {
    fontSize: 13,
  },
  actionBtnChat: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnChatText: {
    fontSize: 13,
  },
  chevronIcon: {
    fontFamily: FONT_BOLD,
    fontSize: 10,
    color: '#94A3B8',
    marginLeft: 4,
  },
  chevronIconRotated: {
    transform: [{ rotate: '180deg' }],
    color: '#FF6B00',
  },
  accordionContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  accordionInnerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  grid2Col: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridCol: {
    flex: 1,
  },
  metaLabelText: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 9,
    fontWeight: getFontWeight('800'),
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValueText: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
    fontWeight: getFontWeight('700'),
    color: '#1E293B',
  },
  ratingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIconYellow: {
    color: '#FFB800',
    fontSize: 12,
    marginLeft: 3,
  },
  detailsBodyText: {
    fontFamily: FONT_REGULAR,
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    marginTop: 2,
    marginBottom: 6,
  },
  skillsBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  skillBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skillBadgeText: {
    fontFamily: FONT_REGULAR,
    fontSize: 10,
    color: '#64748B',
  },
});
