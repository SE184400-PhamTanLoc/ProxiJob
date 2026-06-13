import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';

// Pure JS Haversine formula
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c); // returns distance in meters
};

export default function StudentCheckIn() {
  const { 
    shifts, 
    checkInShift, 
    checkOutShift, 
    simulatedDistanceToActive, 
    setSimulatedDistanceToActive,
    studentCoords,
    setStudentCoords,
    navigationParams,
    showToast,
    STUDENT_MOCK_GPS,
    user
  } = useContext(AppContext);

  const [selectedShiftForCheckIn, setSelectedShiftForCheckIn] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [cameraScanned, setCameraScanned] = useState(false);
  const [scanningCamera, setScanningCamera] = useState(false);

  // Shop coordinates (Default to FPT Polytechnic HCM for the thesis defense presentation)
  const shopLat = selectedShiftForCheckIn?.latitude || 10.8261;
  const shopLng = selectedShiftForCheckIn?.longitude || 106.6297;

  // Active shift
  const activeShift = shifts.find(s => s.status === 'checkin_active');
  const approvedShifts = shifts.filter(s => s.status === 'approved');

  // Keep selected shift in sync
  useEffect(() => {
    if (activeShift) {
      setSelectedShiftForCheckIn(activeShift);
      setIsTimerRunning(true);
      setCameraScanned(true); 
    } else if (navigationParams?.shiftId) {
      const targetShift = shifts.find(s => s.id === navigationParams.shiftId);
      if (targetShift) {
        setSelectedShiftForCheckIn(targetShift);
        setIsTimerRunning(false);
        setTimerSeconds(0);
        setCameraScanned(false);
      }
    } else if (approvedShifts.length > 0 && !selectedShiftForCheckIn) {
      setSelectedShiftForCheckIn(approvedShifts[0]);
      setIsTimerRunning(false);
      setTimerSeconds(0);
      setCameraScanned(false);
    } else if (approvedShifts.length === 0 && !activeShift) {
      setSelectedShiftForCheckIn(null);
      setIsTimerRunning(false);
      setTimerSeconds(0);
      setCameraScanned(false);
    }
  }, [shifts, activeShift, navigationParams]);

  // Sync initial student coordinates based on simulatedDistanceToActive
  useEffect(() => {
    if (simulatedDistanceToActive > 100) {
      setStudentCoords({ latitude: 10.8550, longitude: 106.6300 }); // Far coords (~3.2km)
    } else {
      setStudentCoords({ latitude: 10.8265, longitude: 106.6302 }); // Near coords (~45m)
    }
  }, []);

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
    const isCurrentlyFar = simulatedDistanceToActive > 100;
    if (isCurrentlyFar) {
      const nearCoords = { latitude: 10.8265, longitude: 106.6302 }; // Near FPT Polytechnic
      setStudentCoords(nearCoords);
      const dist = calculateHaversineDistance(nearCoords.latitude, nearCoords.longitude, shopLat, shopLng);
      setSimulatedDistanceToActive(dist);
      showToast('Đã di chuyển vào vùng an toàn của quán!', 'success');
    } else {
      const farCoords = { latitude: 10.8550, longitude: 106.6300 }; // Far away
      setStudentCoords(farCoords);
      const dist = calculateHaversineDistance(farCoords.latitude, farCoords.longitude, shopLat, shopLng);
      setSimulatedDistanceToActive(dist);
      showToast('Đã di chuyển ra xa cửa hàng!', 'info');
    }
  };

  const handleScanCamera = () => {
    setScanningCamera(true);
    setTimeout(() => {
      setScanningCamera(false);
      setCameraScanned(true);
      showToast('Xác thực khuôn mặt thành công!', 'success');
    }, 1200);
  };

  const handleCheckIn = () => {
    if (selectedShiftForCheckIn) {
      const lat = studentCoords?.latitude || 10.8265;
      const lng = studentCoords?.longitude || 106.6302;
      checkInShift(
        selectedShiftForCheckIn.id,
        'default-qr-token',
        lat,
        lng,
        user?.avatarUrl || ''
      );
      setIsTimerRunning(true);
    }
  };

  const handleCheckOut = () => {
    if (selectedShiftForCheckIn) {
      const lat = studentCoords?.latitude || 10.8265;
      const lng = studentCoords?.longitude || 106.6302;
      checkOutShift(
        selectedShiftForCheckIn.id,
        lat,
        lng,
        user?.avatarUrl || ''
      );
      setIsTimerRunning(false);
      setTimerSeconds(0);
      setCameraScanned(false);
      
      // Reset coordinates to far away
      const farCoords = { latitude: 10.8550, longitude: 106.6300 };
      setStudentCoords(farCoords);
      const dist = calculateHaversineDistance(farCoords.latitude, farCoords.longitude, shopLat, shopLng);
      setSimulatedDistanceToActive(dist);
    }
  };

  const isWithinRadius = simulatedDistanceToActive <= 100;
  const studentLat = studentCoords?.latitude || 10.8550;
  const studentLng = studentCoords?.longitude || 106.6300;

  // Leaflet HTML String for single student check-in
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; }
        .leaflet-control-attribution { display: none !important; }
        
        @keyframes pulse-shop {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .shop-pulse-icon {
          animation: pulse-shop 2s infinite;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { 
          zoomControl: true,
          dragging: true,
          touchZoom: true,
          scrollWheelZoom: true
        }).setView([${shopLat}, ${shopLng}], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        // 100m Geofence Circle
        L.circle([${shopLat}, ${shopLng}], {
          color: '#FF6B00',
          fillColor: '#FF6B00',
          fillOpacity: 0.15,
          radius: 100
        }).addTo(map);

        // Shop Marker (Custom Animated Store Icon)
        L.marker([${shopLat}, ${shopLng}], {
          icon: L.divIcon({
            html: '<div class="shop-pulse-icon" style="background: #EF4444; width: 44px; height: 44px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 22px;">🏪</div>',
            className: 'custom-shop-icon',
            iconSize: [44, 44],
            iconAnchor: [22, 22],
            popupAnchor: [0, -22]
          })
        }).addTo(map)
          .bindPopup('<b>${selectedShiftForCheckIn?.shopName || 'Cửa hàng'}</b><br>Địa điểm làm việc')
          .openPopup();

        // Student Marker (Custom Student Badge Icon)
        var studentMarker = L.marker([${studentLat}, ${studentLng}], {
          icon: L.divIcon({
            html: '<div style="background: #10B981; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; font-size: 18px;">🙋‍♂️</div>',
            className: 'custom-student-icon',
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            popupAnchor: [0, -18]
          })
        }).addTo(map)
          .bindPopup('Vị trí hiện tại của bạn');

        // Auto zoom and pan to fit both points
        var bounds = L.latLngBounds([[${shopLat}, ${shopLng}], [${studentLat}, ${studentLng}]]);
        map.fitBounds(bounds, { padding: [50, 50] });
      </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Xác thực hiện diện GPS & Camera</Text>
        
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
                ? `📍 Đã đến quán (Khoảng cách: ${simulatedDistanceToActive}m)` 
                : '🚗 Di chuyển đến quán (Khoảng cách: ~3.2km)'}
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

            {/* Interactive Leaflet Map Card */}
            <View style={styles.mapCard}>
              <Text style={styles.mapCardTitle}>🗺️ Định vị thực tế (Leaflet Map API)</Text>
              {Platform.OS === 'web' ? (
                <iframe
                  srcDoc={mapHtml}
                  style={styles.webMap}
                  title="Bản đồ định vị GPS"
                />
              ) : (
                <WebView
                  originWhitelist={['*']}
                  source={{ html: mapHtml }}
                  style={styles.mobileMap}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                />
              )}
              <View style={styles.mapLegends}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.legendText}>Cửa hàng</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.legendText}>Bạn</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF6B00', borderRadius: 0, width: 14, height: 2, top: 4 }]} />
                  <Text style={styles.legendText}>Ranh giới 100m</Text>
                </View>
              </View>
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
                  {!cameraScanned ? (
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        { backgroundColor: theme.colors.student },
                        scanningCamera && { opacity: 0.6 }
                      ]}
                      disabled={scanningCamera}
                      onPress={handleScanCamera}
                    >
                      {scanningCamera ? (
                        <ActivityIndicator color={theme.colors.white} />
                      ) : (
                        <Text style={styles.actionBtnText}>📸 QUÉT KHUÔN MẶT (CAMERA VERIFICATION)</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.actionBtn, 
                        styles.checkInBtn,
                        (!isWithinRadius) && styles.disabledBtn
                      ]}
                      disabled={!isWithinRadius}
                      onPress={handleCheckIn}
                    >
                      <Text style={styles.actionBtnText}>⚡ BẮT ĐẦU CA LÀM (CHECK-IN)</Text>
                    </TouchableOpacity>
                  )}

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
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    lineHeight: 34,
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
    marginBottom: theme.spacing.md,
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
  mapCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  mapCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  webMap: {
    width: '100%',
    height: 220,
    borderWidth: 0,
    borderRadius: theme.borderRadius.sm,
  },
  mobileMap: {
    height: 220,
    width: '100%',
    borderRadius: theme.borderRadius.sm,
  },
  mapLegends: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  statusSection: {
    alignItems: 'center',
    marginVertical: theme.spacing.md,
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
