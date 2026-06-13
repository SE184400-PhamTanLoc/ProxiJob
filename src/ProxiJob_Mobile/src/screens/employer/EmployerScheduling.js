import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  TextInput,
  Image,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';
import { getAvatarSource } from '../../utils/avatarHelper';

function getCurrentWeekDays() {
  const today = new Date();
  const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  
  const monday = new Date(today);
  monday.setDate(today.getDate() + distanceToMonday);
  
  const days = [];
  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    
    const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    const apiDateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    const isToday = d.toDateString() === today.toDateString();
    
    days.push({
      name: dayNames[i],
      date: dateStr,
      apiDateStr: apiDateStr,
      isToday: isToday,
      fullYear: d.getFullYear(),
      month: d.getMonth() + 1
    });
  }
  return days;
}

export default function EmployerScheduling() {
  const {
    user,
    staffList,
    loadStaffList,
    schedulesList,
    loadSchedules,
    addEmployeeSchedule,
    removeEmployeeSchedule,
    deleteSchedule,
    showToast
  } = useContext(AppContext);

  const [weekDays, setWeekDays] = useState([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [assigningShift, setAssigningShift] = useState(null); // { slotId }
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localSchedules, setLocalSchedules] = useState([]);

  // Shift slots states (Initial 3 shifts)
  const [shiftSlots, setShiftSlots] = useState([
    { id: 'morning', name: 'Ca Sáng', time: '08:00 - 12:00', icon: '☀️' },
    { id: 'afternoon', name: 'Ca Chiều', time: '13:00 - 17:00', icon: '⛅' },
    { id: 'evening', name: 'Ca Tối', time: '18:00 - 22:00', icon: '🌙' },
  ]);

  // Add Shift Modal state
  const [addShiftModalVisible, setAddShiftModalVisible] = useState(false);
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftStart, setNewShiftStart] = useState('');
  const [newShiftEnd, setNewShiftEnd] = useState('');
  const [newShiftIcon, setNewShiftIcon] = useState('☀️');

  React.useEffect(() => {
    loadStaffList();
    const days = getCurrentWeekDays();
    setWeekDays(days);
    const todayIdx = days.findIndex(d => d.isToday);
    setSelectedDayIndex(todayIdx >= 0 ? todayIdx : 0);
  }, []);

  React.useEffect(() => {
    const loadCustomShifts = async () => {
      try {
        const storageKey = `@custom_shift_slots_${user?.id || 'default'}`;
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          setShiftSlots(JSON.parse(stored));
        }
      } catch (err) {
        console.log('Error loading shift slots:', err);
      }
    };
    if (user) {
      loadCustomShifts();
    }
  }, [user]);

  React.useEffect(() => {
    if (weekDays.length > 0 && weekDays[selectedDayIndex]) {
      const activeDateStr = weekDays[selectedDayIndex].apiDateStr;
      loadSchedules(activeDateStr);
    }
  }, [selectedDayIndex, weekDays]);

  React.useEffect(() => {
    setLocalSchedules(schedulesList || []);
  }, [schedulesList]);

  const filteredStaff = (staffList || []).filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAssignModal = (slotId) => {
    setAssigningShift({ slotId });
    setModalVisible(true);
  };

  const handleAssignStaff = async (staffId) => {
    if (assigningShift && weekDays[selectedDayIndex]) {
      const activeDate = weekDays[selectedDayIndex];
      const activeDateStr = activeDate.apiDateStr;
      
      const targetSlot = shiftSlots.find(s => s.id === assigningShift.slotId);
      if (!targetSlot) return;

      // Extract time from the slot's time property, e.g. "08:00 - 12:00"
      let startTime = '08:00:00';
      let endTime = '12:00:00';
      try {
        const timeParts = targetSlot.time.split(' - ');
        if (timeParts.length === 2) {
          startTime = `${timeParts[0]}:00`;
          endTime = `${timeParts[1]}:00`;
        }
      } catch (e) {
        console.log('Error parsing slot times:', e);
      }

      const convertVNTimeToUTC = (dateStr, timeStr) => {
        try {
          const utcDate = new Date(`${dateStr}T${timeStr}Z`);
          utcDate.setUTCHours(utcDate.getUTCHours() - 7);
          return utcDate.toISOString();
        } catch (e) {
          return `${dateStr}T${timeStr}Z`;
        }
      };

      const startTimeStr = convertVNTimeToUTC(activeDateStr, startTime);
      const endTimeStr = convertVNTimeToUTC(activeDateStr, endTime);

      // Save backup for rollback
      const backupSchedules = [...localSchedules];

      // Optimistic update
      const tempId = `temp_${Date.now()}`;
      const newSchedule = {
        id: tempId,
        employeeId: staffId,
        note: assigningShift.slotId,
        date: activeDateStr,
        startTime: startTimeStr,
        endTime: endTimeStr
      };

      const updatedSchedules = [
        ...localSchedules.filter(s => s.note !== assigningShift.slotId),
        newSchedule
      ];
      setLocalSchedules(updatedSchedules);

      // Close modal with a brief 200ms delay so user sees selection visual state change
      setTimeout(() => {
        setModalVisible(false);
        setAssigningShift(null);
      }, 200);

      // Call API in background
      (async () => {
        try {
          // 1. Delete existing schedule for this slot if there is one in the backup
          const existingSchedule = backupSchedules.find(s => s.note === assigningShift.slotId);
          if (existingSchedule && existingSchedule.id && !existingSchedule.id.toString().startsWith('temp_')) {
            await deleteSchedule(existingSchedule.id);
          }

          // 2. Add the new schedule
          const success = await addEmployeeSchedule(
            staffId,
            activeDateStr,
            assigningShift.slotId,
            startTimeStr,
            endTimeStr
          );

          if (!success) {
            // Revert state if creation failed
            setLocalSchedules(backupSchedules);
          }
        } catch (err) {
          console.log('Failed to perform background scheduling:', err);
          setLocalSchedules(backupSchedules);
          showToast('Không thể kết nối máy chủ để cập nhật lịch!', 'error');
        }
      })();
    }
  };

  const handleUnassignStaff = async () => {
    if (assigningShift && weekDays[selectedDayIndex]) {
      const activeDateStr = weekDays[selectedDayIndex].apiDateStr;
      
      const backupSchedules = [...localSchedules];

      // Optimistic update: filter out this slot's schedule
      const updatedSchedules = localSchedules.filter(s => s.note !== assigningShift.slotId);
      setLocalSchedules(updatedSchedules);

      setModalVisible(false);
      setAssigningShift(null);

      // Find the actual schedule from backup to delete
      const slotSchedule = backupSchedules.find(s => s.note === assigningShift.slotId);
      if (slotSchedule && slotSchedule.id && !slotSchedule.id.toString().startsWith('temp_')) {
        (async () => {
          try {
            const success = await removeEmployeeSchedule(slotSchedule.id, activeDateStr);
            if (!success) {
              setLocalSchedules(backupSchedules);
            }
          } catch (err) {
            console.log('Failed to perform background unassign:', err);
            setLocalSchedules(backupSchedules);
            showToast('Không thể kết nối máy chủ để gỡ nhân viên!', 'error');
          }
        })();
      }
    }
  };

  const resetNewShiftForm = () => {
    setNewShiftName('');
    setNewShiftStart('');
    setNewShiftEnd('');
    setNewShiftIcon('☀️');
  };

  const handleAddShiftSubmit = async () => {
    if (!newShiftName.trim()) {
      showToast('Vui lòng nhập tên ca làm', 'warning');
      return;
    }
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(newShiftStart) || !timeRegex.test(newShiftEnd)) {
      showToast('Giờ phải đúng định dạng HH:MM (ví dụ 11:00)', 'warning');
      return;
    }

    const slotId = `custom_${Date.now()}`;
    const newSlot = {
      id: slotId,
      name: newShiftName.trim(),
      time: `${newShiftStart} - ${newShiftEnd}`,
      icon: newShiftIcon
    };

    const updatedSlots = [...shiftSlots, newSlot];
    setShiftSlots(updatedSlots);
    setAddShiftModalVisible(false);
    resetNewShiftForm();
    showToast('Thêm ca làm việc mới thành công!', 'success');

    try {
      const storageKey = `@custom_shift_slots_${user?.id || 'default'}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedSlots));
    } catch (err) {
      console.log('Error saving shift slots:', err);
    }
  };

  const selectedDay = weekDays[selectedDayIndex];

  const getTimelineLabel = () => {
    if (!selectedDay) return 'Tuần này';
    return `Tuần này (Tháng ${selectedDay.month}, ${selectedDay.fullYear})`;
  };

  const getDaySummaryTitle = () => {
    if (!selectedDay) return 'Lịch phân ca';
    const dayName = selectedDay.name === 'CN' ? 'Chủ Nhật' : `Thứ ${selectedDay.name.slice(1)}`;
    return `Lịch phân ca: ${dayName} (${selectedDay.date}/${selectedDay.fullYear})`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Week Day Header Slider */}
      <View style={styles.weekTimeline}>
        <Text style={styles.timelineLabel}>{getTimelineLabel()}</Text>
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
                {isSelected && <View style={styles.activeIndicatorDot} />}
                {day.isToday && !isSelected && <View style={styles.todayIndicatorDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Day Summary Header */}
        <View style={styles.daySummary}>
          <Text style={styles.summaryTitle}>{getDaySummaryTitle()}</Text>
          {selectedDay?.isToday && <Text style={styles.todayTag}>Hôm nay</Text>}
        </View>

        {/* Lịch trình chi tiết Header Row */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.sectionTitleIcon}>📋</Text>
            <Text style={styles.sectionTitleText}>Lịch trình chi tiết</Text>
          </View>
        </View>

        {/* Shift Grid */}
        <View style={styles.shiftGridContainer}>
          {shiftSlots.map((slot) => {
            const slotSchedule = (localSchedules || []).find(s => s.note === slot.id);
            const isAssigned = !!slotSchedule;

            const staff = slotSchedule ? staffList.find(s => s.id === slotSchedule.employeeId) : null;
            const assignedStaffName = staff ? staff.name : (slotSchedule ? 'Nhân viên' : 'Chưa xếp');
            
            const role = staff ? staff.role : (slot.id === 'evening' ? 'Quản lý' : 'Pha chế');
            
            let rate = '28.000 đ/h';
            if (staff && staff.hourlyRate) {
              rate = `${Number(staff.hourlyRate).toLocaleString('vi-VN')} đ/h`;
            } else {
              if (role.toLowerCase().includes('quản lý')) rate = '45.000 đ/h';
              else if (role.toLowerCase().includes('pha chế')) rate = '35.000 đ/h';
              else if (role.toLowerCase().includes('thu ngân')) rate = '30.000 đ/h';
              else if (role.toLowerCase().includes('phục vụ')) rate = '28.000 đ/h';
            }

            let iconBgColor = '#FFF9E6'; // amber-50
            let iconColor = '#F59E0B'; // amber-500
            let slotIcon = slot.icon || '☀️';

            if (slot.id === 'afternoon' || slotIcon === '⛅') {
              iconBgColor = '#FFF0EA'; // orange-50
              iconColor = '#FF6B00'; // orange-500
            } else if (slot.id === 'evening' || slotIcon === '🌙') {
              iconBgColor = '#EEF2FF'; // indigo-50
              iconColor = '#4F46E5'; // indigo-600
            } else if (slotIcon === '⏰') {
              iconBgColor = '#F1F5F9'; // slate-100
              iconColor = '#64748B'; // slate-500
            } else if (slotIcon === '⭐') {
              iconBgColor = '#FEF3C7'; // amber-100
              iconColor = '#D97706'; // amber-600
            }

            const isPrimaryBadge = slot.id === 'evening' || slot.name.toLowerCase().includes('tối') || slot.name.toLowerCase().includes('cao điểm');
            const badgeBg = isPrimaryBadge ? 'rgba(255, 107, 0, 0.1)' : 'rgba(91, 0, 223, 0.1)';
            const badgeTextColor = isPrimaryBadge ? '#FF6B00' : '#5B00DF';

            const avatarSource = getAvatarSource(null, staff?.gender, assignedStaffName);

            if (isAssigned) {
              return (
                <View key={slot.id} style={styles.bentoCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.slotDetails}>
                      <View style={[styles.iconWrapper, { backgroundColor: iconBgColor }]}>
                        <Text style={[styles.slotIconText, { color: iconColor }]}>{slotIcon}</Text>
                      </View>
                      <View>
                        <Text style={styles.slotNameText}>{slot.name}</Text>
                        <Text style={styles.slotTimeText}>{slot.time}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => openAssignModal(slot.id)}
                      style={[styles.roleBadge, { backgroundColor: badgeBg }]}
                    >
                      <Text style={[styles.roleBadgeText, { color: badgeTextColor }]}>
                        {role}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => openAssignModal(slot.id)}
                    style={styles.assignedStaffBox}
                  >
                    <Image source={avatarSource} style={styles.staffAvatarImage} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.staffNameText}>{assignedStaffName}</Text>
                      <Text style={styles.staffRateText}>Lương ca: {rate}</Text>
                    </View>
                    <Text style={styles.assignedBadgeText}>Đã gán nhân sự</Text>
                  </TouchableOpacity>
                </View>
              );
            } else {
              return (
                <View key={slot.id} style={styles.unassignedCard}>
                  <View style={styles.bracketTL} />
                  <View style={styles.bracketTR} />
                  <View style={styles.bracketBL} />
                  <View style={styles.bracketBR} />

                  <View style={styles.cardHeader}>
                    <View style={styles.slotDetails}>
                      <View style={[styles.iconWrapper, { backgroundColor: iconBgColor }]}>
                        <Text style={[styles.slotIconText, { color: iconColor }]}>{slotIcon}</Text>
                      </View>
                      <View>
                        <Text style={styles.slotNameText}>{slot.name}</Text>
                        <Text style={styles.slotTimeText}>{slot.time}</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.unassignedButton}
                    activeOpacity={0.8}
                    onPress={() => openAssignModal(slot.id)}
                  >
                    <Text style={styles.unassignedButtonText}>
                      [+] Gán Nhân Sự 👤
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }
          })}
        </View>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 Hướng dẫn xếp ca nhanh</Text>
          <Text style={styles.infoBody}>
            Nhấn vào nút <Text style={{fontWeight: 'bold'}}>Gán Nhân Sự</Text> hoặc hộp thoại thông tin nhân viên trên bất kỳ ca làm nào để mở danh sách nhân sự nội bộ và phân công làm việc.
          </Text>
        </View>
      </ScrollView>

      {/* Staff Selector Modal (Bottom Sheet style) */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Gán nhân sự vào {assigningShift ? (shiftSlots.find(s => s.id === assigningShift.slotId)?.name || 'ca làm') : 'ca làm'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm tên nhân viên..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView contentContainerStyle={styles.modalList} showsVerticalScrollIndicator={false}>
              {filteredStaff.map((staff) => {
                const avatarSource = getAvatarSource(null, staff.gender, staff.name);
                const slotSchedule = (localSchedules || []).find(s => s.note === assigningShift?.slotId);
                const isSelected = slotSchedule && slotSchedule.employeeId === staff.id;

                return (
                  <TouchableOpacity
                    key={staff.id}
                    style={[
                      styles.staffSelectCard,
                      isSelected && styles.staffSelectCardActive
                    ]}
                    onPress={() => {
                      handleAssignStaff(staff.id);
                      setSearchQuery('');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.staffSelectLeft}>
                      <Image source={avatarSource} style={styles.staffSelectAvatar} />
                      <View>
                        <Text style={styles.selectStaffName}>{staff.name}</Text>
                        <Text style={[styles.selectStaffType, { color: staff.isExternal ? '#5B00DF' : '#FF6B00' }]}>
                          {staff.isExternal ? 'VÃNG LAI STAFF' : 'NỘI BỘ STAFF'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.radioButton, isSelected && styles.radioButtonActive]}>
                      {isSelected && <View style={styles.radioButtonInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.specialActionContainer}>
              <TouchableOpacity
                style={styles.unassignButtonModal}
                onPress={handleUnassignStaff}
                activeOpacity={0.8}
              >
                <Text style={styles.unassignButtonTextModal}>
                  ⚠️ Bỏ trống ca làm này
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Shift Modal */}
      <Modal
        visible={addShiftModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setAddShiftModalVisible(false);
          resetNewShiftForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm ca làm việc mới</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setAddShiftModalVisible(false);
                  resetNewShiftForm();
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.addShiftForm} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Tên ca làm việc</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ví dụ: Ca Giữa Trưa, Ca Chiều..."
                placeholderTextColor="#94A3B8"
                value={newShiftName}
                onChangeText={setNewShiftName}
              />

              <View style={styles.timeInputsRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.inputLabel}>Giờ bắt đầu</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="HH:MM (ví dụ: 11:00)"
                    placeholderTextColor="#94A3B8"
                    value={newShiftStart}
                    onChangeText={setNewShiftStart}
                    maxLength={5}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Giờ kết thúc</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="HH:MM (ví dụ: 15:00)"
                    placeholderTextColor="#94A3B8"
                    value={newShiftEnd}
                    onChangeText={setNewShiftEnd}
                    maxLength={5}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Biểu tượng ca làm</Text>
              <View style={styles.iconSelectionRow}>
                {['☀️', '⛅', '🌙', '⏰', '⭐'].map(icon => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconSelectorOpt,
                      newShiftIcon === icon && styles.iconSelectorOptActive
                    ]}
                    onPress={() => setNewShiftIcon(icon)}
                  >
                    <Text style={styles.iconSelectorText}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.submitShiftButton}
                onPress={handleAddShiftSubmit}
                activeOpacity={0.8}
              >
                <Text style={styles.submitShiftButtonText}>Thêm Ca Làm Việc</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.floatingFab}
        onPress={() => setAddShiftModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.fabPlusHorizontal} />
        <View style={styles.fabPlusVertical} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  weekTimeline: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEEF0',
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  daysScroll: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  dayHeaderCell: {
    width: 52,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(226, 191, 176, 0.2)',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)',
      }
    }),
  },
  selectedDayHeaderCell: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  todayHeaderCell: {
    borderWidth: 1.5,
    borderColor: '#FF6B00',
  },
  dayNameText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  selectedDayNameText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dayDateText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#181C1E',
    marginTop: 4,
  },
  selectedDayDateText: {
    color: '#FFFFFF',
  },
  activeIndicatorDot: {
    position: 'absolute',
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  todayIndicatorDot: {
    position: 'absolute',
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF6B00',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  daySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  todayTag: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    color: '#FF6B00',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#181C1E',
  },
  floatingFab: {
    position: 'absolute',
    bottom: 24,
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

  shiftGridContainer: {
    marginBottom: 24,
  },

  // Bento-style assigned card
  bentoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 191, 176, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 30,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.08)',
      }
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  slotDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  slotIconText: {
    fontSize: 24,
  },
  slotNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#181C1E',
  },
  slotTimeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  assignedStaffBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6F8',
    padding: 16,
    borderRadius: 16,
  },
  staffAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: 12,
  },
  staffNameText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#181C1E',
  },
  staffRateText: {
    fontSize: 12,
    color: '#FF6B00',
    fontWeight: 'bold',
    marginTop: 2,
  },
  assignedBadgeText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },

  // Bento-style unassigned card
  unassignedCard: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 0, 0.2)',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  bracketTL: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 12,
    height: 12,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FF6B00',
  },
  bracketTR: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 12,
    height: 12,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#FF6B00',
  },
  bracketBL: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 12,
    height: 12,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FF6B00',
  },
  bracketBR: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 12,
    height: 12,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: '#FF6B00',
  },
  unassignedButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    borderWidth: 1,
    borderColor: '#FF6B00',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  unassignedButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF6B00',
  },

  infoCard: {
    backgroundColor: 'rgba(255, 107, 0, 0.05)',
    borderColor: 'rgba(255, 107, 0, 0.1)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FF6B00',
    marginBottom: 4,
  },
  infoBody: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },

  // Bottom Sheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 48,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    alignSelf: 'center',
    marginVertical: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#181C1E',
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5A4136',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#EBEEF0',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#181C1E',
    height: '100%',
  },
  modalList: {
    paddingHorizontal: 24,
  },
  staffSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  staffSelectCardActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.06)',
    borderColor: '#FF6B00',
  },
  staffSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffSelectAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 12,
  },
  selectStaffName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#181C1E',
  },
  selectStaffType: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonActive: {
    borderColor: '#FF6B00',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B00',
  },

  specialActionContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  unassignButtonModal: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unassignButtonTextModal: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Add Shift Form Styles
  addShiftForm: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A5568',
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EBEEF0',
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#181C1E',
  },
  timeInputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconSelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 24,
  },
  iconSelectorOpt: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EBEEF0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSelectorOptActive: {
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255, 107, 0, 0.05)',
  },
  iconSelectorText: {
    fontSize: 24,
  },
  submitShiftButton: {
    backgroundColor: '#FF6B00',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 12px rgba(255, 107, 0, 0.3)',
      }
    }),
  },
  submitShiftButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
