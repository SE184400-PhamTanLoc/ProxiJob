import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView
} from 'react-native';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';

export default function EmployerScheduling() {
  const { staffList, loadStaffList } = useContext(AppContext);

  React.useEffect(() => {
    loadStaffList();
  }, []);

  const [selectedDayIndex, setSelectedDayIndex] = useState(4); // default to Friday (5th)
  const [assigningShift, setAssigningShift] = useState(null); // { dayIndex, shiftSlotId }
  const [modalVisible, setModalVisible] = useState(false);

  // Initial roster assignments
  // DayIndex 0 = Mon, 1 = Tue, 2 = Wed, 3 = Thu, 4 = Fri, 5 = Sat, 6 = Sun
  const [roster, setRoster] = useState({
    '4-morning': 'Nguyễn Văn A',
    '4-afternoon': 'Trần Thị B',
    '4-evening': 'Phạm Tấn Lộc',
    '5-morning': 'Lê Hoàng C',
    '5-afternoon': 'Trần Thị B',
    '5-evening': 'Chưa xếp',
    '6-morning': 'Phạm Tấn Lộc',
    '6-afternoon': 'Nguyễn Văn A',
    '6-evening': 'Chưa xếp',
  });

  const weekDays = [
    { name: 'T2', date: '01/06' },
    { name: 'T3', date: '02/06' },
    { name: 'T4', date: '03/06' },
    { name: 'T5', date: '04/06' },
    { name: 'T6', date: '05/06', isToday: true },
    { name: 'T7', date: '06/06' },
    { name: 'CN', date: '07/06' },
  ];

  const shiftSlots = [
    { id: 'morning', name: 'Ca Sáng', time: '08:00 - 12:00', icon: '☀️' },
    { id: 'afternoon', name: 'Ca Chiều', time: '13:00 - 17:00', icon: '⛅' },
    { id: 'evening', name: 'Ca Tối', time: '18:00 - 22:00', icon: '🌙' },
  ];

  const openAssignModal = (dayIndex, slotId) => {
    setAssigningShift({ dayIndex, slotId });
    setModalVisible(true);
  };

  const handleAssignStaff = (staffName) => {
    if (assigningShift) {
      const key = `${assigningShift.dayIndex}-${assigningShift.slotId}`;
      setRoster(prev => ({
        ...prev,
        [key]: staffName
      }));
      setModalVisible(false);
      setAssigningShift(null);
    }
  };

  const selectedDay = weekDays[selectedDayIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Week Day Header Slider */}
      <View style={styles.weekTimeline}>
        <Text style={styles.timelineLabel}>Tuần này (Tháng 6, 2026)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
          {weekDays.map((day, idx) => {
            const isSelected = selectedDayIndex === idx;
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dayHeaderCell,
                  isSelected && styles.selectedDayHeaderCell,
                  day.isToday && !isSelected && styles.todayHeaderCell
                ]}
                onPress={() => setSelectedDayIndex(idx)}
              >
                <Text style={[
                  styles.dayNameText,
                  isSelected && styles.selectedDayNameText,
                  day.isToday && { color: theme.colors.employer }
                ]}>
                  {day.name}
                </Text>
                <Text style={[
                  styles.dayDateText,
                  isSelected && styles.selectedDayDateText
                ]}>
                  {day.date.split('/')[0]}
                </Text>
                {day.isToday && !isSelected && <View style={styles.todayIndicatorDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Day Schedule Header */}
        <View style={styles.daySummary}>
          <Text style={styles.summaryTitle}>
            Lịch phân ca: {selectedDay.name === 'CN' ? 'Chủ Nhật' : `Thứ ${selectedDay.name.slice(1)}`} ({selectedDay.date}/2026)
          </Text>
          {selectedDay.isToday && <Text style={styles.todayTag}>Hôm nay</Text>}
        </View>

        {/* Shift Grid */}
        <View style={styles.shiftGridContainer}>
          {shiftSlots.map((slot) => {
            const rosterKey = `${selectedDayIndex}-${slot.id}`;
            const assignedStaff = roster[rosterKey] || 'Chưa xếp';
            const isAssigned = assignedStaff !== 'Chưa xếp';

            return (
              <View key={slot.id} style={[styles.shiftSlotCard, theme.shadows.light]}>
                <View style={styles.slotDetails}>
                  <Text style={styles.slotIcon}>{slot.icon}</Text>
                  <View>
                    <Text style={styles.slotName}>{slot.name}</Text>
                    <Text style={styles.slotTime}>{slot.time}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.rosterSection}>
                  <Text style={styles.rosterLabel}>Nhân viên phụ trách:</Text>
                  <TouchableOpacity
                    style={[
                      styles.assignBadge,
                      isAssigned ? styles.badgeAssigned : styles.badgeUnassigned
                    ]}
                    onPress={() => openAssignModal(selectedDayIndex, slot.id)}
                  >
                    <Text style={[
                      styles.assignBadgeText,
                      isAssigned ? styles.textAssigned : styles.textUnassigned
                    ]}>
                      {isAssigned ? '👤 ' + assignedStaff : '➕ Xếp ca'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 Hướng dẫn xếp ca nhanh</Text>
          <Text style={styles.infoBody}>
            Nhấn vào nút <Text style={{fontWeight: 'bold'}}>Xếp ca</Text> hoặc tên nhân viên trên bất kỳ ca làm nào để mở danh sách nhân sự nội bộ và phân công làm việc. Roster sẽ tự động lưu lại.
          </Text>
        </View>
      </ScrollView>

      {/* Staff Selector Modal */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn nhân viên giao việc</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalList}>
              {/* Unassign Option */}
              <TouchableOpacity
                style={styles.staffSelectCard}
                onPress={() => handleAssignStaff('Chưa xếp')}
              >
                <View style={styles.emptyAvatar}>
                  <Text style={styles.emptyAvatarText}>✕</Text>
                </View>
                <Text style={styles.unassignText}>Bỏ trống ca làm</Text>
              </TouchableOpacity>

              {/* Staff list mapping */}
              {staffList.map((staff) => (
                <TouchableOpacity
                  key={staff.id}
                  style={styles.staffSelectCard}
                  onPress={() => handleAssignStaff(staff.name)}
                >
                  <View style={styles.staffAvatar}>
                    <Text style={styles.avatarText}>
                      {staff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.selectStaffName}>{staff.name}</Text>
                    <Text style={styles.selectStaffRole}>{staff.role}</Text>
                  </View>
                </TouchableOpacity>
              ))}
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
  weekTimeline: {
    backgroundColor: theme.colors.white,
    paddingTop: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.md,
    marginBottom: 8,
  },
  daysScroll: {
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  dayHeaderCell: {
    width: 50,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  selectedDayHeaderCell: {
    backgroundColor: theme.colors.employer,
  },
  todayHeaderCell: {
    borderWidth: 1,
    borderColor: theme.colors.employer,
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  selectedDayNameText: {
    color: theme.colors.white,
  },
  dayDateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 2,
  },
  selectedDayDateText: {
    color: theme.colors.white,
  },
  todayIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.employer,
    marginTop: 2,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  daySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  todayTag: {
    backgroundColor: theme.colors.employer + '1A',
    color: theme.colors.employer,
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  shiftGridContainer: {
    marginBottom: theme.spacing.lg,
  },
  shiftSlotCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  slotDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotIcon: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  slotName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  slotTime: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  rosterSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rosterLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  assignBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
  },
  badgeAssigned: {
    backgroundColor: theme.colors.employer + '1A',
  },
  badgeUnassigned: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
  assignBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  textAssigned: {
    color: theme.colors.employer,
  },
  textUnassigned: {
    color: theme.colors.textMuted,
  },
  infoCard: {
    backgroundColor: theme.colors.employer + '0B',
    borderColor: theme.colors.employer + '22',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.employer,
    marginBottom: 4,
  },
  infoBody: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    width: '100%',
    maxWidth: 360,
    maxHeight: '70%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeText: {
    fontSize: 18,
    color: theme.colors.textMuted,
  },
  modalList: {
    padding: theme.spacing.md,
  },
  staffSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  emptyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  emptyAvatarText: {
    color: theme.colors.textMuted,
    fontWeight: 'bold',
  },
  unassignText: {
    fontSize: 13,
    color: theme.colors.danger,
    fontWeight: 'bold',
  },
  staffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.employer + '1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.employer,
  },
  selectStaffName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  selectStaffRole: {
    fontSize: 11,
    color: theme.colors.textMuted,
  }
});
