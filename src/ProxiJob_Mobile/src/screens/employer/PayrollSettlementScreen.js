import React, { useContext, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Platform,
  Modal,
  Dimensions,
  Share,
  TextInput
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../context/AppContext';
import { getAvatarSource } from '../../utils/avatarHelper';
import {
  usePayrollsQuery,
  usePayrollAnalyticsQuery,
  useApproveInterimPayrollMutation,
  useAttendanceLogsQuery,
  useShiftsQuery
} from '../../hooks/queries';

export default function PayrollSettlementScreen() {
  const { user, showToast } = useContext(AppContext);

  const [selectedPeriod, setSelectedPeriod] = useState('week'); // 'day', 'week', 'month'
  const { data: analyticsData = {
    totalDisbursedThisMonth: 0,
    pendingApprovalAmount: 0,
    activeEmployees: 0,
    chartData: { labels: [], datasets: [{ data: [] }] }
  } } = usePayrollAnalyticsQuery(user, selectedPeriod);

  const { data: payrolls = [] } = usePayrollsQuery(user);
  const { data: attendanceLogs = [] } = useAttendanceLogsQuery(user);
  const { data: shifts = [] } = useShiftsQuery(user, null);

  const approveInterimMutation = useApproveInterimPayrollMutation(user, showToast);

  const [expandedCardIds, setExpandedCardIds] = useState([]);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [offlineConfirmed, setOfflineConfirmed] = useState(false);
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [shiftFilter, setShiftFilter] = useState('all'); // 'all', 'morning', 'afternoon'
  const [customHours, setCustomHours] = useState('4');
  const [customAmount, setCustomAmount] = useState(140000);

  // --- BỘ LỌC KHOẢNG NGÀY TÙY CHỈNH ---
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const todayDate = new Date();
  const [currentCalMonth, setCurrentCalMonth] = useState(todayDate.getMonth());
  const [currentCalYear, setCurrentCalYear] = useState(todayDate.getFullYear());

  const parseDate = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      const parts = dateVal.split(/[\/\-T ]/);
      if (parts.length >= 3) {
        if (parts[0].length === 4) {
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
      return null;
    }
    return d;
  };

  const prevCalendarMonth = () => {
    if (currentCalMonth === 0) {
      setCurrentCalMonth(11);
      setCurrentCalYear(currentCalYear - 1);
    } else {
      setCurrentCalMonth(currentCalMonth - 1);
    }
  };

  const nextCalendarMonth = () => {
    if (currentCalMonth === 11) {
      setCurrentCalMonth(0);
      setCurrentCalYear(currentCalYear + 1);
    } else {
      setCurrentCalMonth(currentCalMonth + 1);
    }
  };

  const selectPresetRange = (preset) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (preset === '7days') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      setTempStartDate(start);
      setTempEndDate(new Date(today));
    } else if (preset === '30days') {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      setTempStartDate(start);
      setTempEndDate(new Date(today));
    } else if (preset === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setTempStartDate(start);
      setTempEndDate(new Date(today));
    } else if (preset === 'lastMonth') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setTempStartDate(start);
      setTempEndDate(end);
    }
  };

  const handleSelectDay = (day) => {
    const selected = new Date(currentCalYear, currentCalMonth, day);
    selected.setHours(0, 0, 0, 0);

    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      setTempStartDate(selected);
      setTempEndDate(null);
    } else {
      if (selected < tempStartDate) {
        setTempStartDate(selected);
        setTempEndDate(null);
      } else {
        setTempEndDate(selected);
      }
    }
  };

  const handleConfirmDateFilter = () => {
    if (tempStartDate && tempEndDate) {
      setCustomStartDate(tempStartDate);
      setCustomEndDate(tempEndDate);
      setIsDatePickerVisible(false);
      showToast('Đã áp dụng bộ lọc khoảng ngày!', 'success');
    }
  };

  const handleClearDatePicker = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    setCustomStartDate(null);
    setCustomEndDate(null);
    setIsDatePickerVisible(false);
    showToast('Đã xóa bộ lọc khoảng ngày!', 'info');
  };

  const handleClearDateFilter = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    setCustomStartDate(null);
    setCustomEndDate(null);
    showToast('Đã quay lại hiển thị mặc định!', 'info');
  };

  const renderCalendarDays = () => {
    const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
    let firstDayIndex = new Date(currentCalYear, currentCalMonth, 1).getDay();
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const cells = [];

    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calendarDayCellEmpty} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentCellDate = new Date(currentCalYear, currentCalMonth, day);
      currentCellDate.setHours(0, 0, 0, 0);

      const isSelectedStart = tempStartDate && currentCellDate.getTime() === tempStartDate.getTime();
      const isSelectedEnd = tempEndDate && currentCellDate.getTime() === tempEndDate.getTime();
      const isSelected = isSelectedStart || isSelectedEnd;

      const isInRange = tempStartDate && tempEndDate && currentCellDate > tempStartDate && currentCellDate < tempEndDate;

      const today = new Date();
      const isToday = currentCellDate.getDate() === today.getDate() &&
        currentCellDate.getMonth() === today.getMonth() &&
        currentCellDate.getFullYear() === today.getFullYear();

      cells.push(
        <TouchableOpacity
          key={`day-${day}`}
          style={[
            styles.calendarDayCell,
            isSelected && styles.calendarDayCellSelected,
            isInRange && styles.calendarDayCellInRange,
            (isToday && !isSelected) && styles.calendarDayCellToday
          ]}
          onPress={() => handleSelectDay(day)}
        >
          <Text style={[
            styles.calendarDayText,
            isSelected && styles.calendarDayTextSelected,
            isInRange && styles.calendarDayTextInRange,
            isToday && { fontWeight: '900' }
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return cells;
  };

  const toggleCardDetails = (id) => {
    setExpandedCardIds((prev) =>
      prev.includes(id) ? prev.filter(cardId => cardId !== id) : [...prev, id]
    );
  };

  const handleOpenApproveModal = (payroll) => {
    setSelectedPayroll(payroll);
    setOfflineConfirmed(false);
    setRating(5);
    setComments('');

    // Default to actual hours worked or 4 hours
    const defaultHrs = payroll.actualHours || 4;
    setCustomHours(defaultHrs.toString());
    setCustomAmount(Math.round(defaultHrs * (payroll.hourlyRate || 35000)));

    setIsModalVisible(true);
  };

  const handleHoursChange = (text) => {
    setCustomHours(text);
    const hrs = parseFloat(text);
    if (!isNaN(hrs) && hrs > 0) {
      setCustomAmount(Math.round(hrs * (selectedPayroll?.hourlyRate || 35000)));
    } else {
      setCustomAmount(0);
    }
  };

  const setPresetHours = (hrs) => {
    setCustomHours(hrs.toString());
    setCustomAmount(Math.round(hrs * (selectedPayroll?.hourlyRate || 35000)));
  };

  const handleSubmitApprove = () => {
    if (!offlineConfirmed || !selectedPayroll) return;

    approveInterimMutation.mutateAsync({
      payrollId: selectedPayroll.id || selectedPayroll.Id,
      rating,
      comments,
      totalHours: parseFloat(customHours) || selectedPayroll.actualHours || 4,
      finalAmount: customAmount
    }).then(() => {
      setIsModalVisible(false);
      setSelectedPayroll(null);
    }).catch(() => {
      setIsModalVisible(false);
      setSelectedPayroll(null);
    });
  };

  const handleExportExcel = async () => {
    try {
      const csvHeader = "ID,Nhan vien,So gio,Thanh tien,Ngay thanh toan,Trang thai\n";
      const csvRows = payrolls.map(p =>
        `#${p.id || p.Id},"${p.employeeName || p.EmployeeName || 'Sinh vien'}",${p.totalHours || p.TotalHours},${p.finalAmount || p.FinalAmount},"${p.payDate || p.PayDate || ''}",${p.status || p.Status}`
      ).join("\n");
      const csvContent = csvHeader + csvRows;

      await Share.share({
        message: csvContent,
        title: 'Bảng đối soát lương ProxiJob',
      });
      showToast('Xuất file đối soát thành công!', 'success');
    } catch (error) {
      console.log('Error sharing CSV:', error);
      showToast('Không thể xuất file đối soát!', 'error');
    }
  };

  // Group and filter payroll lists by shift filter
  const allSettled = payrolls.filter(p => p.status === 'Paid' || p.Status === 'Paid' || p.status === 'PendingStudentConfirmation' || p.Status === 'PendingStudentConfirmation');

  // Filter completed logs that have checked-out
  const completedLogs = (attendanceLogs || []).filter(log => log.status === 'completed');

  // Map completed logs to pending payrolls, filtering out those that are already in allSettled
  const pendingPayrolls = completedLogs
    .filter(log => {
      // Check if employee has a settled payroll in the database
      const isAlreadySettled = allSettled.some(p => (p.employeeId === log.employeeId || p.EmployeeId === log.employeeId));
      return !isAlreadySettled;
    })
    .map(log => {
      // Find the hourly rate from the shift
      const shift = (shifts || []).find(s => s.id === log.shiftId);
      const rate = shift ? shift.hourlyRate : 35000;
      const hours = 4; // default hours
      const wages = rate * hours;
      return {
        id: log.id,
        Id: log.id,
        employeeName: log.studentName,
        EmployeeName: log.studentName,
        totalHours: hours,
        TotalHours: hours,
        finalAmount: wages,
        FinalAmount: wages,
        status: 'Pending',
        Status: 'Pending',
        employeeId: log.employeeId,
        EmployeeId: log.employeeId
      };
    })
    .filter(p => {
      const hrs = p.totalHours;
      if (shiftFilter === 'morning') return hrs <= 4;
      if (shiftFilter === 'afternoon') return hrs > 4;
      return true;
    });

  const getCustomRangeData = () => {
    if (!customStartDate || !customEndDate) return null;

    const start = new Date(customStartDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEndDate);
    end.setHours(23, 59, 59, 999);

    const filtered = allSettled.filter(p => {
      const pDate = parseDate(p.payDate || p.PayDate);
      return pDate && pDate >= start && pDate <= end;
    });

    const totalDisbursed = filtered.reduce((sum, p) => sum + (p.finalAmount || p.FinalAmount || 0), 0);

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let labels = [];
    let dataset = [];

    if (diffDays <= 7) {
      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        labels.push(`${d.getDate()}/${d.getMonth() + 1}`);

        const sum = filtered.reduce((acc, p) => {
          const pDate = parseDate(p.payDate || p.PayDate);
          if (pDate && pDate.getDate() === d.getDate() && pDate.getMonth() === d.getMonth() && pDate.getFullYear() === d.getFullYear()) {
            return acc + (p.finalAmount || p.FinalAmount || 0);
          }
          return acc;
        }, 0);
        dataset.push(sum);
      }
    } else if (diffDays <= 30) {
      const interval = Math.ceil(diffDays / 5);
      for (let i = 0; i < 5; i++) {
        const iStart = new Date(start);
        iStart.setDate(start.getDate() + i * interval);
        const iEnd = new Date(start);
        iEnd.setDate(start.getDate() + (i + 1) * interval - 1);
        if (iEnd > end) iEnd.setTime(end.getTime());

        labels.push(`${iStart.getDate()}/${iStart.getMonth() + 1}-${iEnd.getDate()}/${iEnd.getMonth() + 1}`);

        const sum = filtered.reduce((acc, p) => {
          const pDate = parseDate(p.payDate || p.PayDate);
          if (pDate && pDate >= iStart && pDate <= iEnd) {
            return acc + (p.finalAmount || p.FinalAmount || 0);
          }
          return acc;
        }, 0);
        dataset.push(sum);
      }
    } else {
      let cur = new Date(start);
      let months = [];
      while (cur <= end) {
        months.push({ month: cur.getMonth(), year: cur.getFullYear() });
        cur.setMonth(cur.getMonth() + 1);
      }

      const uniqueMonths = months.filter((v, idx, self) =>
        self.findIndex(t => t.month === v.month && t.year === v.year) === idx
      );

      uniqueMonths.forEach(m => {
        labels.push(`T${m.month + 1}/${m.year.toString().slice(-2)}`);

        const sum = filtered.reduce((acc, p) => {
          const pDate = parseDate(p.payDate || p.PayDate);
          if (pDate && pDate.getMonth() === m.month && pDate.getFullYear() === m.year) {
            return acc + (p.finalAmount || p.FinalAmount || 0);
          }
          return acc;
        }, 0);
        dataset.push(sum);
      });
    }

    return {
      totalDisbursed,
      chartData: {
        labels: labels.length > 0 ? labels : ["N/A"],
        datasets: [{ data: dataset.length > 0 ? dataset : [0] }]
      }
    };
  };

  const customRangeData = getCustomRangeData();

  const settledPayrolls = allSettled.filter(p => {
    if (customStartDate && customEndDate) {
      const pDate = parseDate(p.payDate || p.PayDate);
      if (!pDate || pDate < customStartDate || pDate > customEndDate) {
        return false;
      }
    }
    const hrs = p.totalHours || p.TotalHours || 0;
    if (shiftFilter === 'morning') return hrs <= 4;
    if (shiftFilter === 'afternoon') return hrs > 4;
    return true;
  });

  const chartLabels = customRangeData 
    ? customRangeData.chartData.labels 
    : (analyticsData?.chartData?.labels?.length > 0
        ? analyticsData.chartData.labels
        : ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]);

  const chartValues = customRangeData
    ? customRangeData.chartData.datasets[0].data
    : (analyticsData?.chartData?.datasets?.[0]?.data?.length > 0
        ? analyticsData.chartData.datasets[0].data
        : [0, 0, 0, 0, 0, 0, 0]);

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '0 đ';
    const num = Math.round(Number(val));
    if (isNaN(num)) return '0 đ';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " đ";
  };

  const formatYLabel = (val) => {
    const num = Math.round(Number(val));
    if (isNaN(num)) return val;
    if (num >= 1000000) {
      const m = num / 1000000;
      return (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + 'Tr';
    }
    if (num >= 1000) {
      const k = num / 1000;
      return (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + 'k';
    }
    return num.toString();
  };

  const localPendingAmount = (pendingPayrolls || []).reduce((sum, p) => sum + (p.finalAmount || p.FinalAmount || 0), 0) +
    (analyticsData?.pendingApprovalAmount || 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Bento Cards Section */}
        <View style={styles.bentoContainer}>
          {/* Card 1: Monthly Total Disbursed */}
          <View style={styles.bentoTilePrimary}>
            {/* Top row: Title and Trend */}
            <View style={styles.cardHeaderRow}>
              <Text style={styles.bentoLabelPrimary}>
                {customRangeData ? 'TỔNG CHI TRONG KHOẢNG NÀY' : 'TỔNG CHI THÁNG NÀY'}
              </Text>
              <View style={styles.cardTrendContainer}>
                <Text style={styles.cardTrendText}>↑ 12%</Text>
                <Svg width="40" height="20" viewBox="0 0 40 20">
                  <Path
                    d="M2 15 Q 10 5, 20 12 T 38 4"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2"
                  />
                </Svg>
              </View>
            </View>

            {/* Middle row: Large Amount */}
            <Text style={styles.bentoValuePrimary}>
              {formatCurrency(customRangeData ? customRangeData.totalDisbursed : analyticsData?.totalDisbursedThisMonth)}
            </Text>

            {/* Bottom row: Subtext only */}
            <Text style={styles.bentoSubtextPrimary}>
              {customStartDate && customEndDate
                ? `Từ ${customStartDate.getDate()}/${customStartDate.getMonth() + 1} - ${customEndDate.getDate()}/${customEndDate.getMonth() + 1}`
                : '✓ Đối soát tài chính thực tế'}
            </Text>
          </View>

          {/* Row of Card 2 & Card 3 */}
          <View style={styles.bentoRow}>
            {/* Card 2: Pending Approval Amount */}
            <View style={[styles.bentoTileSecondary, { backgroundColor: '#FCE6A9', borderColor: '#F6D07A' }]}>
              <View style={styles.secondaryCardHeader}>
                <Text style={[styles.bentoLabelSecondary, { color: '#5C3E00' }]}>Quỹ lương chờ chốt</Text>
                <Ionicons name="ellipsis-vertical" size={14} color="#7C5700" />
              </View>
              <View style={styles.secondaryCardContent}>
                <Text style={[styles.bentoValueSecondary, { color: '#201500' }]}>
                  {formatCurrency(localPendingAmount)}
                </Text>
                <Svg width="35" height="18" viewBox="0 0 35 18">
                  <Path
                    d="M2 10 Q 10 16, 18 6 T 33 8"
                    fill="none"
                    stroke="#C69324"
                    strokeWidth="1.5"
                  />
                </Svg>
              </View>
            </View>

            {/* Card 3: Active Employees */}
            <View style={[styles.bentoTileSecondary, { backgroundColor: '#CBD6C8', borderColor: '#AABCA6' }]}>
              <View style={styles.secondaryCardHeader}>
                <Text style={[styles.bentoLabelSecondary, { color: '#223320' }]}>Đang làm việc</Text>
                <Ionicons name="ellipsis-vertical" size={14} color="#364C33" />
              </View>
              <View style={styles.secondaryCardContent}>
                <Text style={[styles.bentoValueSecondary, { color: '#142213' }]}>
                  {analyticsData?.activeEmployees || 0} nhân sự
                </Text>
                <Svg width="35" height="18" viewBox="0 0 35 18">
                  <Path
                    d="M2 12 Q 10 4, 18 8 T 33 2"
                    fill="none"
                    stroke="#668060"
                    strokeWidth="1.5"
                  />
                </Svg>
              </View>
            </View>
          </View>
        </View>

        {/* Middle Section: Chart & Advanced Filter with paywall */}
        <View style={[styles.sectionBentoCard, { marginTop: 24 }]}>
          <View style={styles.chartHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.sectionTitle}>BIỂU ĐỒ BIẾN ĐỘNG CHI PHÍ</Text>
              {customStartDate && customEndDate ? (
                <Text style={styles.selectedDateRangeSub}>
                  {`${customStartDate.getDate()}/${customStartDate.getMonth() + 1}/${customStartDate.getFullYear()} - ${customEndDate.getDate()}/${customEndDate.getMonth() + 1}/${customEndDate.getFullYear()}`}
                </Text>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <TouchableOpacity
                style={[styles.dateFilterBtn, (customStartDate && customEndDate) && styles.dateFilterBtnActive]}
                onPress={() => {
                  setTempStartDate(customStartDate);
                  setTempEndDate(customEndDate);
                  setIsDatePickerVisible(true);
                }}
              >
                <Text style={[styles.dateFilterBtnText, (customStartDate && customEndDate) && styles.dateFilterBtnTextActive]}>
                  {customStartDate && customEndDate ? '📅 Đã lọc' : '📅 Lọc ngày'}
                </Text>
              </TouchableOpacity>

              {customStartDate && customEndDate && (
                <TouchableOpacity onPress={handleClearDateFilter} style={styles.clearFilterLink}>
                  <Text style={styles.clearFilterLinkText}>Xóa x</Text>
                </TouchableOpacity>
              )}

              {!customStartDate && (
                <View style={styles.periodSelector}>
                  {['day', 'week', 'month'].map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.periodBtn, selectedPeriod === p && styles.periodBtnActive]}
                      onPress={() => setSelectedPeriod(p)}
                    >
                      <Text style={[styles.periodBtnText, selectedPeriod === p && styles.periodBtnTextActive]}>
                        {p === 'day' ? 'Ngày' : p === 'week' ? 'Tuần' : 'Tháng'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Line Chart */}
          <View style={styles.chartWrapper}>
            <LineChart
              data={{
                labels: chartLabels,
                datasets: [{ data: chartValues }]
              }}
              width={Dimensions.get('window').width - 80}
              height={180}
              yAxisLabel=""
              yAxisSuffix=""
              formatYLabel={formatYLabel}
              chartConfig={{
                backgroundColor: '#FFFFFF',
                backgroundGradientFrom: '#FFFFFF',
                backgroundGradientTo: '#FFFFFF',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 107, 0, ${opacity})`, // Primary Orange line with gradient fill
                labelColor: (opacity = 1) => `#475569`,
                style: {
                  borderRadius: 16
                },
                propsForBackgroundLines: {
                  strokeWidth: 1,
                  stroke: '#F1F5F9',
                  strokeDasharray: '0'
                },
                propsForDots: {
                  r: '3.5',
                  strokeWidth: '1.5',
                  stroke: '#FF6B00'
                },
                propsForLabels: {
                  fontSize: 10,
                  fontWeight: '700',
                  fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif'
                }
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
                paddingRight: 40,
                paddingLeft: 0
              }}
            />
          </View>

          {/* Advanced Filter - Fully interactive and free */}
          <View style={styles.filtersBlock}>
            <Text style={styles.filterHeader}>Bộ lọc ca trực công nhật:</Text>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterChip, shiftFilter === 'all' && styles.filterChipActive]}
                onPress={() => setShiftFilter('all')}
              >
                <Text style={[styles.filterChipText, shiftFilter === 'all' && styles.filterChipTextActive]}>Tất cả ca trực</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, shiftFilter === 'morning' && styles.filterChipActive]}
                onPress={() => setShiftFilter('morning')}
              >
                <Text style={[styles.filterChipText, shiftFilter === 'morning' && styles.filterChipTextActive]}>{"Ca ngắn (≤ 4h)"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, shiftFilter === 'afternoon' && styles.filterChipActive]}
                onPress={() => setShiftFilter('afternoon')}
              >
                <Text style={[styles.filterChipText, shiftFilter === 'afternoon' && styles.filterChipTextActive]}>{"Ca dài (> 4h)"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bottom Section: Grouped Lists */}
        {/* Group 1: Chờ chốt */}
        <View style={styles.listContainer}>
          <Text style={styles.groupHeading}>DANH SÁCH CHỜ CHỐT BẢNG LƯƠNG</Text>
          {pendingPayrolls.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>✨ Không có bảng lương nào đang chờ chốt</Text>
            </View>
          ) : (
            pendingPayrolls.map((payroll) => (
              <View key={payroll.id || payroll.Id} style={[styles.payrollCard, styles.pendingCard]}>
                <View style={styles.cardHeader}>
                  <Image source={getAvatarSource(null, null, payroll.employeeName || payroll.EmployeeName)} style={styles.staffAvatar} />
                  <View style={styles.staffMeta}>
                    <Text style={styles.studentName}>{payroll.employeeName || payroll.EmployeeName}</Text>
                    <Text style={styles.jobShiftMeta}>Mã bảng lương: #{payroll.id || payroll.Id}</Text>
                    <Text style={styles.jobHours}>{payroll.totalHours || payroll.TotalHours} giờ công tích lũy</Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.amountLabel}>THÀNH TIỀN</Text>
                    <Text style={styles.amountValue}>{formatCurrency(payroll.finalAmount || payroll.FinalAmount)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleOpenApproveModal(payroll)}
                  >
                    <Text style={styles.actionBtnText}>Chốt bảng lương</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Group 2: Đã chốt chi phí */}
        <View style={[styles.listContainer, { marginTop: 24 }]}>
          <Text style={styles.groupHeading}>✓ ĐÃ CHỐT CHI PHÍ</Text>
          {settledPayrolls.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>Chưa ghi nhận chi phí nào được chốt</Text>
            </View>
          ) : (
            settledPayrolls.map((payroll) => {
              const isPendingConfirm = payroll.status === 'PendingStudentConfirmation' || payroll.Status === 'PendingStudentConfirmation';
              const isExpanded = expandedCardIds.includes(payroll.id || payroll.Id);

              return (
                <View key={payroll.id || payroll.Id} style={[styles.payrollCard, styles.settledCard]}>
                  <View style={styles.cardHeader}>
                    <Image source={getAvatarSource(null, null, payroll.employeeName || payroll.EmployeeName)} style={styles.staffAvatar} />
                    <View style={styles.staffMeta}>
                      <Text style={styles.studentName}>{payroll.employeeName || payroll.EmployeeName}</Text>
                      <Text style={styles.jobShiftMeta}>Mã bảng lương: #{payroll.id || payroll.Id}</Text>
                    </View>
                    <View style={[styles.badge, isPendingConfirm ? styles.badgePending : styles.badgePaid]}>
                      <Text style={[styles.badgeText, isPendingConfirm ? styles.badgeTextPending : styles.badgeTextPaid]}>
                        {isPendingConfirm ? 'Chờ SV xác nhận' : 'ĐÃ CHỐT'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.expandTriggerChip}
                    onPress={() => toggleCardDetails(payroll.id || payroll.Id)}
                  >
                    <Text style={styles.expandTriggerChipText}>
                      {isExpanded ? 'Thu gọn chi tiết' : 'Xem chi tiết ca làm'}
                    </Text>
                    <Ionicons 
                      name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                      size={13} 
                      color="#64748B" 
                      style={{ marginLeft: 4 }} 
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.detailsBox}>
                      <View style={styles.detailItem}>
                        <View style={styles.detailItemLeft}>
                          <Ionicons name="time-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
                          <Text style={styles.detailLabel}>Tổng giờ làm:</Text>
                        </View>
                        <Text style={styles.detailValue}>
                          {Number(payroll.totalHours || payroll.TotalHours || 0).toFixed(1)} giờ công
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <View style={styles.detailItemLeft}>
                          <Ionicons name="shield-checkmark-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
                          <Text style={styles.detailLabel}>Trạng thái hệ thống:</Text>
                        </View>
                        <Text style={styles.detailValue}>
                          {isPendingConfirm ? 'Chờ sinh viên đối soát ngân hàng' : 'Đã quyết toán hoàn tất'}
                        </Text>
                      </View>
                      {(payroll.payDate || payroll.PayDate) && (
                        <View style={styles.detailItem}>
                          <View style={styles.detailItemLeft}>
                            <Ionicons name="calendar-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
                            <Text style={styles.detailLabel}>Ngày chốt thực tế:</Text>
                          </View>
                          <Text style={styles.detailValue}>{payroll.payDate || payroll.PayDate}</Text>
                        </View>
                      )}

                      {/* Show rating comments block */}
                      {payroll.rating && (
                        <View style={styles.ratingDetailBox}>
                          <Text style={styles.ratingDetailTitle}>ĐÁNH GIÁ CỦA CHỦ QUÁN:</Text>
                          <Text style={[styles.ratingStars, { color: '#F59E0B' }]}>
                            {'★'.repeat(payroll.rating)}{'☆'.repeat(5 - payroll.rating)}
                          </Text>
                          {payroll.comments && (
                            <View style={styles.feedbackBubble}>
                              <Ionicons name="chatbubble-outline" size={12} color="#64748B" style={{ marginRight: 6, marginTop: 1 }} />
                              <Text style={styles.feedbackBubbleText}>{payroll.comments}</Text>
                            </View>
                          )}
                        </View>
                      )}

                      {payroll.employerRating && (
                        <View style={[styles.ratingDetailBox, { borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 8, paddingTop: 8 }]}>
                          <Text style={styles.ratingDetailTitle}>ĐÁNH GIÁ CỦA SINH VIÊN:</Text>
                          <Text style={[styles.ratingStars, { color: '#F59E0B' }]}>
                            {'★'.repeat(payroll.employerRating)}{'☆'.repeat(5 - payroll.employerRating)}
                          </Text>
                          {payroll.employerComments && (
                            <View style={styles.feedbackBubble}>
                              <Ionicons name="chatbubble-outline" size={12} color="#64748B" style={{ marginRight: 6, marginTop: 1 }} />
                              <Text style={styles.feedbackBubbleText}>{payroll.employerComments}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.cardDivider} />

                  <View style={styles.cardFooter}>
                    <View>
                      <Text style={styles.amountLabel}>SỐ TIỀN CHI TRẢ</Text>
                      <Text style={[styles.amountValue, { color: '#0F172A' }]}>
                        {formatCurrency(payroll.finalAmount || payroll.FinalAmount)}
                      </Text>
                    </View>

                    {isPendingConfirm ? (
                      <View style={styles.statusConfirmTag}>
                        <Text style={styles.statusConfirmTagText}>Chờ SV xác nhận nhận tiền</Text>
                      </View>
                    ) : (
                      <View style={styles.statusConfirmTagSuccess}>
                        <Text style={styles.statusConfirmTagSuccessText}>✓ Đã chốt chi phí</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>


      {/* Rating & Offline Payment Form Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>Chốt bảng lương</Text>
            <Text style={styles.modalSubheading}>
              Đang chốt bảng lương cho nhân viên: <Text style={{ fontWeight: '800', color: '#181c1e' }}>{selectedPayroll?.employeeName || selectedPayroll?.EmployeeName}</Text>
            </Text>

            {/* Hour calculation and adjustment section */}
            <View style={styles.calculationBox}>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Đơn giá lương đề xuất:</Text>
                <Text style={styles.calculationValue}>{(selectedPayroll?.hourlyRate || 35000).toLocaleString('vi-VN')} đ/h</Text>
              </View>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Giờ làm thực tế (check-in/out):</Text>
                <Text style={styles.calculationValue}>{selectedPayroll?.actualHours || 0} giờ</Text>
              </View>

              <Text style={styles.modalLabelSmall}>ĐIỀU CHỈNH SỐ GIỜ CÔNG THANH TOÁN (GIỜ):</Text>
              <View style={styles.hoursInputRow}>
                <TextInput
                  style={styles.hoursInput}
                  value={customHours}
                  onChangeText={handleHoursChange}
                  keyboardType="numeric"
                  placeholder="Nhập số giờ"
                  placeholderTextColor="#94A3B8"
                />
                <View style={styles.presetsRow}>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => setPresetHours(4)}>
                    <Text style={styles.presetBtnText}>Chuẩn 4h</Text>
                  </TouchableOpacity>
                  {selectedPayroll?.actualHours !== 4 && (
                    <TouchableOpacity style={styles.presetBtn} onPress={() => setPresetHours(selectedPayroll?.actualHours || 0)}>
                      <Text style={styles.presetBtnText}>Thực tế ({selectedPayroll?.actualHours || 0}h)</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={[styles.calculationRow, { marginTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 10 }]}>
                <Text style={[styles.calculationLabel, { fontWeight: '800', color: '#0F172A' }]}>TỔNG TIỀN THANH TOÁN:</Text>
                <Text style={styles.finalCalculationValue}>{(customAmount).toLocaleString('vi-VN')} đ</Text>
              </View>
            </View>

            <View style={styles.modalDivider} />

            {/* Checkbox (Mandatory) */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setOfflineConfirmed(!offlineConfirmed)}
            >
              <View style={[styles.checkboxBox, offlineConfirmed && styles.checkboxBoxChecked]}>
                {offlineConfirmed && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>
                Tôi xác nhận đã chuyển khoản ngân hàng hoặc trả tiền mặt trực tiếp cho sinh viên này ở ngoài đời thực.
              </Text>
            </TouchableOpacity>

            {/* Star Rating Section */}
            <Text style={styles.modalLabel}>ĐÁNH GIÁ THÁI ĐỘ LÀM VIỆC CỦA SINH VIÊN (BẮT BUỘC)</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                >
                  <Text style={[styles.starIcon, star <= rating && styles.starIconActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Feedback Comments Text Input */}
            <Text style={styles.modalLabel}>Ý KIẾN ĐÓNG GÓP, NHẬN XÉT THÊM (TÙY CHỌN)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.feedbackInput}
                value={comments}
                onChangeText={(text) => setComments(text)}
                placeholder="Ví dụ: Làm việc rất nhiệt tình, đúng giờ, thái độ phục vụ khách hàng tốt..."
                multiline={true}
                numberOfLines={3}
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, !offlineConfirmed && styles.modalSubmitBtnDisabled]}
                disabled={!offlineConfirmed || approveInterimMutation.isPending}
                onPress={handleSubmitApprove}
              >
                {approveInterimMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>{"Xác nhận chốt & Gửi đánh giá ⚡"}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Date Picker Modal */}
      <Modal
        visible={isDatePickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDatePickerVisible(false)}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <Text style={styles.calendarHeading}>Chọn khoảng ngày đối soát</Text>

            {/* Selected Range Display */}
            <View style={styles.calendarRangeDisplay}>
              <Text style={styles.calendarRangeDisplayText}>
                {tempStartDate && tempEndDate
                  ? `${tempStartDate.getDate()}/${tempStartDate.getMonth() + 1}/${tempStartDate.getFullYear()} - ${tempEndDate.getDate()}/${tempEndDate.getMonth() + 1}/${tempEndDate.getFullYear()}`
                  : tempStartDate
                    ? `${tempStartDate.getDate()}/${tempStartDate.getMonth() + 1}/${tempStartDate.getFullYear()} - Chọn ngày kết thúc`
                    : 'Chọn khoảng ngày đối soát tài chính'}
              </Text>
            </View>

            {/* Quick Selection Presets */}
            <View style={styles.calendarPresetsContainer}>
              <TouchableOpacity style={styles.calendarPresetChip} onPress={() => selectPresetRange('7days')}>
                <Text style={styles.calendarPresetChipText}>7 ngày qua</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.calendarPresetChip} onPress={() => selectPresetRange('30days')}>
                <Text style={styles.calendarPresetChipText}>30 ngày qua</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.calendarPresetChip} onPress={() => selectPresetRange('thisMonth')}>
                <Text style={styles.calendarPresetChipText}>Tháng này</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.calendarPresetChip} onPress={() => selectPresetRange('lastMonth')}>
                <Text style={styles.calendarPresetChipText}>Tháng trước</Text>
              </TouchableOpacity>
            </View>

            {/* Month Navigation */}
            <View style={styles.calendarMonthNav}>
              <TouchableOpacity style={styles.calendarNavBtn} onPress={prevCalendarMonth}>
                <Text style={styles.calendarNavBtnText}>◀</Text>
              </TouchableOpacity>
              <Text style={styles.calendarMonthNavText}>
                {`Tháng ${currentCalMonth + 1} / ${currentCalYear}`}
              </Text>
              <TouchableOpacity style={styles.calendarNavBtn} onPress={nextCalendarMonth}>
                <Text style={styles.calendarNavBtnText}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Week Days Headers */}
            <View style={styles.calendarWeekDays}>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                <Text key={d} style={styles.calendarWeekDayText}>{d}</Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calendarDaysGrid}>
              {renderCalendarDays()}
            </View>

            {/* Footer actions */}
            <View style={styles.calendarFooter}>
              <TouchableOpacity
                style={styles.calendarFooterBtnCancel}
                onPress={() => {
                  setTempStartDate(customStartDate);
                  setTempEndDate(customEndDate);
                  setIsDatePickerVisible(false);
                }}
              >
                <Text style={styles.calendarFooterBtnCancelText}>Hủy</Text>
              </TouchableOpacity>

              {(customStartDate || tempStartDate) && (
                <TouchableOpacity
                  style={[styles.calendarFooterBtnCancel, { backgroundColor: '#FEE2E2', borderWidth: 0 }]}
                  onPress={handleClearDatePicker}
                >
                  <Text style={[styles.calendarFooterBtnCancelText, { color: '#EF4444' }]}>Xóa lọc</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.calendarFooterBtnConfirm, (!tempStartDate || !tempEndDate) && { backgroundColor: '#CBD5E1' }]}
                disabled={!tempStartDate || !tempEndDate}
                onPress={handleConfirmDateFilter}
              >
                <Text style={styles.calendarFooterBtnConfirmText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 110,
    marginTop: 10
  },
  topExportContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
  },
  wideExportBtn: {
    backgroundColor: '#FFEFEB',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFDBCC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  wideExportBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B00',
  },
  bentoContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  bentoTilePrimary: {
    position: 'relative',
    backgroundColor: '#0A58CA', // Deep Employer Blue for premium contrast
    padding: 24,
    borderRadius: 24,
    shadowColor: '#0A58CA',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
    overflow: 'hidden',
  },
  viewfinderBracket: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: '#FFFFFF', // Crisp white brackets on blue card
  },
  bracketTL: { top: 12, left: 12, borderTopWidth: 2, borderLeftWidth: 2 },
  bracketTR: { top: 12, right: 12, borderTopWidth: 2, borderRightWidth: 2 },
  bracketBL: { bottom: 12, left: 12, borderBottomWidth: 2, borderLeftWidth: 2 },
  bracketBR: { bottom: 12, right: 12, borderBottomWidth: 2, borderRightWidth: 2 },
  bentoLabelPrimary: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    color: '#E0F2FE',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  bentoValuePrimary: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 12,
    marginBottom: 16,
  },
  bentoSubtextPrimary: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 11,
    color: '#93C5FD',
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  cardTrendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.2)', // light green translucent
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  cardTrendText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399', // bright light green
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  cardButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cardBtnPrimary: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardBtnPrimaryText: {
    color: '#0A58CA',
    fontSize: 11,
    fontWeight: '800',
  },
  cardBtnSecondary: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cardBtnSecondaryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  bentoTileSecondary: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    justifyContent: 'space-between',
  },
  bentoLabelSecondary: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  bentoValueSecondary: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
    marginRight: 6,
  },
  secondaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  secondaryCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  sectionBentoCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
  },
  periodBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  periodBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  periodBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  periodBtnTextActive: {
    color: '#FF6B00',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  filterHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#FFEFEB',
    borderColor: '#FFD3C0',
  },
  filterChipText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FF6B00',
    fontWeight: '800',
  },
  listContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  groupHeading: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1,
    marginBottom: 12,
    paddingLeft: 4,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyCardText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  payrollCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  pendingCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#F59E0B', // gold indicator
  },
  settledCard: {
    backgroundColor: '#ffffff',
    borderColor: '#F1F5F9',
    borderLeftWidth: 5,
    borderLeftColor: '#10B981', // green indicator
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  staffMeta: {
    flex: 1,
    marginLeft: 12,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  jobShiftMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  jobHours: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B00',
    marginTop: 2,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
  },
  badgePending: {
    backgroundColor: '#FFFBEB',
  },
  badgePaid: {
    backgroundColor: '#ECFDF5',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  badgeTextPending: {
    color: '#D97706',
  },
  badgeTextPaid: {
    color: '#059669',
  },
  expandTriggerChip: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  expandTriggerChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  detailItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackBubble: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 10,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  feedbackBubbleText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  detailsBox: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  ratingDetailBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  ratingDetailTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ratingStars: {
    fontSize: 14,
    color: '#F59E0B',
    letterSpacing: 2,
  },
  ratingComments: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#475569',
    marginTop: 4,
    lineHeight: 16,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 18,
    fontWeight: '900',
    color: '#FF6B00',
    marginTop: 2,
  },
  actionBtn: {
    backgroundColor: '#FF6B00',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  statusConfirmTag: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  statusConfirmTagText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '800',
  },
  statusConfirmTagSuccess: {
    backgroundColor: '#D1FAE5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  statusConfirmTagSuccessText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  floatingShareBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 99,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  floatingShareBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  modalHeading: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalSubheading: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 18,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 10,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxBoxChecked: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  checkboxTick: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
    lineHeight: 18,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  starRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 6,
  },
  starIcon: {
    fontSize: 32,
    color: '#E2E8F0',
  },
  starIconActive: {
    color: '#F59E0B',
  },
  inputContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  feedbackInput: {
    width: '100%',
    fontSize: 12,
    color: '#0F172A',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalActionRow: {
    marginTop: 24,
    gap: 10,
  },
  modalSubmitBtn: {
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  modalCloseBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  calculationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginVertical: 14,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  calculationLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  calculationValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  modalLabelSmall: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
  },
  hoursInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  hoursInput: {
    width: 70,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  presetBtn: {
    backgroundColor: '#FFEFEB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFDBCC',
    flex: 1,
    alignItems: 'center',
  },
  presetBtnText: {
    color: '#FF6B00',
    fontSize: 11,
    fontWeight: '700',
  },
  finalCalculationValue: {
    fontSize: 16,
    color: '#FF6B00',
    fontWeight: '900',
  },
  // Calendar Modal Styles
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  calendarModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  calendarHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 12,
  },
  calendarRangeDisplay: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  calendarRangeDisplayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  calendarPresetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
    justifyContent: 'center',
  },
  calendarPresetChip: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  calendarPresetChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  calendarMonthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  calendarMonthNavText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  calendarNavBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  calendarNavBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekDayText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: `${100 / 7}%`,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 1,
    borderRadius: 8,
  },
  calendarDayCellEmpty: {
    width: `${100 / 7}%`,
    height: 38,
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  calendarDayCellSelected: {
    backgroundColor: '#FF6B00',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
  },
  calendarDayCellInRange: {
    backgroundColor: '#FFEFEB',
    borderRadius: 0,
  },
  calendarDayTextInRange: {
    color: '#FF6B00',
  },
  calendarDayCellToday: {
    borderWidth: 1.5,
    borderColor: '#FF6B00',
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  calendarFooterBtnCancel: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  calendarFooterBtnCancelText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarFooterBtnConfirm: {
    flex: 1.5,
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarFooterBtnConfirmText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  selectedDateRangeSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B00',
    marginTop: 2,
  },
  dateFilterBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateFilterBtnActive: {
    backgroundColor: '#FFEFEB',
    borderColor: '#FFD3C0',
  },
  dateFilterBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  dateFilterBtnTextActive: {
    color: '#FF6B00',
  },
  clearFilterLink: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  clearFilterLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  }
});
