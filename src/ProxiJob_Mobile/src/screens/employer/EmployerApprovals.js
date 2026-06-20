import React, { useState, useContext, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';
import { getCategoriesApi, getSkillsApi, getJobPostById } from '../../api/jobs';

export default function EmployerApprovals() {
  const { 
    shifts, 
    leaveRequests, 
    handleLeaveRequest,
    navigateTo,
    loadEmployerJobs,
    updateJobPostWizard,
    deleteJobPost,
    showToast,
    user
  } = useContext(AppContext);

  const [activeSegment, setActiveSegment] = useState('job_posts'); // 'job_posts' | 'leaves'

  // Categories & Skills local states
  const [categories, setCategories] = useState([
    { id: 1, name: 'Giao hàng' },
    { id: 2, name: 'Dịch vụ thú cưng' },
    { id: 3, name: 'Gia sư' },
    { id: 4, name: 'Sửa chữa' },
    { id: 5, name: 'Phục vụ' },
    { id: 6, name: 'Khác' }
  ]);
  const [skillsList, setSkillsList] = useState([
    { id: 1, name: 'Giao tiếp' },
    { id: 2, name: 'Pha chế' },
    { id: 3, name: 'Xử lý tình huống' },
    { id: 4, name: 'Tiếng Anh' },
    { id: 5, name: 'Sử dụng máy POS' },
    { id: 6, name: 'Làm việc nhóm' }
  ]);

  // Edit Modal States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('5');
  const [editDescription, setEditDescription] = useState('');
  const [editRequirements, setEditRequirements] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLatitude, setEditLatitude] = useState('');
  const [editLongitude, setEditLongitude] = useState('');
  const [editSelectedSkills, setEditSelectedSkills] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Modal States
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingShift, setDeletingShift] = useState(null);
  const [deletingJob, setDeletingJob] = useState(false);

  useEffect(() => {
    loadEmployerJobs();

    // Fetch categories and skills from backend
    getCategoriesApi().then(res => {
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.items || []));
      if (list.length > 0) setCategories(list);
    }).catch(e => console.log('Error loading categories in approvals:', e));

    getSkillsApi().then(res => {
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.items || []));
      if (list.length > 0) setSkillsList(list);
    }).catch(e => console.log('Error loading skills in approvals:', e));
  }, []);

  // Handle Delete Press
  const handleDeletePress = (shift) => {
    setDeletingShift(shift);
    setDeleteModalVisible(true);
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingShift) return;
    try {
      setDeletingJob(true);
      const success = await deleteJobPost(deletingShift.jobPostId);
      if (success) {
        setDeleteModalVisible(false);
        setDeletingShift(null);
        await loadEmployerJobs();
      }
    } catch (err) {
      console.log('Error deleting job post:', err);
      showToast('Có lỗi xảy ra khi xóa bài đăng.', 'error');
    } finally {
      setDeletingJob(false);
    }
  };

  // Handle Edit Press
  const handleEditPress = async (shift) => {
    try {
      setLoadingDetails(true);
      setEditModalVisible(true); // Open modal immediately to show loader and eliminate perceived delay
      const originalJob = await getJobPostById(shift.jobPostId);
      if (!originalJob) {
        setEditModalVisible(false);
        showToast('Không tìm thấy thông tin bài đăng gốc.', 'error');
        return;
      }
      
      setEditingJobId(originalJob.id);
      setEditTitle(originalJob.title || '');
      setEditDescription(originalJob.description || '');
      setEditRequirements(originalJob.requirements || '');
      
      const cat = categories.find(c => c.name === originalJob.categoryName);
      setEditCategoryId(cat ? String(cat.id) : '6');
      
      setEditAddress(originalJob.location?.address || '');
      setEditLatitude(String(originalJob.location?.latitude || ''));
      setEditLongitude(String(originalJob.location?.longitude || ''));
      
      const skillIds = Array.isArray(originalJob.skills) 
        ? originalJob.skills.map(s => s.id) 
        : [];
      setEditSelectedSkills(skillIds);
    } catch (err) {
      console.log('Error opening edit modal:', err);
      setEditModalVisible(false);
      showToast('Không thể tải thông tin chi tiết bài đăng.', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handle Submit Edit
  const handleSubmitEdit = async () => {
    if (!editTitle.trim()) {
      showToast('Vui lòng nhập tiêu đề!', 'warning');
      return;
    }
    if (!editDescription.trim()) {
      showToast('Vui lòng nhập mô tả!', 'warning');
      return;
    }
    if (!editAddress.trim()) {
      showToast('Vui lòng nhập địa chỉ!', 'warning');
      return;
    }

    setSavingEdit(true);
    const success = await updateJobPostWizard(editingJobId, {
      title: editTitle,
      description: editDescription,
      requirements: editRequirements,
      categoryId: editCategoryId,
      address: editAddress,
      latitude: editLatitude,
      longitude: editLongitude,
      skillIds: editSelectedSkills
    });
    setSavingEdit(false);

    if (success) {
      setEditModalVisible(false);
      await loadEmployerJobs();
    }
  };

  // Toggle skill
  const handleSkillToggle = (skillId) => {
    if (editSelectedSkills.includes(skillId)) {
      setEditSelectedSkills(editSelectedSkills.filter(id => id !== skillId));
    } else {
      setEditSelectedSkills([...editSelectedSkills, skillId]);
    }
  };

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
                    <View style={styles.headerRightContainer}>
                      <View style={[
                        styles.candidateBadge,
                        hasApplicants ? styles.candidateBadgeActive : styles.candidateBadgeInactive,
                        { marginBottom: 6 }
                      ]}>
                        <Text style={[
                          styles.candidateBadgeText,
                          hasApplicants ? styles.candidateBadgeTextActive : styles.candidateBadgeTextInactive
                        ]}>
                          Ứng viên: {applicantCount}
                        </Text>
                      </View>
                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity 
                          style={[styles.cardActionBtn, { marginRight: 8 }]} 
                          onPress={() => handleEditPress(shift)}
                        >
                          <Text style={styles.cardActionIcon}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.cardActionBtn, styles.cardActionBtnDelete]} 
                          onPress={() => handleDeletePress(shift)}
                        >
                          <Text style={styles.cardActionIcon}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
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
                      onPress={() => navigateTo('candidate_list', { shiftId: shift.id })}
                    >
                      <Text style={styles.actionLinkText}>
                        {hasApplicants ? `Xem ứng viên (${applicantCount})` : 'Tìm lân cận'}
                      </Text>
                      <Text style={styles.actionLinkChevron}>
                        {hasApplicants ? ' ➔' : ' 🔍'}
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
        <View style={styles.fabPlusHorizontal} />
        <View style={styles.fabPlusVertical} />
      </TouchableOpacity>

      {/* Edit Job Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa bài đăng</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.closeModalBtn}>
                <Text style={styles.closeModalIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingDetails ? (
              <View style={styles.modalLoaderContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.modalLoaderText}>Đang tải chi tiết bài đăng...</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.modalFormGroup}>
                  <Text style={styles.modalInputLabel}>Tiêu đề công việc</Text>
                  <TextInput
                    style={styles.modalPremiumInput}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="Nhập tiêu đề công việc..."
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={styles.modalInputLabel}>Danh mục công việc</Text>
                  <View style={styles.modalCategoryGrid}>
                    {categories.map((cat) => {
                      const isSelected = editCategoryId === String(cat.id);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.modalCategoryPill,
                            isSelected && styles.modalCategoryPillActive
                          ]}
                          onPress={() => setEditCategoryId(String(cat.id))}
                        >
                          <Text style={[
                            styles.modalCategoryPillText,
                            isSelected && styles.modalCategoryPillTextActive
                          ]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.modalInputLabel}>Mô tả công việc</Text>
                  <TextInput
                    style={[styles.modalPremiumInput, styles.modalTextArea]}
                    value={editDescription}
                    onChangeText={setEditDescription}
                    multiline
                    numberOfLines={4}
                    placeholder="Nhập mô tả chi tiết công việc..."
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={styles.modalInputLabel}>Yêu cầu đối với ứng viên</Text>
                  <TextInput
                    style={[styles.modalPremiumInput, styles.modalTextArea, { height: 80 }]}
                    value={editRequirements}
                    onChangeText={setEditRequirements}
                    multiline
                    numberOfLines={3}
                    placeholder="Nhập yêu cầu đối với ứng viên..."
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={styles.modalInputLabel}>Địa chỉ làm việc</Text>
                  <TextInput
                    style={styles.modalPremiumInput}
                    value={editAddress}
                    onChangeText={setEditAddress}
                    placeholder="Nhập địa chỉ làm việc..."
                    placeholderTextColor="#94A3B8"
                  />

                  {/* Skills Section */}
                  <Text style={styles.modalInputLabel}>Kỹ năng yêu cầu</Text>
                  <View style={styles.modalSkillsContainer}>
                    {skillsList.map((skill) => {
                      const isSelected = editSelectedSkills.includes(skill.id);
                      return (
                        <TouchableOpacity
                          key={skill.id}
                          style={[
                            styles.modalSkillPill,
                            isSelected && styles.modalSkillPillActive
                          ]}
                          onPress={() => handleSkillToggle(skill.id)}
                        >
                          <Text style={[
                            styles.modalSkillPillText,
                            isSelected && styles.modalSkillPillTextActive
                          ]}>
                            {isSelected ? '✓ ' : ''}{skill.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditModalVisible(false)}
                disabled={savingEdit}
              >
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSubmitEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Lưu thay đổi ⚡</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => {
          setDeleteModalVisible(false);
          setDeletingShift(null);
        }}
      >
        <SafeAreaView style={styles.confirmOverlay}>
          <View style={styles.confirmContent}>
            {/* Circular warning icon badge */}
            <View style={styles.warningBadge}>
              <Text style={styles.warningBadgeText}>!</Text>
            </View>

            <Text style={styles.confirmTitle}>Xác nhận xóa bài đăng</Text>
            <Text style={styles.confirmMessage}>
              Bạn có chắc chắn muốn xóa bài đăng{'\n'}
              <Text style={styles.confirmJobTitle}>"{deletingShift?.title}"</Text>?{'\n'}
              Hành động này không thể hoàn tác.
            </Text>

            <View style={styles.confirmFooter}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeletingShift(null);
                }}
                disabled={deletingJob}
              >
                <Text style={styles.confirmCancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={handleConfirmDelete}
                disabled={deletingJob}
              >
                {deletingJob ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmDeleteBtnText}>Xóa tin ⚡</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B00', // Neon Orange accent
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
    zIndex: 99,
  },
  fabPlusHorizontal: {
    position: 'absolute',
    left: 18,
    top: 26,
    width: 20,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  fabPlusVertical: {
    position: 'absolute',
    left: 26,
    top: 18,
    width: 4,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
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
  },
  headerRightContainer: {
    alignItems: 'flex-end',
  },
  cardActionsRow: {
    flexDirection: 'row',
  },
  cardActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF1F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E9EB',
  },
  cardActionBtnDelete: {
    backgroundColor: '#FFDAD6',
    borderColor: '#FFDAD6',
  },
  cardActionIcon: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 28, 30, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    display: 'flex',
    flexDirection: 'column',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E9EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#181C1E',
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF1F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalIcon: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5A4136',
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  modalFormGroup: {
    marginBottom: 20,
  },
  modalInputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  modalPremiumInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  modalCategoryPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 99,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalCategoryPillActive: {
    backgroundColor: '#FF6B001F',
    borderColor: '#FF6B00',
  },
  modalCategoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  modalCategoryPillTextActive: {
    color: '#FF6B00',
  },
  modalSkillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  modalSkillPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 99,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalSkillPillActive: {
    backgroundColor: '#FF6B001F',
    borderColor: '#FF6B00',
  },
  modalSkillPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSkillPillTextActive: {
    color: '#FF6B00',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E9EB',
    backgroundColor: '#FFFFFF',
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 9999,
    backgroundColor: '#EEF1F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalCancelBtnText: {
    color: '#5A4136',
    fontSize: 14,
    fontWeight: '800',
  },
  modalSaveBtn: {
    flex: 2,
    height: 48,
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
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  modalLoaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalLoaderText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 10,
    fontWeight: '600',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 28, 30, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  confirmContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  warningBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  warningBadgeText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#181C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 13,
    color: '#5A4136',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmJobTitle: {
    fontWeight: '800',
    color: '#FF6B00',
  },
  confirmFooter: {
    flexDirection: 'row',
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 9999,
    backgroundColor: '#EEF1F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  confirmCancelBtnText: {
    color: '#5A4136',
    fontSize: 13,
    fontWeight: '800',
  },
  confirmDeleteBtn: {
    flex: 1,
    height: 44,
    borderRadius: 9999,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
