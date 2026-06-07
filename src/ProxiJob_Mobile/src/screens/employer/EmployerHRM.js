import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView
} from 'react-native';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';

export default function EmployerHRM() {
  const { staffList, addStaffMember, removeStaffMember, hrmSingleApplicants, loadStaffList } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('internal'); // 'internal' | 'single'
  const [modalVisible, setModalVisible] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');

  React.useEffect(() => {
    loadStaffList();
  }, []);

  const internalStaff = (staffList || []).filter(s => !s.isExternal);
  const externalStaff = (staffList || []).filter(s => s.isExternal);

  const handleAddStaff = () => {
    if (newStaffName.trim() && newStaffRole.trim() && newStaffPhone.trim()) {
      addStaffMember(newStaffName, newStaffRole, newStaffPhone);
      setNewStaffName('');
      setNewStaffRole('');
      setNewStaffPhone('');
      setModalVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>HRM Lite</Text>
          <Text style={styles.headerSubtitle}>Quản lý nhân viên cố định và hồ sơ sinh viên ứng tuyển lẻ</Text>
        </View>
        {activeTab === 'internal' && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addBtnText}>+ Thêm mới</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'internal' && styles.tabBtnActive]}
          onPress={() => setActiveTab('internal')}
        >
          <Text style={[styles.tabText, activeTab === 'internal' && styles.tabTextActive]}>
            Nhân Sự Nội Bộ ({internalStaff.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'single' && styles.tabBtnActive]}
          onPress={() => setActiveTab('single')}
        >
          <Text style={[styles.tabText, activeTab === 'single' && styles.tabTextActive]}>
            Ứng Tuyển Lẻ ({externalStaff.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'internal' ? (
          /* Internal Staff List */
          internalStaff.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyText}>Danh sách nhân sự đang trống.</Text>
              <Text style={styles.emptySub}>Hãy thêm nhân sự cố định để chia ca xếp lịch.</Text>
            </View>
          ) : (
            internalStaff.map((staff) => (
              <View key={staff.id} style={[styles.staffCard, theme.shadows.light]}>
                <View style={styles.cardInfo}>
                  <View style={styles.staffAvatar}>
                    <Text style={styles.avatarText}>
                      {staff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={styles.staffDetails}>
                    <Text style={styles.staffName}>{staff.name}</Text>
                    <Text style={styles.staffRole}>{staff.role} • 📞 {staff.phone}</Text>
                    <Text style={styles.staffShifts}>Đã hoàn thành: <Text style={{fontWeight: 'bold'}}>{staff.shiftsCount} ca</Text></Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <View style={[
                    styles.statusBadge,
                    staff.status === 'working' ? styles.statusWorking : styles.statusIdle
                  ]}>
                    <Text style={[
                      styles.statusText,
                      staff.status === 'working' ? styles.statusTextWorking : styles.statusTextIdle
                    ]}>
                      {staff.status === 'working' ? '🟢 Đang làm' : '⚪ Đang nghỉ'}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => removeStaffMember(staff.id)}
                  >
                    <Text style={styles.deleteBtnText}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        ) : (
          /* Single Applicants list */
          externalStaff.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎓</Text>
              <Text style={styles.emptyText}>Chưa có sinh viên ứng tuyển lẻ nào được duyệt.</Text>
              <Text style={styles.emptySub}>Sinh viên được duyệt nhận việc ở Màn hình 10 sẽ hiển thị ở đây.</Text>
            </View>
          ) : (
            externalStaff.map((staff) => (
              <View key={staff.id} style={[styles.staffCard, theme.shadows.light]}>
                <View style={styles.cardInfo}>
                  <View style={[styles.staffAvatar, { borderColor: theme.colors.student, backgroundColor: theme.colors.student + '1A' }]}>
                    <Text style={[styles.avatarText, { color: theme.colors.student }]}>
                      {staff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={styles.staffDetails}>
                    <Text style={styles.staffName}>{staff.name} (Sinh viên)</Text>
                    <Text style={styles.staffRole}>Vị trí: {staff.role} • 📞 {staff.phone}</Text>
                    <Text style={styles.staffShifts}>Ca làm: <Text style={{fontWeight: 'bold'}}>{staff.shiftTitle}</Text> tại {staff.shopName}</Text>
                    <Text style={styles.staffShifts}>Thời gian: {staff.date} • {staff.time}</Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <View style={[styles.statusBadge, styles.statusWorking]}>
                    <Text style={[styles.statusText, styles.statusTextWorking]}>
                      🟢 Đã Duyệt Nhận Việc
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Add Staff Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm Nhân Viên Mới</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <Text style={styles.inputLabel}>Họ và tên</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập họ và tên nhân viên..."
                placeholderTextColor={theme.colors.textLight}
                value={newStaffName}
                onChangeText={setNewStaffName}
              />

              <Text style={styles.inputLabel}>Vị trí / Vai trò</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: Pha chế, Phục vụ ca sáng, Thu ngân..."
                placeholderTextColor={theme.colors.textLight}
                value={newStaffRole}
                onChangeText={setNewStaffRole}
              />

              <Text style={styles.inputLabel}>Số điện thoại liên hệ</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập số điện thoại di động..."
                placeholderTextColor={theme.colors.textLight}
                keyboardType="phone-pad"
                value={newStaffPhone}
                onChangeText={setNewStaffPhone}
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddStaff}
              >
                <Text style={styles.submitBtnText}>Xác nhận thêm</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: theme.colors.employer,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
  },
  addBtnText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  staffCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  staffAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.employer + '1A',
    borderColor: theme.colors.employer + '33',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.employer,
  },
  staffDetails: {
    flex: 1,
  },
  staffName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  staffRole: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  staffShifts: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
  },
  statusWorking: {
    backgroundColor: theme.colors.success + '1A',
  },
  statusIdle: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusTextWorking: {
    color: theme.colors.success,
  },
  statusTextIdle: {
    color: theme.colors.textMuted,
  },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.danger + '33',
  },
  deleteBtnText: {
    fontSize: 11,
    color: theme.colors.danger,
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
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeText: {
    fontSize: 18,
    color: theme.colors.textMuted,
  },
  modalForm: {
    padding: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  input: {
    height: 46,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  submitBtn: {
    backgroundColor: theme.colors.employer,
    height: 46,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  submitBtnText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSecondary,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  tabBtnActive: {
    backgroundColor: theme.colors.white,
    borderWidth: 0.5,
    borderColor: theme.colors.border,
  },
  tabText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: theme.colors.employer,
  }
});
