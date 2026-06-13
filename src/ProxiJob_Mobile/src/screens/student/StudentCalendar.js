import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';

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

export default function StudentCalendar() {
  const { shifts, navigateTo, loadMyApplications, user } = useContext(AppContext);
  const [weekDays, setWeekDays] = useState([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'completed'

  React.useEffect(() => {
    if (user?.id) {
      loadMyApplications(user.id);
    }
    const days = getCurrentWeekDays();
    setWeekDays(days);
    const todayIdx = days.findIndex(d => d.isToday);
    setSelectedDayIndex(todayIdx >= 0 ? todayIdx : 0);
  }, []);

  const isSameDate = (shiftStartTime, apiDateStr) => {
    if (!shiftStartTime || !apiDateStr) return false;
    try {
      const shiftDate = new Date(shiftStartTime);
      const [year, month, day] = apiDateStr.split('-').map(Number);
      return shiftDate.getFullYear() === year && 
             (shiftDate.getMonth() + 1) === month && 
             shiftDate.getDate() === day;
    } catch (e) {
      return false;
    }
  };

  const selectedDay = weekDays[selectedDayIndex];

  // Filter approved/active/applied shifts globally
  const upcomingShiftsGlobal = shifts.filter(
    (s) => s.status === 'approved' || s.status === 'checkin_active' || s.status === 'applied'
  );

  // Filter completed shifts globally
  const completedShiftsGlobal = shifts.filter((s) => s.status === 'completed');

  // Filter approved/active/applied shifts by selected day
  const upcomingShifts = upcomingShiftsGlobal.filter(s =>
    selectedDay ? isSameDate(s.startTime, selectedDay.apiDateStr) : true
  );

  // Filter completed shifts by selected day
  const completedShifts = completedShiftsGlobal.filter(s =>
    selectedDay ? isSameDate(s.startTime, selectedDay.apiDateStr) : true
  );

  // Calculate monthly earnings
  const completedEarnings = completedShiftsGlobal.reduce((sum, s) => sum + s.hourlyRate * 4, 0); // assume 4hr shifts
  const projectedEarnings = upcomingShiftsGlobal.filter(s => s.status !== 'applied').reduce((sum, s) => sum + s.hourlyRate * 4, 0);
  const totalEarnings = completedEarnings + projectedEarnings + 3250000; // seed static baseline earnings

  const getTimelineLabel = () => {
    if (!selectedDay) return 'Tuần này';
    return `Tuần này (Tháng ${selectedDay.month}, ${selectedDay.fullYear})`;
  };

  const getDaySummaryTitle = () => {
    if (!selectedDay) return 'Lịch trình';
    const dayName = selectedDay.name === 'CN' ? 'Chủ Nhật' : `Thứ ${selectedDay.name.slice(1)}`;
    return `Lịch trình: ${dayName} (${selectedDay.date}/${selectedDay.fullYear})`;
  };

  const renderShiftItem = (shift) => {
    const isWorking = shift.status === 'checkin_active';
    const isCompleted = shift.status === 'completed';
    const isApplied = shift.status === 'applied';
    const isApproved = shift.status === 'approved';

    return (
      <View key={shift.id} style={styles.shiftCard}>
        {/* Futuristic Viewfinder Bracket Accents */}
        <View style={styles.viewfinderCornerTL} />
        <View style={styles.viewfinderCornerBR} />

        <View style={styles.shiftCardHeader}>
          <View style={{flex: 1, paddingRight: 8}}>
            <Text style={styles.shiftShopName}>{shift.shopName.toUpperCase()}</Text>
            <Text style={styles.shiftTitle}>{shift.title}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            isWorking && styles.badgeWorking,
            isCompleted && styles.badgeCompleted,
            isApplied && styles.badgeApplied
          ]}>
            <Text style={[
              styles.statusText,
              isWorking && styles.textWorking,
              isCompleted && styles.textCompleted,
              isApplied && styles.textApplied
            ]}>
              {isWorking ? '⚡ Đang làm' : isCompleted ? '✅ Đã hoàn thành' : isApplied ? '⏳ Chờ duyệt' : '📅 Đã duyệt'}
            </Text>
          </View>
        </View>

        <View style={styles.shiftCardDetails}>
          <Text style={styles.detailRow}>⏰ {shift.time} ({shift.date})</Text>
          <Text style={styles.detailRow}>💰 Lương dự kiến: <Text style={styles.boldText}>{(shift.hourlyRate * 4).toLocaleString('vi-VN')} đ</Text> (4 giờ làm)</Text>
          {isCompleted && (
            <View style={styles.checkInOutTimeBox}>
              <Text style={styles.checkInOutTimeText}>⏱️ Check-in: {shift.checkInTime} | Check-out: {shift.checkOutTime}</Text>
            </View>
          )}
        </View>

        {!isCompleted && (
          <>
            <View style={styles.cardDivider} />
            <TouchableOpacity
              style={[
                styles.checkInActionBtn, 
                isWorking && { backgroundColor: theme.colors.success },
                isApplied && { backgroundColor: theme.colors.textLight }
              ]}
              disabled={isApplied}
              onPress={() => navigateTo('student_checkin', { shiftId: shift.id })}
            >
              <Text style={styles.checkInActionText}>
                {isWorking ? 'Xem phiên điểm danh GPS' : isApplied ? 'Đang chờ chủ quán duyệt hồ sơ...' : '📍 Đến điểm check-in GPS'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      {/* Earnings Header */}
      <View style={styles.earningsCard}>
        <Text style={styles.earningsLabel}>Tổng thu nhập dự kiến tháng này</Text>
        <Text style={styles.earningsValue}>{totalEarnings.toLocaleString('vi-VN')} đ</Text>
        <View style={styles.earningsSubRow}>
          <Text style={styles.earningsSubText}>Đã hoàn tất: {completedEarnings.toLocaleString('vi-VN')} đ</Text>
          <Text style={styles.earningsSubText}>Sắp tới: {projectedEarnings.toLocaleString('vi-VN')} đ</Text>
        </View>
      </View>

      {/* Week Day Header Slider */}
      <View style={styles.weekTimeline}>
        <Text style={styles.timelineLabel}>{getTimelineLabel()}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
          {weekDays.map((day, idx) => {
            const isSelected = selectedDayIndex === idx;
            const dayHasShift = shifts.some(s => isSameDate(s.startTime, day.apiDateStr));
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
                  day.isToday && { color: theme.colors.student }
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
                {dayHasShift && (
                  <View style={[
                    styles.shiftDot,
                    isSelected && { backgroundColor: theme.colors.white }
                  ]} />
                )}
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

        {/* Tab Selection */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'upcoming' && styles.activeTabButton]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'upcoming' && styles.activeTabButtonText]}>
              Ca Sắp Tới ({upcomingShifts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'completed' && styles.activeTabButton]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'completed' && styles.activeTabButtonText]}>
              Lịch Sử ({completedShifts.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Shift list mapping */}
        <View style={styles.shiftsListContainer}>
          {activeTab === 'upcoming' ? (
            upcomingShifts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Bạn không có lịch làm việc nào sắp tới vào ngày này.</Text>
                <Text style={styles.emptySubText}>Vào mục tìm kiếm để nhận thêm ca mới nhé!</Text>
              </View>
            ) : (
              upcomingShifts.map(renderShiftItem)
            )
          ) : (
            completedShifts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Chưa có lịch sử ca làm nào vào ngày này.</Text>
                <Text style={styles.emptySubText}>Hoàn thành các ca làm được giao để nhận lương.</Text>
              </View>
            ) : (
              completedShifts.map(renderShiftItem)
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  earningsCard: {
    backgroundColor: theme.colors.student,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    shadowColor: theme.colors.student,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  earningsLabel: {
    color: theme.colors.white + 'B3',
    fontSize: 12,
    fontWeight: '500',
  },
  earningsValue: {
    color: theme.colors.white,
    fontSize: 26,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  earningsSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.white + '33',
    paddingTop: 8,
    marginTop: 8,
  },
  earningsSubText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
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
    backgroundColor: theme.colors.student,
    borderColor: theme.colors.student,
    shadowColor: theme.colors.student,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  todayHeaderCell: {
    borderWidth: 1.5,
    borderColor: theme.colors.student,
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
    backgroundColor: theme.colors.student,
  },
  shiftDot: {
    position: 'absolute',
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.student,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: theme.spacing.xl,
  },
  daySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  todayTag: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    color: theme.colors.student,
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2.5,
    borderBottomColor: theme.colors.student,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  activeTabButtonText: {
    color: theme.colors.student,
  },
  shiftsListContainer: {
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  shiftCard: {
    position: 'relative',
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
    borderColor: theme.colors.student,
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
    borderColor: theme.colors.student,
    borderBottomRightRadius: 6,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  shiftShopName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5B00DF',
    letterSpacing: 0.5,
  },
  shiftTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#181C1E',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: '#FF6B001F',
    borderWidth: 1,
    borderColor: '#FF6B0033',
  },
  badgeWorking: {
    backgroundColor: '#10B9811F',
    borderColor: '#10B98133',
  },
  badgeCompleted: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  badgeApplied: {
    backgroundColor: '#F59E0B1F',
    borderColor: '#F59E0B33',
  },
  statusText: {
    fontSize: 10,
    color: '#FF6B00',
    fontWeight: 'bold',
  },
  textWorking: {
    color: '#10B981',
  },
  textCompleted: {
    color: '#6B7280',
  },
  textApplied: {
    color: '#F59E0B',
  },
  shiftCardDetails: {
    marginBottom: 4,
    marginTop: 8,
  },
  detailRow: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginVertical: 2,
  },
  boldText: {
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  checkInOutTimeBox: {
    backgroundColor: theme.colors.white,
    padding: 6,
    borderRadius: 6,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  checkInOutTimeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E5E9EB',
    opacity: 0.6,
    marginVertical: 12,
  },
  checkInActionBtn: {
    backgroundColor: theme.colors.student,
    height: 40,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInActionText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  emptySubText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  }
});
