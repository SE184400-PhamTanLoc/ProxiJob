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
import { BarChart } from 'react-native-chart-kit';
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

  const settledPayrolls = allSettled.filter(p => {
    const hrs = p.totalHours || p.TotalHours || 0;
    if (shiftFilter === 'morning') return hrs <= 4;
    if (shiftFilter === 'afternoon') return hrs > 4;
    return true;
  });

  const chartLabels = analyticsData?.chartData?.labels?.length > 0
    ? analyticsData.chartData.labels
    : ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const chartValues = analyticsData?.chartData?.datasets?.[0]?.data?.length > 0
    ? analyticsData.chartData.datasets[0].data
    : [0, 0, 0, 0, 0, 0, 0];

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

        {/* Header section */}
        <View style={styles.topHeader}>
          <Text style={styles.headerTitle}>Phân tích Chi phí</Text>
          <Text style={styles.headerSubtitle}>Quản lý chi lương, phân tích ngân sách và đánh giá nhân sự</Text>
        </View>

        {/* Top Bento Cards Section */}
        <View style={styles.bentoContainer}>
          {/* Card 1: Monthly Total Disbursed */}
          <View style={styles.bentoTilePrimary}>
            {/* Viewfinder Brackets */}
            <View style={[styles.viewfinderBracket, styles.bracketTL]} />
            <View style={[styles.viewfinderBracket, styles.bracketTR]} />
            <View style={[styles.viewfinderBracket, styles.bracketBL]} />
            <View style={[styles.viewfinderBracket, styles.bracketBR]} />

            <Text style={styles.bentoLabelPrimary}>TỔNG CHI THÁNG NÀY</Text>
            <Text style={styles.bentoValuePrimary}>
              {formatCurrency(analyticsData?.totalDisbursedThisMonth)}
            </Text>
            <Text style={styles.bentoSubtextPrimary}>✓ Đã hoàn tất đối soát thực</Text>
          </View>

          {/* Row of Card 2 & Card 3 */}
          <View style={styles.bentoRow}>
            {/* Card 2: Pending Approval Amount */}
            <View style={styles.bentoTileSecondary}>
              <Text style={styles.bentoLabelSecondary}>Quỹ lương chờ chốt</Text>
              <Text style={styles.bentoValueSecondary}>
                {formatCurrency(localPendingAmount)}
              </Text>
            </View>

            {/* Card 3: Active Employees */}
            <View style={styles.bentoTileSecondary}>
              <Text style={styles.bentoLabelSecondary}>Đang làm việc</Text>
              <Text style={styles.bentoValueSecondary}>
                {analyticsData?.activeEmployees || 0} nhân sự
              </Text>
            </View>
          </View>
        </View>

        {/* Middle Section: Chart & Advanced Filter with paywall */}
        <View style={[styles.sectionBentoCard, { marginTop: 24 }]}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>BIỂU ĐỒ BIẾN ĐỘNG CHI PHÍ</Text>
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
          </View>

          {/* Bar Chart */}
          <View style={styles.chartWrapper}>
            <BarChart
              data={{
                labels: chartLabels,
                datasets: [{ data: chartValues }]
              }}
              width={Dimensions.get('window').width - 72}
              height={180}
              yAxisLabel=""
              yAxisSuffix=""
              formatYLabel={formatYLabel}
              chartConfig={{
                backgroundColor: '#FFFFFF',
                backgroundGradientFrom: '#FFFFFF',
                backgroundGradientTo: '#FFFFFF',
                decimalPlaces: 0,
                color: (opacity = 1) => `#FF6B00`, // Primary Orange
                labelColor: (opacity = 1) => `#181c1e`,
                style: {
                  borderRadius: 16
                },
                propsForBackgroundLines: {
                  strokeWidth: 1,
                  stroke: '#f1f4f6',
                  strokeDasharray: '0'
                }
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
                paddingRight: 10
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
              <View key={payroll.id || payroll.Id} style={styles.payrollCard}>
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
                    style={styles.expandTrigger}
                    onPress={() => toggleCardDetails(payroll.id || payroll.Id)}
                  >
                    <Text style={styles.expandTriggerText}>
                      {isExpanded ? 'Thu gọn chi tiết ▲' : 'Xem chi tiết ca làm ▼'}
                    </Text>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.detailsBox}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Tổng giờ làm:</Text>
                        <Text style={styles.detailValue}>{payroll.totalHours || payroll.TotalHours} giờ công</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Trạng thái hệ thống:</Text>
                        <Text style={styles.detailValue}>
                          {isPendingConfirm ? 'Chờ sinh viên đối soát ngân hàng' : 'Đã quyết toán hoàn tất'}
                        </Text>
                      </View>
                      {payroll.payDate && (
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Ngày chốt thực tế:</Text>
                          <Text style={styles.detailValue}>{payroll.payDate || payroll.PayDate}</Text>
                        </View>
                      )}

                      {/* Show rating comments block */}
                      {payroll.rating && (
                        <View style={styles.ratingDetailBox}>
                          <Text style={styles.ratingDetailTitle}>ĐÁNH GIÁ CỦA CHỦ QUÁN:</Text>
                          <Text style={styles.ratingStars}>{'★'.repeat(payroll.rating)}{'☆'.repeat(5 - payroll.rating)}</Text>
                          {payroll.comments && <Text style={styles.ratingComments}>"{payroll.comments}"</Text>}
                        </View>
                      )}

                      {payroll.employerRating && (
                        <View style={[styles.ratingDetailBox, { borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 8, paddingTop: 8 }]}>
                          <Text style={styles.ratingDetailTitle}>ĐÁNH GIÁ CỦA SINH VIÊN:</Text>
                          <Text style={[styles.ratingStars, { color: '#5b00df' }]}>{'★'.repeat(payroll.employerRating)}{'☆'.repeat(5 - payroll.employerRating)}</Text>
                          {payroll.employerComments && <Text style={styles.ratingComments}>"{payroll.employerComments}"</Text>}
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

      {/* Floating Action Button for Excel Export */}
      <TouchableOpacity
        style={styles.floatingShareBtn}
        onPress={handleExportExcel}
      >
        <Text style={styles.floatingShareBtnText}>📊 Xuất file Excel đối soát</Text>
      </TouchableOpacity>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  topHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 28,
    fontWeight: '800',
    color: '#181c1e',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 13,
    color: '#5a4136',
    marginTop: 6,
    lineHeight: 18,
  },
  bentoContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  bentoTilePrimary: {
    position: 'relative',
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#e5e9eb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 30,
    elevation: 3,
    overflow: 'hidden',
  },
  viewfinderBracket: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: '#ff6b00', // Neon Orange primary accent
  },
  bracketTL: { top: 12, left: 12, borderTopWidth: 2, borderLeftWidth: 2 },
  bracketTR: { top: 12, right: 12, borderTopWidth: 2, borderRightWidth: 2 },
  bracketBL: { bottom: 12, left: 12, borderBottomWidth: 2, borderLeftWidth: 2 },
  bracketBR: { bottom: 12, right: 12, borderBottomWidth: 2, borderRightWidth: 2 },
  bentoLabelPrimary: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    color: '#5a4136',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  bentoValuePrimary: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    color: '#181c1e',
    fontSize: 26,
    fontWeight: '800',
    marginVertical: 8,
  },
  bentoSubtextPrimary: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 11,
    color: '#ff6b00',
    fontWeight: '700',
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  bentoTileSecondary: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e5e9eb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 2,
  },
  bentoLabelSecondary: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    color: '#5a4136',
    fontSize: 11,
    fontWeight: '600',
  },
  bentoValueSecondary: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    color: '#181c1e',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  sectionBentoCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#e5e9eb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 30,
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
    color: '#5a4136',
    letterSpacing: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f1f4f6',
    borderRadius: 99,
    padding: 2,
  },
  periodBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 99,
  },
  periodBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  periodBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5a4136',
  },
  periodBtnTextActive: {
    color: '#ff6b00',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersBlock: {
    position: 'relative',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e9eb',
    overflow: 'hidden',
    borderRadius: 16,
  },
  filterHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5a4136',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#f1f4f6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#e5e9eb',
  },
  filterChipActive: {
    backgroundColor: '#ffdbcc',
    borderColor: '#ff6b00',
  },
  filterChipText: {
    fontSize: 11,
    color: '#5a4136',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#ff6b00',
    fontWeight: '800',
  },
  listContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  groupHeading: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 11,
    fontWeight: '800',
    color: '#5a4136',
    letterSpacing: 1,
    marginBottom: 12,
    paddingLeft: 4,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e9eb',
  },
  emptyCardText: {
    fontSize: 13,
    color: '#5a4136',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  payrollCard: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e9eb',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  settledCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e9eb',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e9eb',
  },
  staffMeta: {
    flex: 1,
    marginLeft: 12,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#181c1e',
  },
  jobShiftMeta: {
    fontSize: 11,
    color: '#5a4136',
    marginTop: 2,
  },
  jobHours: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ff6b00',
    marginTop: 2,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
  },
  badgePending: {
    backgroundColor: '#ffdbcc', // light orange container
  },
  badgePaid: {
    backgroundColor: '#eef1f3',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  badgeTextPending: {
    color: '#a04100',
  },
  badgeTextPaid: {
    color: '#5a4136',
  },
  expandTrigger: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f4f6',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
    marginTop: 10,
  },
  expandTriggerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5a4136',
  },
  detailsBox: {
    marginTop: 12,
    backgroundColor: '#f1f4f6',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e9eb',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: '#5a4136',
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#181c1e',
  },
  ratingDetailBox: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e5e9eb',
  },
  ratingDetailTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#5a4136',
    letterSpacing: 0.5,
  },
  ratingStars: {
    fontSize: 14,
    color: '#ff6b00',
    marginTop: 2,
  },
  ratingComments: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#181c1e',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#e5e9eb',
    marginVertical: 14,
    borderStyle: 'dashed',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#5a4136',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 17,
    fontWeight: '800',
    color: '#ff6b00',
    marginTop: 2,
  },
  actionBtn: {
    backgroundColor: '#ff6b00', // Neon orange
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 99,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  statusConfirmTag: {
    backgroundColor: '#ffdbcc',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
  },
  statusConfirmTagText: {
    color: '#a04100',
    fontSize: 10,
    fontWeight: '800',
  },
  statusConfirmTagSuccess: {
    backgroundColor: '#eef1f3',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
  },
  statusConfirmTagSuccessText: {
    color: '#5a4136',
    fontSize: 10,
    fontWeight: '800',
  },
  floatingShareBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#ff6b00',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 99,
    shadowColor: '#ff6b00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
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
    backgroundColor: 'rgba(24, 28, 30, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#e5e9eb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 5,
  },
  modalHeading: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 20,
    fontWeight: '800',
    color: '#181c1e',
  },
  modalSubheading: {
    fontSize: 12,
    color: '#5a4136',
    marginTop: 6,
    lineHeight: 16,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#e5e9eb',
    marginVertical: 14,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 8,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e5e9eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: '#ff6b00',
    borderColor: '#ff6b00',
  },
  checkboxTick: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    color: '#181c1e',
    fontWeight: '600',
    lineHeight: 16,
  },
  modalLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#5a4136',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 6,
  },
  starRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  starIcon: {
    fontSize: 28,
    color: '#e5e9eb',
  },
  starIconActive: {
    color: '#ff6b00',
  },
  inputContainer: {
    backgroundColor: '#f1f4f6',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e5e9eb',
    marginTop: 4,
  },
  feedbackInput: {
    width: '100%',
    borderWidth: 0,
    backgroundColor: 'transparent',
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 12,
    color: '#181c1e',
  },
  modalActionRow: {
    marginTop: 20,
    gap: 10,
  },
  modalSubmitBtn: {
    backgroundColor: '#ff6b00',
    paddingVertical: 14,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#e5e9eb',
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  modalCloseBtn: {
    backgroundColor: '#f1f4f6',
    paddingVertical: 12,
    borderRadius: 99,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#5a4136',
    fontSize: 12,
    fontWeight: '700',
  },
  calculationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginVertical: 10,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 3,
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
    gap: 10,
    marginTop: 2,
  },
  hoursInput: {
    width: 80,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    padding: 0,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetBtn: {
    backgroundColor: '#FFEFEB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFDBCC',
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
  }
});
