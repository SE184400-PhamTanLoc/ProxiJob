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
import { useShiftsQuery } from '../../hooks/queries';
import { Ionicons } from '@expo/vector-icons';

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

const getDistrict = (address) => {
  if (!address) return '';
  const match = address.match(/(Quận \d+|Q\.\s*\d+|Quận [a-zA-ZÀ-ỹ\s]+|Bình Thạnh|Gò Vấp|Thủ Đức|Phú Nhuận|Tân Bình|Tân Phú|Bình Tân)/i);
  return match ? match[0] : address;
};

const getShiftDateLabel = (startTime) => {
  if (!startTime) return '';
  const date = new Date(startTime);
  const today = new Date();
  
  // Reset hours to compare dates only
  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const diffTime = dDate.getTime() - dToday.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Hôm nay';
  } else if (diffDays === 1) {
    return `Mai, ${date.getDate()} Th${date.getMonth() + 1}`;
  } else if (diffDays === -1) {
    return `Hôm qua`;
  }
  
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dayName = dayNames[date.getDay()];
  return `${dayName}, ${date.getDate()} Th${date.getMonth() + 1}`;
};

export default function StudentCalendar() {
  const { navigateTo, user, studentCoords } = useContext(AppContext);
  const { data: shifts = [], refetch: loadMyApplications } = useShiftsQuery(user, studentCoords);
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

    // Left border color indicating status: Orange for approved/working, Yellow for applied/waiting, Gray for completed
    let leftBorderColor = '#94A3B8';
    if (isApproved || isWorking) {
      leftBorderColor = '#FF6B00';
    } else if (isApplied) {
      leftBorderColor = '#FFD200';
    }

    return (
      <View key={shift.id} style={[styles.shiftCard, { borderLeftColor: leftBorderColor, borderLeftWidth: 6 }]}>
        {/* Top row: Status pill badge + Ellipsis vertical icon */}
        <View style={styles.cardHeaderRow}>
          <View style={[
            styles.statusBadge,
            isWorking && styles.badgeWorking,
            isCompleted && styles.badgeCompleted,
            isApplied && styles.badgeApplied,
            isApproved && styles.badgeApproved
          ]}>
            <Text style={[
              styles.statusText,
              isWorking && styles.textWorking,
              isCompleted && styles.textCompleted,
              isApplied && styles.textApplied,
              isApproved && styles.textApproved
            ]}>
              {isWorking ? 'ĐANG LÀM' : isCompleted ? 'HOÀN THÀNH' : isApplied ? 'ĐANG CHỜ' : 'ĐÃ DUYỆT'}
            </Text>
          </View>
          <TouchableOpacity style={styles.ellipsisButton} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Middle row: Job title + Location row (Pin icon + Shop name & District) */}
        <View style={styles.cardBodyContainer}>
          <Text style={styles.shiftTitle}>{shift.title}</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-sharp" size={14} color="#FF6B00" style={{ marginRight: 4 }} />
            <Text style={styles.shiftShopName}>
              {shift.shopName}, {getDistrict(shift.address) || 'Q. 1'}
            </Text>
          </View>
        </View>

        {/* Divider line */}
        <View style={styles.cardDivider} />

        {/* Bottom row: Left column: Date & Time range. Right column: Money earnings (value + unit below) */}
        <View style={styles.cardFooterRow}>
          <View style={styles.footerLeftColumn}>
            <Text style={styles.footerDateLabel}>{getShiftDateLabel(shift.startTime)}</Text>
            <Text style={styles.footerTimeRange}>{shift.time}</Text>
          </View>
          <View style={styles.footerRightColumn}>
            <Text style={styles.footerEarningsValue}>
              {(shift.hourlyRate * 4).toLocaleString('vi-VN')}
            </Text>
            <Text style={styles.footerEarningsUnit}>VND</Text>
          </View>
        </View>

        {/* Check-In Action Button (preserved for non-completed shifts with polished styling) */}
        {!isCompleted && (
          <View style={{ marginTop: 14 }}>
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
                {isWorking ? '⚡ Xem phiên điểm danh GPS' : isApplied ? '⏳ Đang chờ chủ quán duyệt hồ sơ...' : '📍 Điểm danh GPS'}
              </Text>
            </TouchableOpacity>
          </View>
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
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    shadowColor: theme.colors.student,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  earningsLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  earningsValue: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: '800',
    marginVertical: 6,
  },
  earningsSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 10,
    marginTop: 6,
  },
  earningsSubText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  weekTimeline: {
    backgroundColor: '#FFFFFF',
    paddingTop: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    paddingHorizontal: 16,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  daysScroll: {
    paddingHorizontal: 12,
    paddingBottom: 14,
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
    borderColor: '#F1F5F9',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 4px 12px -5px rgba(0, 0, 0, 0.05)',
      }
    }),
  },
  selectedDayHeaderCell: {
    backgroundColor: theme.colors.student,
    borderColor: theme.colors.student,
    shadowColor: theme.colors.student,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  todayHeaderCell: {
    borderWidth: 1.5,
    borderColor: theme.colors.student,
  },
  dayNameText: {
    fontSize: 11,
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
    color: '#1E293B',
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
    paddingBottom: 120,
  },
  daySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: theme.spacing.md,
    paddingHorizontal: 8,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  todayTag: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    color: theme.colors.student,
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
  },
  activeTabButtonText: {
    color: theme.colors.student,
  },
  shiftsListContainer: {
    paddingHorizontal: 4,
    marginTop: 16,
  },
  shiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeWorking: {
    backgroundColor: '#E8F5E9',
  },
  badgeCompleted: {
    backgroundColor: '#F1F5F9',
  },
  badgeApplied: {
    backgroundColor: '#FFF9C4',
  },
  badgeApproved: {
    backgroundColor: '#FFEBE0',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  textWorking: {
    color: '#2E7D32',
  },
  textCompleted: {
    color: '#475569',
  },
  textApplied: {
    color: '#F59E0B',
  },
  textApproved: {
    color: '#FF6B00',
  },
  ellipsisButton: {
    padding: 4,
  },
  cardBodyContainer: {
    marginBottom: 12,
  },
  shiftTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 22,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  shiftShopName: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLeftColumn: {
    flex: 1,
  },
  footerRightColumn: {
    alignItems: 'flex-end',
  },
  footerDateLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  footerTimeRange: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  footerEarningsValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  footerEarningsUnit: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  checkInActionBtn: {
    backgroundColor: theme.colors.student,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.student,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  checkInActionText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
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

