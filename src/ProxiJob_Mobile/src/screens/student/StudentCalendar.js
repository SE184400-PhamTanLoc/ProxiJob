import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';
import { useShiftsQuery } from '../../hooks/queries';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

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
  const { navigateTo, user, studentCoords, activeShift } = useContext(AppContext);
  const { data: shifts = [], refetch: loadMyApplications } = useShiftsQuery(user, studentCoords);
  const [weekDays, setWeekDays] = useState([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'completed'

  React.useEffect(() => {
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
    return `Tháng ${selectedDay.month}, ${selectedDay.fullYear}`;
  };

  const getDaySummaryTitle = () => {
    if (!selectedDay) return 'Lịch trình';
    const dayName = selectedDay.name === 'CN' ? 'Chủ Nhật' : `Thứ ${selectedDay.name.slice(1)}`;
    return `${dayName}, ${selectedDay.date.split('/')[0]} tháng ${selectedDay.month}`;
  };

  const renderShiftItem = (shift) => {
    const isWorking = shift.status === 'checkin_active' || 
                      (activeShift && (
                        activeShift.id === shift.id || 
                        activeShift.jobShiftId === shift.id ||
                        `sched_${activeShift.id}` === shift.id ||
                        activeShift.id === `sched_${shift.id}`
                      ));
    const isCompleted = shift.status === 'completed';
    const isApplied = shift.status === 'applied';
    const isApproved = shift.status === 'approved' && !isWorking;

    // Left indicator border and visual colors
    let statusColor = '#94A3B8';
    let statusText = 'CHỜ DUYỆT';
    let badgeBg = '#F1F5F9';
    let badgeText = '#475569';

    if (isWorking) {
      statusColor = '#10B981';
      statusText = 'ĐANG LÀM VIỆC';
      badgeBg = '#ECFDF5';
      badgeText = '#10B981';
    } else if (isApproved) {
      statusColor = '#FF6B00';
      statusText = 'ĐÃ DUYỆT';
      badgeBg = '#FFF3EB';
      badgeText = '#FF6B00';
    } else if (isApplied) {
      statusColor = '#F59E0B';
      statusText = 'CHỜ DUYỆT';
      badgeBg = '#FEF3C7';
      badgeText = '#D97706';
    } else if (isCompleted) {
      statusColor = '#64748B';
      statusText = 'HOÀN THÀNH';
      badgeBg = '#F8FAFC';
      badgeText = '#64748B';
    }

    return (
      <View key={shift.id} style={[styles.shiftCard, { borderLeftColor: statusColor }]}>
        {/* Top: Status Badges & Quick Action */}
        <View style={styles.cardHeaderRow}>
          <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: badgeText }]}>{statusText}</Text>
          </View>
          <TouchableOpacity style={styles.ellipsisButton} activeOpacity={0.6}>
            <Ionicons name="ellipsis-horizontal" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.shiftTitle}>{shift.title}</Text>

        {/* Location & Brand */}
        <View style={styles.cardInfoRow}>
          <View style={styles.iconCircleBg}>
            <Ionicons name="storefront-outline" size={14} color="#FF6B00" />
          </View>
          <Text style={styles.infoText} numberOfLines={1}>
            {shift.shopName}
          </Text>
        </View>

        <View style={styles.cardInfoRow}>
          <View style={styles.iconCircleBg}>
            <Ionicons name="location-outline" size={14} color="#64748B" />
          </View>
          <Text style={styles.infoText} numberOfLines={1}>
            {shift.address}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Bottom Metadata & Earnings */}
        <View style={styles.cardFooterRow}>
          <View style={styles.timeMeta}>
            <Ionicons name="time-outline" size={15} color="#FF6B00" style={{ marginRight: 6 }} />
            <Text style={styles.timeText}>{shift.time}</Text>
          </View>
          <View style={styles.earningsWrapper}>
            <Text style={styles.earningsLabelText}>Lương ước tính</Text>
            <Text style={styles.earningsValueText}>
              {(shift.hourlyRate * 4).toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>

        {/* Interactive Action Button for non-completed */}
        {!isCompleted && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              isWorking && styles.actionButtonActive,
              isApplied && styles.actionButtonDisabled
            ]}
            disabled={isApplied}
            activeOpacity={0.8}
            onPress={() => navigateTo('student_checkin', { shiftId: shift.id })}
          >
            <Ionicons
              name={isWorking ? "checkmark-circle-outline" : isApplied ? "hourglass-outline" : "location-outline"}
              size={16}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.actionButtonText}>
              {isWorking ? 'Đã điểm danh' : isApplied ? 'Chờ duyệt hồ sơ...' : 'Điểm danh GPS ngay'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      {/* Sleek Custom Top Navigation Bar */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>Lịch làm việc</Text>
          <Text style={styles.headerSubtitle}>Chào ngày mới! Xem lịch trình của bạn</Text>
        </View>
        <TouchableOpacity style={styles.headerBadge} activeOpacity={0.7} onPress={() => loadMyApplications()}>
          <Text style={styles.headerBadgeText}>Làm mới</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Earnings Card with Modern FinTech Styling */}
        <View style={styles.earningsCard}>
          {/* Abstract backgrounds bubbles for visual depth */}
          <View style={styles.cardBubbleLeft} />
          <View style={styles.cardBubbleRight} />

          <View style={styles.earningsHeader}>
            <View>
              <Text style={styles.earningsTitle}>Thu nhập tháng này</Text>
              <Text style={styles.earningsSubTitle}>Tổng thu nhập ước tính của bạn</Text>
            </View>
            <View style={styles.walletIconContainer}>
              <Ionicons name="wallet" size={24} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.earningsMainValue}>{totalEarnings.toLocaleString('vi-VN')}đ</Text>

          <View style={styles.earningsFooter}>
            <View style={styles.earningsSplit}>
              <Ionicons name="checkmark-circle" size={14} color="rgba(255,255,255,0.7)" style={{ marginRight: 4 }} />
              <Text style={styles.earningsSplitText}>Đã nhận: {completedEarnings.toLocaleString('vi-VN')}đ</Text>
            </View>
            <View style={styles.earningsSplitDivider} />
            <View style={styles.earningsSplit}>
              <Ionicons name="calendar" size={14} color="rgba(255,255,255,0.7)" style={{ marginRight: 4 }} />
              <Text style={styles.earningsSplitText}>Chờ nhận: {projectedEarnings.toLocaleString('vi-VN')}đ</Text>
            </View>
          </View>
        </View>

        {/* Elegant Week Timeline Navigation */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineHeading}>{getTimelineLabel()}</Text>
            <TouchableOpacity style={styles.todayButton} onPress={() => {
              const todayIdx = weekDays.findIndex(d => d.isToday);
              if (todayIdx >= 0) setSelectedDayIndex(todayIdx);
            }}>
              <Text style={styles.todayButtonText}>Hôm nay</Text>
            </TouchableOpacity>
          </View>

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
                  activeOpacity={0.8}
                  onPress={() => setSelectedDayIndex(idx)}
                >
                  <Text style={[
                    styles.dayNameText,
                    isSelected && styles.selectedDayNameText,
                    day.isToday && !isSelected && { color: '#FF6B00', fontWeight: '800' }
                  ]}>
                    {day.name}
                  </Text>
                  <Text style={[
                    styles.dayDateText,
                    isSelected && styles.selectedDayDateText,
                    day.isToday && !isSelected && { color: '#FF6B00' }
                  ]}>
                    {day.date.split('/')[0]}
                  </Text>
                  
                  {dayHasShift && (
                    <View style={[
                      styles.shiftIndicatorDot,
                      isSelected ? { backgroundColor: '#FFFFFF' } : { backgroundColor: '#FF6B00' }
                    ]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tab Selection Segments */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'upcoming' && styles.activeTabButton]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'upcoming' && styles.activeTabButtonText]}>
              Ca sắp tới ({upcomingShifts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'completed' && styles.activeTabButton]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'completed' && styles.activeTabButtonText]}>
              Lịch sử ca ({completedShifts.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* List Header title */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderTitle}>{getDaySummaryTitle()}</Text>
          {selectedDay?.isToday && (
            <View style={styles.todayPillBadge}>
              <Text style={styles.todayPillText}>Hôm nay</Text>
            </View>
          )}
        </View>

        {/* Shifts List mapping */}
        <View style={styles.shiftsListContainer}>
          {activeTab === 'upcoming' ? (
            upcomingShifts.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBg}>
                  <Ionicons name="calendar-clear-outline" size={32} color="#94A3B8" />
                </View>
                <Text style={styles.emptyText}>Trống lịch trình</Text>
                <Text style={styles.emptySubText}>Bạn không có ca làm việc nào trong ngày này.</Text>
              </View>
            ) : (
              upcomingShifts.map(renderShiftItem)
            )
          ) : (
            completedShifts.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBg}>
                  <Ionicons name="checkmark-done-circle-outline" size={32} color="#94A3B8" />
                </View>
                <Text style={styles.emptyText}>Chưa có lịch sử ca</Text>
                <Text style={styles.emptySubText}>Hoàn thành ca làm việc để xem lịch sử tích lũy tại đây.</Text>
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
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1.0,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  headerBadge: {
    backgroundColor: '#FFF3EB',
    borderWidth: 1,
    borderColor: '#FFE0CC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerBadgeText: {
    fontSize: 12,
    color: '#FF6B00',
    fontWeight: '800',
  },
  scrollContent: {
    paddingBottom: 130,
  },
  earningsCard: {
    backgroundColor: '#FF6B00',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 24,
    padding: 22,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
  cardBubbleLeft: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    top: -60,
    left: -40,
  },
  cardBubbleRight: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -90,
    right: -40,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  earningsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    opacity: 0.95,
  },
  earningsSubTitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
    marginTop: 1,
  },
  walletIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  earningsMainValue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 14,
    zIndex: 2,
    letterSpacing: -0.5,
  },
  earningsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 12,
    marginTop: 2,
    zIndex: 2,
  },
  earningsSplit: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  earningsSplitText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  earningsSplitDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 12,
  },
  timelineSection: {
    marginTop: 20,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  timelineHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  todayButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFEBE0',
  },
  todayButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B00',
  },
  daysScroll: {
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  dayHeaderCell: {
    width: 52,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedDayHeaderCell: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  todayHeaderCell: {
    borderWidth: 1.5,
    borderColor: '#FF6B00',
    backgroundColor: '#FFF8F4',
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  selectedDayNameText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '700',
  },
  dayDateText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 4,
  },
  selectedDayDateText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  shiftIndicatorDot: {
    position: 'absolute',
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  activeTabButtonText: {
    color: '#FF6B00',
    fontWeight: '800',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 10,
  },
  listHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  todayPillBadge: {
    backgroundColor: '#FFF3EB',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  todayPillText: {
    color: '#FF6B00',
    fontSize: 10,
    fontWeight: '800',
  },
  shiftsListContainer: {
    paddingHorizontal: 20,
  },
  shiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 5,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  ellipsisButton: {
    padding: 2,
  },
  shiftTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 20,
    marginBottom: 10,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircleBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  earningsWrapper: {
    alignItems: 'flex-end',
  },
  earningsLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  earningsValueText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 1,
  },
  actionButton: {
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 14,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonActive: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  actionButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowColor: 'transparent',
    elevation: 0,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 4,
  },
  emptyIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
    lineHeight: 16,
  }
});
