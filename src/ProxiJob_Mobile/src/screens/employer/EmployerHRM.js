import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  Platform
} from 'react-native';
import { AppContext } from '../../context/AppContext';
import * as Font from 'expo-font';
import { getAvatarSource } from '../../utils/avatarHelper';
import { handleCallUser } from '../../utils/callHelper';
import { useStaffListQuery, useAddStaffMemberMutation, useRemoveStaffMemberMutation, useUpdateStaffMemberMutation } from '../../hooks/queries';

export default function EmployerHRM() {
  const {
    user,
    navigateTo,
    showToast
  } = useContext(AppContext);

  const { data: staffList = [], isLoading: loadingStaff, refetch: loadStaffList } = useStaffListQuery(user);
  const addStaffMutation = useAddStaffMemberMutation(user, showToast);
  const removeStaffMutation = useRemoveStaffMemberMutation(user, showToast);
  const updateStaffMutation = useUpdateStaffMemberMutation(user, showToast);

  const [activeTab, setActiveTab] = useState('internal'); // 'internal' | 'single'
  const [modalVisible, setModalVisible] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [expandedIds, setExpandedIds] = useState({});
  const [editingStaff, setEditingStaff] = useState(null);

  const toggleExpand = (id) => {
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  React.useEffect(() => {
    loadStaffList();
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
      // Load fonts from local assets
      Font.loadAsync({
        'PlusJakartaSans-Regular': require('../../../assets/fonts/PlusJakartaSans-Regular.ttf'),
        'PlusJakartaSans-Bold': require('../../../assets/fonts/PlusJakartaSans-Bold.ttf'),
        'PlusJakartaSans-ExtraBold': require('../../../assets/fonts/PlusJakartaSans-ExtraBold.ttf')
      }).then(() => {
        setFontsLoaded(true);
      }).catch(err => {
        console.log('[ProxiJob Font Loader] Local font load failed:', err);
      });
    }
  }, []);

  const internalStaff = (staffList || []).filter(s => !s.isExternal);
  const externalStaff = (staffList || []).filter(s => s.isExternal);

  const handleSaveStaff = async () => {
    if (newStaffName.trim() && newStaffRole.trim() && newStaffPhone.trim()) {
      setIsAdding(true);
      try {
        if (editingStaff) {
          await updateStaffMutation.mutateAsync({
            id: editingStaff.id,
            name: newStaffName,
            role: newStaffRole,
            phone: newStaffPhone
          });
        } else {
          await addStaffMutation.mutateAsync({
            name: newStaffName,
            role: newStaffRole,
            phone: newStaffPhone
          });
        }
        setNewStaffName('');
        setNewStaffRole('');
        setNewStaffPhone('');
        setEditingStaff(null);
        setModalVisible(false);
      } catch (err) {
        console.log('Error saving staff:', err);
      } finally {
        setIsAdding(false);
      }
    }
  };

  const handleEditPress = (staff) => {
    setEditingStaff(staff);
    setNewStaffName(staff.name);
    setNewStaffRole(staff.role);
    setNewStaffPhone(staff.phone);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setNewStaffName('');
    setNewStaffRole('');
    setNewStaffPhone('');
    setEditingStaff(null);
    setModalVisible(false);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await removeStaffMutation.mutateAsync(id);
    } catch (err) {
      console.log('Error deleting staff:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (name) => {
    if (!name) return '#FF6B00';
    const colors = ['#FF6B00', '#5B00DF', '#624ABF', '#0A58CA', '#10B981', '#F59E0B'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // ─── Internal Staff Card (NỘI BỘ) ─────────
  const renderInternalCard = (staff, index) => {
    const isDeleting = deletingId === staff.id;
    const isFirst = index === 0;
    const isExpanded = !!expandedIds[staff.id];
    // Premium Bento Avatar Image
    const avatarSource = getAvatarSource(staff.avatarUrl, staff.gender, staff.name);

    return (
      <TouchableOpacity
        key={staff.id}
        activeOpacity={0.9}
        onPress={() => toggleExpand(staff.id)}
        style={[styles.accordionItem, isExpanded && styles.accordionItemActive]}
      >
        {/* Viewfinder corners on first card */}
        {isFirst && (
          <>
            <View style={styles.viewfinderTL} />
            <View style={styles.viewfinderBR} />
          </>
        )}

        <View style={styles.accordionHeader}>
          <View style={styles.headerLeft}>
            {/* Avatar Image */}
            <View style={styles.avatarWrapper}>
              <Image source={avatarSource} style={styles.avatarImage} />
            </View>

            {/* Info Column */}
            <View style={styles.infoColumn}>
              <View style={styles.badgeRow}>
                <View style={[styles.badgeItem, { backgroundColor: 'rgba(255, 107, 0, 0.1)' }]}>
                  <Text style={[styles.badgeText, { color: '#FF6B00' }]}>NỘI BỘ</Text>
                </View>
                <View style={[styles.badgeItem, { backgroundColor: '#EBEEF0' }]}>
                  <Text style={[styles.badgeText, { color: '#5A4136' }]}>{staff.role.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.staffNameText} numberOfLines={1}>
                {staff.name}
              </Text>
            </View>
          </View>

          {/* Action Buttons & Chevron */}
          <View style={styles.headerRight}>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  handleCallUser(staff.phone);
                }}
              >
                <Text style={[styles.actionBtnText, { color: '#FF6B00' }]}>📞</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  if (staff.userId) {
                    navigateTo('employer_chat', {
                      partnerId: staff.userId,
                      partnerName: staff.name,
                      partnerPhone: staff.phone,
                      partnerGender: staff.gender
                    });
                  } else {
                    navigateTo('employer_chat');
                  }
                }}
              >
                <Text style={[styles.actionBtnText, { color: '#FF6B00' }]}>💬</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.chevronIcon, isExpanded && styles.chevronIconRotated]}>
              ▼
            </Text>
          </View>
        </View>

        {/* Accordion Content */}
        {isExpanded && (
          <View style={styles.accordionContentContainer}>
            {staff.name === 'Nguyễn Duy Khôi' ? (
              <View style={styles.accordionInnerCard}>
                <Text style={styles.metaLabelText}>THÔNG TIN CHI TIẾT</Text>
                <Text style={styles.detailsBodyText}>
                  Chuyên trực ca đêm. Đã hoàn thành khóa đào tạo an ninh nội bộ tháng 12/2023.
                </Text>
                
                <View style={styles.contactDetailsRow}>
                  <Text style={styles.metaLabelText}>SỐ ĐIỆN THOẠI</Text>
                  <Text style={styles.metaValueText}>{staff.phone}</Text>
                </View>

                <View style={styles.buttonsRow}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleEditPress(staff);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.editBtnText}>✏️ Chỉnh sửa</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDelete(staff.id);
                    }}
                    disabled={isDeleting}
                    activeOpacity={0.8}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#BA1A1A" />
                    ) : (
                      <Text style={styles.deleteBtnText}>🗑️ Xóa</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.accordionInnerCard}>
                <View style={styles.grid2Col}>
                  <View style={styles.gridCol}>
                    <Text style={styles.metaLabelText}>THÂM NIÊN</Text>
                    <Text style={styles.metaValueText}>
                      {staff.name === 'Nguyễn Minh Hoàng' ? '2 năm' : '1 năm'}
                    </Text>
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.metaLabelText}>HIỆU SUẤT</Text>
                    <View style={styles.ratingWrapper}>
                      <Text style={styles.metaValueText}>
                        {staff.name === 'Nguyễn Minh Hoàng' ? '4.8' : '5.0'}
                      </Text>
                      <Text style={styles.starIconYellow}>★</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.contactDetailsRow}>
                  <Text style={styles.metaLabelText}>SỐ ĐIỆN THOẠI</Text>
                  <Text style={styles.metaValueText}>{staff.phone}</Text>
                </View>

                {staff.shiftsCount > 0 && (
                  <View style={[styles.contactDetailsRow, { marginTop: 8 }]}>
                    <Text style={styles.metaLabelText}>SỐ CA ĐÃ LÀM</Text>
                    <Text style={styles.metaValueText}>{staff.shiftsCount} ca</Text>
                  </View>
                )}

                <View style={styles.buttonsRow}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleEditPress(staff);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.editBtnText}>✏️ Chỉnh sửa</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDelete(staff.id);
                    }}
                    disabled={isDeleting}
                    activeOpacity={0.8}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#BA1A1A" />
                    ) : (
                      <Text style={styles.deleteBtnText}>🗑️ Xóa</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ─── External Staff Card (VÃNG LAI) ────────
  const renderExternalCard = (staff, index) => {
    const isFirst = index === 0;
    const isExpanded = !!expandedIds[staff.id];
    // Simulate different shift states based on position
    const shiftStates = [
      { icon: '🕐', label: 'Ca hiện tại:', value: '16:50 - 20:50', status: 'AI Face Verified', statusColor: '#A04100', bgColor: '#F8FAFC' },
      { icon: '📅', label: 'Lịch làm:', value: '08:00 - 12:00 (Mai)', status: 'Chờ vào ca ⏳', statusColor: '#5A4136', bgColor: '#F8FAFC' },
      { icon: '🕑', label: 'Kết thúc:', value: '13:00 - 17:00', status: 'Chờ quyết toán 💰', statusColor: '#A04100', bgColor: '#F8FAFC' },
    ];
    const shiftState = shiftStates[index % shiftStates.length];
    const isCompleted = index % 3 === 2; // Third card has reduced opacity
    const avatarSource = getAvatarSource(staff.avatarUrl, staff.gender, staff.name);

    return (
      <TouchableOpacity
        key={staff.id}
        activeOpacity={0.9}
        onPress={() => toggleExpand(staff.id)}
        style={[
          styles.accordionItem,
          isExpanded && styles.accordionItemActive,
          isCompleted && { opacity: 0.8 }
        ]}
      >
        {/* Viewfinder corners on first card */}
        {isFirst && (
          <>
            <View style={styles.viewfinderTL} />
            <View style={styles.viewfinderBR} />
          </>
        )}

        <View style={styles.accordionHeader}>
          <View style={styles.headerLeft}>
            {/* Avatar Image */}
            <View style={styles.avatarWrapper}>
              <Image source={avatarSource} style={styles.avatarImage} />
            </View>

            {/* Info Column */}
            <View style={styles.infoColumn}>
              <View style={styles.badgeRow}>
                <View style={[styles.badgeItem, { backgroundColor: 'rgba(91, 0, 223, 0.1)' }]}>
                  <Text style={[styles.badgeText, { color: '#5B00DF' }]}>VÃNG LAI</Text>
                </View>
                <View style={[styles.badgeItem, { backgroundColor: '#EBEEF0' }]}>
                  <Text style={[styles.badgeText, { color: '#5A4136' }]}>{staff.role.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.staffNameText} numberOfLines={1}>
                {staff.name}
              </Text>
            </View>
          </View>

          {/* Action Buttons & Chevron */}
          <View style={styles.headerRight}>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  handleCallUser(staff.phone);
                }}
              >
                <Text style={[styles.actionBtnText, { color: '#5B00DF' }]}>📞</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  if (staff.userId) {
                    navigateTo('employer_chat', {
                      partnerId: staff.userId,
                      partnerName: staff.name,
                      partnerPhone: staff.phone,
                      partnerGender: staff.gender
                    });
                  } else {
                    navigateTo('employer_chat');
                  }
                }}
              >
                <Text style={[styles.actionBtnText, { color: '#5B00DF' }]}>💬</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.chevronIcon, isExpanded && styles.chevronIconRotated]}>
              ▼
            </Text>
          </View>
        </View>

        {/* Accordion Content */}
        {isExpanded && (
          <View style={styles.accordionContentContainer}>
            {staff.name === 'Lương Hoàng Thông' || index % 3 === 2 ? (
              <View style={styles.accordionInnerCard}>
                <View style={styles.flexRowBetween}>
                  <Text style={styles.metaLabelText}>LỊCH LÀM VIỆC</Text>
                  <Text style={[styles.badgeText, { color: '#5B00DF', fontWeight: 'bold' }]}>Full-time</Text>
                </View>
                <Text style={styles.scheduleText}>Tất cả các ngày: 08:00 - 17:00</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                <View style={styles.accordionInnerCard}>
                  <View style={styles.flexRowBetween}>
                    <Text style={styles.metaLabelText}>TRẠNG THÁI CA</Text>
                    <View style={[styles.badgeItem, { backgroundColor: 'rgba(255, 107, 0, 0.1)', paddingHorizontal: 8, paddingVertical: 2 }]}>
                      <Text style={[styles.badgeText, { color: '#FF6B00', fontWeight: 'bold' }]}>Đang làm</Text>
                    </View>
                  </View>
                  <Text style={styles.scheduleText}>
                    {shiftState.label} {shiftState.value}
                  </Text>
                  <View style={styles.aiVerifiedRow}>
                    <Text style={[styles.verifiedIcon, { color: '#5B00DF' }]}>✓</Text>
                    <Text style={styles.aiVerifiedText}>AI VERIFIED</Text>
                  </View>
                </View>

                {/* Show approve/reject buttons for second card pattern */}
                {index % 3 === 1 && (
                  <View style={styles.approvalButtonsRow}>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      activeOpacity={0.8}
                      onPress={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Text style={styles.rejectBtnText}>TỪ CHỐI</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      activeOpacity={0.85}
                      onPress={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Text style={styles.approveBtnText}>DUYỆT ĐỔI ⚡</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (emoji, title, sub) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
    </View>
  );

  if (!fontsLoaded || loadingStaff) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7FAFC' }}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Capsule Tab Selector - 2 tabs */}
        <View style={[styles.tabContainer, { marginTop: 16 }]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'internal' && styles.tabBtnActive]}
            onPress={() => setActiveTab('internal')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'internal' && styles.tabTextActive]}>
              Nhân viên nội bộ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'single' && styles.tabBtnActive]}
            onPress={() => setActiveTab('single')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'single' && styles.tabTextActive]}>
              Nhân viên vãng lai
            </Text>
          </TouchableOpacity>
        </View>

        {/* Staff Cards */}
        <View style={styles.cardsWrapper}>
          {activeTab === 'internal' ? (
            internalStaff.length === 0
              ? renderEmptyState('👥', 'Chưa có nhân sự nội bộ', 'Bấm "Thêm nhân viên" để thêm nhân viên cố định vào hệ thống.')
              : internalStaff.map((staff, idx) => renderInternalCard(staff, idx))
          ) : (
            externalStaff.length === 0
              ? renderEmptyState('🎓', 'Chưa có sinh viên vãng lai', 'Sinh viên được duyệt nhận việc từ Quản lý tin đăng sẽ hiển thị ở đây.')
              : externalStaff.map((staff, idx) => renderExternalCard(staff, idx))
          )}
        </View>
      </ScrollView>

      {/* FAB - compact bottom-right */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <View style={styles.fabPlusHorizontal} />
        <View style={styles.fabPlusVertical} />
      </TouchableOpacity>

      {/* Add/Edit Staff Modal */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingStaff ? 'Chỉnh Sửa Nhân Viên' : 'Thêm Nhân Viên Mới'}</Text>
                <Text style={styles.modalSubtitle}>{editingStaff ? 'Cập nhật thông tin nhân viên cố định' : 'Thêm nhân viên cố định vào hệ thống'}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={handleCloseModal}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <Text style={styles.inputLabel}>HỌ VÀ TÊN</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập họ và tên nhân viên..."
                  placeholderTextColor="#9CA3AF"
                  value={newStaffName}
                  onChangeText={setNewStaffName}
                />
              </View>

              <Text style={styles.inputLabel}>VỊ TRÍ / VAI TRÒ</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Pha chế, Phục vụ, Thu ngân..."
                  placeholderTextColor="#9CA3AF"
                  value={newStaffRole}
                  onChangeText={setNewStaffRole}
                />
              </View>

              <Text style={styles.inputLabel}>SỐ ĐIỆN THOẠI</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập số điện thoại di động..."
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={newStaffPhone}
                  onChangeText={setNewStaffPhone}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (!newStaffName.trim() || !newStaffRole.trim() || !newStaffPhone.trim()) && styles.submitBtnDisabled
                ]}
                onPress={handleSaveStaff}
                disabled={isAdding || !newStaffName.trim() || !newStaffRole.trim() || !newStaffPhone.trim()}
                activeOpacity={0.85}
              >
                {isAdding ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>{editingStaff ? 'Lưu thay đổi' : 'Xác nhận thêm nhân viên'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const FONT_REGULAR = Platform.OS === 'web' ? '"Plus Jakarta Sans", sans-serif' : 'PlusJakartaSans-Regular';
const FONT_BOLD = Platform.OS === 'web' ? '"Plus Jakarta Sans", sans-serif' : 'PlusJakartaSans-Bold';
const FONT_EXTRABOLD = Platform.OS === 'web' ? '"Plus Jakarta Sans", sans-serif' : 'PlusJakartaSans-ExtraBold';

const getFontWeight = (weight) => Platform.OS === 'web' ? weight : undefined;

const styles = StyleSheet.create({
  // ─── Container ────────────────────────────
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 220,
  },

  // ─── Centered Hero Title & Subtitle ───────
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  heroTitleCentered: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 32,
    fontWeight: getFontWeight('900'),
    color: '#0F172A',
    letterSpacing: -1.8,
    lineHeight: 38,
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'left',
    lineHeight: 18,
    paddingHorizontal: 28,
    alignSelf: 'center',
    width: '100%',
  },

  // ─── Capsule Tab Selector ─────────────────
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F4F6',
    borderRadius: 9999,
    padding: 5,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EBEEF0',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 9999,
  },
  tabBtnActive: {
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  tabText: {
    fontFamily: FONT_BOLD,
    fontSize: 13,
    fontWeight: getFontWeight('700'),
    color: '#5A4136',
    letterSpacing: 0.8,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // ─── Cards Wrapper ────────────────────────
  cardsWrapper: {
    width: '100%',
  },

  // ═══════════════════════════════════════════
  // ─── INTERNAL STAFF CARD (NỘI BỘ) ────────
  // ═══════════════════════════════════════════
  staffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 30,
    elevation: 3,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#F1F4F6',
  },
  avatarInitials: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 20,
    fontWeight: getFontWeight('800'),
  },
  cardInfoSection: {
    flex: 1,
  },
  typeBadgeInternal: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    marginBottom: 4,
  },
  typeBadgeTextInternal: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 9,
    fontWeight: getFontWeight('800'),
    letterSpacing: 1,
    color: '#FF6B00',
  },
  staffName: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 18,
    fontWeight: getFontWeight('800'),
    color: '#181C1E',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  staffPosition: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    color: '#5A4136',
    fontWeight: getFontWeight('500'),
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
    fontWeight: getFontWeight('600'),
    color: '#9CA3AF',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 6,
  },

  // ─── Action Icons (shared) ────────────────
  actionIconsCol: {
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  actionIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIconText: {
    fontFamily: FONT_REGULAR,
    fontSize: 18,
    color: '#FF6B00',
  },
  deleteIconBtn: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  deleteIconText: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    color: '#EF4444',
    fontWeight: getFontWeight('700'),
  },

  // ═══════════════════════════════════════════
  // ─── EXTERNAL STAFF CARD (VÃNG LAI) ───────
  // ═══════════════════════════════════════════
  accordionItem: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(224, 227, 229, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 3,
  },
  accordionItemActive: {
    borderColor: 'rgba(224, 227, 229, 0.5)',
  },
  // Viewfinder corners
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

  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ebeef0',
    borderWidth: 1,
    borderColor: 'rgba(224, 227, 229, 0.2)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  infoColumn: {
    marginLeft: 12,
    justifyContent: 'center',
    flexShrink: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  badgeItem: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: FONT_BOLD,
    fontSize: 9,
    fontWeight: getFontWeight('700'),
    letterSpacing: 0.5,
  },
  staffNameText: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 14,
    color: '#181c1e',
    fontWeight: getFontWeight('800'),
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
  },
  chevronIcon: {
    fontFamily: FONT_REGULAR,
    fontSize: 10,
    color: '#5A4136',
    marginLeft: 8,
  },
  chevronIconRotated: {
    transform: [{ rotate: '180deg' }],
  },

  accordionContentContainer: {
    marginTop: 12,
  },
  accordionInnerCard: {
    backgroundColor: '#f1f4f6',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(224, 227, 229, 0.1)',
  },
  grid2Col: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  gridCol: {
    flex: 1,
  },
  metaLabelText: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 10,
    fontWeight: getFontWeight('800'),
    color: '#5A4136',
    opacity: 0.6,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaValueText: {
    fontFamily: FONT_BOLD,
    fontSize: 14,
    fontWeight: getFontWeight('700'),
    color: '#181C1E',
  },
  ratingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIconYellow: {
    color: '#FF6B00',
    fontSize: 14,
    marginLeft: 2,
  },
  contactDetailsRow: {
    marginTop: 8,
  },
  detailsBodyText: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: '#181C1E',
    lineHeight: 18,
    marginBottom: 12,
  },
  deleteBtnFull: {
    width: '100%',
    backgroundColor: '#ffdad6',
    paddingVertical: 8,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  deleteBtnText: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    fontWeight: getFontWeight('700'),
    color: '#ba1a1a',
  },

  flexRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scheduleText: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    fontWeight: getFontWeight('700'),
    color: '#181C1E',
  },
  aiVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  verifiedIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  aiVerifiedText: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 10,
    fontWeight: getFontWeight('800'),
    color: '#5B00DF',
  },

  approvalButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#ebeef0',
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    fontWeight: getFontWeight('700'),
    color: '#5a4136',
  },
  approveBtn: {
    flex: 1,
    backgroundColor: '#5b00df',
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtnText: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    fontWeight: getFontWeight('700'),
    color: '#ffffff',
  },

  // ─── Empty State ──────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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

  // ─── FAB ──────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
    zIndex: 50,
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

  // ─── Modal ────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 340,
    maxHeight: '85%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F4F6',
  },
  modalTitle: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 18,
    fontWeight: getFontWeight('800'),
    color: '#181C1E',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontFamily: FONT_REGULAR,
    fontSize: 11,
    color: '#5A4136',
    opacity: 0.6,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontFamily: FONT_BOLD,
    fontSize: 14,
    color: '#5A4136',
    fontWeight: getFontWeight('700'),
  },
  modalForm: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputLabel: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 10,
    fontWeight: getFontWeight('800'),
    color: '#5A4136',
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: '#E5E9EB',
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  input: {
    fontFamily: FONT_REGULAR,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#181C1E',
  },
  submitBtn: {
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#E5E9EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontFamily: FONT_EXTRABOLD,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: getFontWeight('800'),
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  editBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    fontWeight: getFontWeight('700'),
    color: '#FF6B00',
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#ffdad6',
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
