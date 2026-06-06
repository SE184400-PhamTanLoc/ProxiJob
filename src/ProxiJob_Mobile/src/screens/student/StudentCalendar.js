import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';

export default function StudentCalendar({ onNavigateToCheckIn }) {
  const { shifts } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'completed'
  const [selectedDay, setSelectedDay] = useState(5); // June 5th (default current day)

  // Filter approved/active shifts
  const upcomingShifts = shifts.filter(
    (s) => s.status === 'approved' || s.status === 'checkin_active'
  );

  // Filter completed shifts
  const completedShifts = shifts.filter((s) => s.status === 'completed');

  // Calculate monthly earnings
  const completedEarnings = completedShifts.reduce((sum, s) => sum + s.hourlyRate * 4, 0); // assume 4hr shifts
  const projectedEarnings = upcomingShifts.reduce((sum, s) => sum + s.hourlyRate * 4, 0);
  const totalEarnings = completedEarnings + projectedEarnings + 3250000; // seed static baseline earnings

  // Mock Calendar days for June 2026 (June 1st is Monday)
  // Calendar grid starting Monday
  const days = [
    { num: 1, hasShift: false },
    { num: 2, hasShift: false },
    { num: 3, hasShift: false },
    { num: 4, hasShift: false },
    { num: 5, hasShift: true, isToday: true }, // Jun 5: Shift 101, 103
    { num: 6, hasShift: true }, // Jun 6: Shift 102
    { num: 7, hasShift: true }, // Jun 7: Shift 104
    { num: 8, hasShift: true }, // Jun 8: Shift 105
    { num: 9, hasShift: false },
    { num: 10, hasShift: false },
    { num: 11, hasShift: false },
    { num: 12, hasShift: false },
    { num: 13, hasShift: false },
    { num: 14, hasShift: false },
    { num: 15, hasShift: false },
    { num: 16, hasShift: false },
    { num: 17, hasShift: false },
    { num: 18, hasShift: false },
    { num: 19, hasShift: false },
    { num: 20, hasShift: false },
    { num: 21, hasShift: false },
    { num: 22, hasShift: false },
    { num: 23, hasShift: false },
    { num: 24, hasShift: false },
    { num: 25, hasShift: false },
    { num: 26, hasShift: false },
    { num: 27, hasShift: false },
    { num: 28, hasShift: false },
    { num: 29, hasShift: false },
    { num: 30, hasShift: false },
  ];

  const renderShiftItem = (shift) => {
    const isWorking = shift.status === 'checkin_active';
    const isCompleted = shift.status === 'completed';

    return (
      <View key={shift.id} style={[styles.shiftCard, theme.shadows.light]}>
        <View style={styles.shiftCardHeader}>
          <View style={{flex: 1}}>
            <Text style={styles.shiftShopName}>{shift.shopName}</Text>
            <Text style={styles.shiftTitle}>{shift.title}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            isWorking && styles.badgeWorking,
            isCompleted && styles.badgeCompleted
          ]}>
            <Text style={[
              styles.statusText,
              isWorking && styles.textWorking,
              isCompleted && styles.textCompleted
            ]}>
              {isWorking ? '⚡ Đang làm' : isCompleted ? '✅ Đã hoàn thành' : '📅 Chờ nhận ca'}
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
          <TouchableOpacity
            style={[styles.checkInActionBtn, isWorking && { backgroundColor: theme.colors.success }]}
            onPress={() => onNavigateToCheckIn && onNavigateToCheckIn(shift)}
          >
            <Text style={styles.checkInActionText}>
              {isWorking ? 'Xem phiên điểm danh GPS' : '📍 Đến điểm check-in GPS'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Earnings Header */}
      <View style={styles.earningsCard}>
        <Text style={styles.earningsLabel}>Tổng thu nhập dự kiến tháng này</Text>
        <Text style={styles.earningsValue}>{totalEarnings.toLocaleString('vi-VN')} đ</Text>
        <View style={styles.earningsSubRow}>
          <Text style={styles.earningsSubText}>Đã hoàn tất: {completedEarnings.toLocaleString('vi-VN')} đ</Text>
          <Text style={styles.earningsSubText}>Sắp tới: {projectedEarnings.toLocaleString('vi-VN')} đ</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Calendar Title */}
        <Text style={styles.sectionHeader}>Tháng 6, 2026</Text>
        
        {/* Custom Mock Calendar Grid */}
        <View style={[styles.calendarContainer, theme.shadows.light]}>
          {/* Weekday headers */}
          <View style={styles.weekHeaders}>
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((h, i) => (
              <Text key={i} style={styles.weekHeaderText}>{h}</Text>
            ))}
          </View>
          
          {/* Month grid */}
          <View style={styles.daysGrid}>
            {days.map((day) => {
              const isSelected = selectedDay === day.num;
              return (
                <TouchableOpacity
                  key={day.num}
                  style={[
                    styles.dayCell,
                    day.isToday && styles.todayCell,
                    isSelected && styles.selectedDayCell
                  ]}
                  onPress={() => setSelectedDay(day.num)}
                >
                  <Text style={[
                    styles.dayNumber,
                    day.isToday && styles.todayDayNumber,
                    isSelected && styles.selectedDayNumber
                  ]}>
                    {day.num}
                  </Text>
                  {day.hasShift && (
                    <View style={[
                      styles.shiftDot,
                      isSelected && { backgroundColor: theme.colors.white }
                    ]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
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
                <Text style={styles.emptyText}>Bạn không có lịch làm việc nào sắp tới.</Text>
                <Text style={styles.emptySubText}>Vào mục tìm kiếm để nhận thêm ca mới nhé!</Text>
              </View>
            ) : (
              upcomingShifts.map(renderShiftItem)
            )
          ) : (
            completedShifts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Chưa có lịch sử ca làm nào được lưu lại.</Text>
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
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  calendarContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  weekHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekHeaderText: {
    width: 32,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    borderRadius: 8,
    position: 'relative',
  },
  todayCell: {
    borderWidth: 1,
    borderColor: theme.colors.student,
  },
  selectedDayCell: {
    backgroundColor: theme.colors.student,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
  },
  todayDayNumber: {
    color: theme.colors.student,
    fontWeight: 'bold',
  },
  selectedDayNumber: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  shiftDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  shiftShopName: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  shiftTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: theme.colors.primary + '1A',
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary + '33',
  },
  badgeWorking: {
    backgroundColor: theme.colors.success + '1A',
    borderColor: theme.colors.success + '33',
  },
  badgeCompleted: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderColor: theme.colors.border,
  },
  statusText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  textWorking: {
    color: theme.colors.success,
  },
  textCompleted: {
    color: theme.colors.textMuted,
  },
  shiftCardDetails: {
    marginBottom: theme.spacing.md,
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
  checkInActionBtn: {
    backgroundColor: theme.colors.student,
    height: 40,
    borderRadius: theme.borderRadius.sm,
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
