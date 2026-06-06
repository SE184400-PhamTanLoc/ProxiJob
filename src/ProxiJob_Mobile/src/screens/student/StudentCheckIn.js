import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform
} from 'react-native';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';

export default function StudentCheckIn() {
  const { 
    shifts, 
    checkInShift, 
    checkOutShift, 
    simulatedDistanceToActive, 
    setSimulatedDistanceToActive 
  } = useContext(AppContext);

  const [selectedShiftForCheckIn, setSelectedShiftForCheckIn] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Find if there is any active shift right now
  const activeShift = shifts.find(s => s.status === 'checkin_active');

  // Find all approved shifts available to check-in
  const approvedShifts = shifts.filter(s => s.status === 'approved');

  // Keep selected shift in sync
  useEffect(() => {
    if (activeShift) {
      setSelectedShiftForCheckIn(activeShift);
      setIsTimerRunning(true);
    } else if (approvedShifts.length > 0 && !selectedShiftForCheckIn) {
      setSelectedShiftForCheckIn(approvedShifts[0]);
      setIsTimerRunning(false);
      setTimerSeconds(0);
    } else if (approvedShifts.length === 0 && !activeShift) {
      setSelectedShiftForCheckIn(null);
      setIsTimerRunning(false);
      setTimerSeconds(0);
    }
  }, [shifts, activeShift]);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const handleSimulateTravel = () => {
    if (simulatedDistanceToActive > 100) {
      setSimulatedDistanceToActive(45); // Move inside 100m radius
    } else {
      setSimulatedDistanceToActive(3200); // Move away
    }
  };

  const handleCheckIn = () => {
    if (selectedShiftForCheckIn) {
      checkInShift(selectedShiftForCheckIn.id);
      setIsTimerRunning(true);
    }
  };

  const handleCheckOut = () => {
    if (selectedShiftForCheckIn) {
      checkOutShift(selectedShiftForCheckIn.id);
      setIsTimerRunning(false);
      setTimerSeconds(0);
      setSimulatedDistanceToActive(3200); // Reset distance
    }
  };

  const isWithinRadius = simulatedDistanceToActive <= 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Xác thực hiện diện GPS</Text>
        
        {/* GPS Radius Simulator widget */}
        <View style={[styles.simulatorCard, theme.shadows.light]}>
          <Text style={styles.simulatorTitle}>🛠️ Công cụ Giả lập GPS (Thử nghiệm)</Text>
          <Text style={styles.simulatorText}>
            Hệ thống yêu cầu sinh viên ở trong bán kính <Text style={{fontWeight: 'bold'}}>100m</Text> của cửa hàng để bắt đầu/kết thúc ca. Nhấn nút dưới đây để giả lập di chuyển:
          </Text>
          
          <TouchableOpacity 
            style={[
              styles.simulateBtn, 
              isWithinRadius ? styles.simulateBtnActive : styles.simulateBtnInactive
            ]}
            onPress={handleSimulateTravel}
            disabled={activeShift !== undefined && activeShift !== null && activeShift.status === 'completed'}
          >
            <Text style={styles.simulateBtnText}>
              {isWithinRadius 
                ? '📍 Đã đến quán (Khoảng cách: 45m)' 
                : '🚗 Di chuyển đến quán (Khoảng cách: 3.2km)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* If no approved/active shifts, show empty check-in screen */}
        {!selectedShiftForCheckIn ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>⏱️</Text>
            <Text style={styles.emptyText}>Hôm nay bạn chưa có ca làm nào được duyệt.</Text>
            <Text style={styles.emptySub}>Hãy ứng tuyển các ca làm việc gần bạn trên trang chủ và chờ chủ quán phê duyệt nhé!</Text>
          </View>
        ) : (
          <View style={styles.checkInConsole}>
            {/* Shift Brief Card */}
            <View style={[styles.briefCard, theme.shadows.light]}>
              <Text style={styles.briefShop}>{selectedShiftForCheckIn.shopName}</Text>
              <Text style={styles.briefTitle}>{selectedShiftForCheckIn.title}</Text>
              <Text style={styles.briefTime}>⏰ Hôm nay: {selectedShiftForCheckIn.time}</Text>
              <Text style={styles.briefRate}>💰 Lương: {(selectedShiftForCheckIn.hourlyRate).toLocaleString('vi-VN')} đ/h</Text>
            </View>

            {/* GPS Radius Status Ring */}
            <View style={styles.statusSection}>
              <View style={[
                styles.radiusRing,
                isWithinRadius ? styles.ringGreen : styles.ringRed,
                activeShift && styles.ringActiveWorking
              ]}>
                {activeShift ? (
                  <View style={styles.timerCircleContent}>
                    <Text style={styles.timerLabel}>THỜI GIAN LÀM VIỆC</Text>
                    <Text style={styles.timerValue}>{formatTimer(timerSeconds)}</Text>
                    <Text style={styles.checkInTimeText}>Bắt đầu lúc: {selectedShiftForCheckIn.checkInTime}</Text>
                  </View>
                ) : (
                  <View style={styles.statusCircleContent}>
                    <Text style={styles.statusLabel}>BÁN KÍNH GPS</Text>
                    <Text style={[styles.statusValue, isWithinRadius ? styles.textGreen : styles.textRed]}>
                      {simulatedDistanceToActive >= 1000 
                        ? `${(simulatedDistanceToActive / 1000).toFixed(1)} km` 
                        : `${simulatedDistanceToActive} m`}
                    </Text>
                    <Text style={styles.statusSubLabel}>
                      {isWithinRadius ? 'HỢP LỆ (<100m)' : 'NGOÀI PHẠM VI (>100m)'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Actions Grid */}
            <View style={styles.actionsContainer}>
              {!activeShift ? (
                /* Check-In Flow */
                <View style={{width: '100%'}}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn, 
                      styles.checkInBtn,
                      !isWithinRadius && styles.disabledBtn
                    ]}
                    disabled={!isWithinRadius}
                    onPress={handleCheckIn}
                  >
                    <Text style={styles.actionBtnText}>⚡ BẮT ĐẦU CA LÀM (CHECK-IN)</Text>
                  </TouchableOpacity>
                  {!isWithinRadius && (
                    <Text style={styles.warningText}>
                      ⚠️ Hãy sử dụng "Giả lập GPS" để di chuyển đến cửa hàng trước khi bấm điểm danh vào ca.
                    </Text>
                  )}
                </View>
              ) : (
                /* Check-Out Flow */
                <View style={{width: '100%'}}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn, 
                      styles.checkOutBtn,
                      !isWithinRadius && styles.disabledBtn
                    ]}
                    disabled={!isWithinRadius}
                    onPress={handleCheckOut}
                  >
                    <Text style={styles.actionBtnText}>🏁 KẾT THÚC CA LÀM (CHECK-OUT)</Text>
                  </TouchableOpacity>
                  {!isWithinRadius && (
                    <Text style={styles.warningText}>
                      ⚠️ Bạn không thể check-out nếu đi ra ngoài bán kính 100m của quán trong giờ làm.
                    </Text>
                  )}
                </View>
              )}
            </View>

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  simulatorCard: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  simulatorTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.warning,
    marginBottom: 6,
  },
  simulatorText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
    marginBottom: theme.spacing.md,
  },
  simulateBtn: {
    height: 44,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simulateBtnActive: {
    backgroundColor: theme.colors.success,
  },
  simulateBtnInactive: {
    backgroundColor: theme.colors.student,
  },
  simulateBtnText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyContainer: {
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
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: theme.spacing.lg,
    lineHeight: 18,
  },
  checkInConsole: {
    width: '100%',
  },
  briefCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  briefShop: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  briefTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 2,
    marginBottom: 8,
  },
  briefTime: {
    fontSize: 13,
    color: theme.colors.text,
    marginVertical: 1,
  },
  briefRate: {
    fontSize: 13,
    color: theme.colors.success,
    fontWeight: 'bold',
    marginVertical: 1,
  },
  statusSection: {
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  radiusRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
  ringRed: {
    borderColor: theme.colors.danger + '22',
  },
  ringGreen: {
    borderColor: theme.colors.success + '22',
  },
  ringActiveWorking: {
    borderColor: theme.colors.success,
    borderWidth: 6,
  },
  statusCircleContent: {
    alignItems: 'center',
  },
  timerCircleContent: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.textLight,
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  statusValue: {
    fontSize: 32,
    fontWeight: 'black',
    marginVertical: 4,
  },
  timerValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginVertical: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  checkInTimeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  statusSubLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  textRed: {
    color: theme.colors.danger,
  },
  textGreen: {
    color: theme.colors.success,
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  actionBtn: {
    height: 52,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  checkInBtn: {
    backgroundColor: theme.colors.student,
  },
  checkOutBtn: {
    backgroundColor: theme.colors.danger,
  },
  disabledBtn: {
    backgroundColor: theme.colors.textLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  actionBtnText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  warningText: {
    fontSize: 11,
    color: theme.colors.danger,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
    paddingHorizontal: theme.spacing.sm,
  }
});
