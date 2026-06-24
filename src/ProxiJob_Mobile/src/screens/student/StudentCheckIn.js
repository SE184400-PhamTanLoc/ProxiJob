import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Animated,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';
import { useShiftsQuery, useCheckInMutation, useCheckOutMutation } from '../../hooks/queries';
import { getQrCode } from '../../api/management';
import { CameraView, useCameraPermissions } from 'expo-camera';

const EMPTY_ARRAY = [];

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
    simulatedDistanceToActive, 
    setSimulatedDistanceToActive,
    studentCoords,
    setStudentCoords,
    navigationParams,
    showToast,
    STUDENT_MOCK_GPS,
    user,
    addNotification,
    activeShift: contextActiveShift,
    setActiveShift
  } = useContext(AppContext);

  const { data: shiftsData } = useShiftsQuery(user, studentCoords);
  const shifts = shiftsData || EMPTY_ARRAY;
  const checkInMutation = useCheckInMutation(user, showToast, addNotification);
  const checkOutMutation = useCheckOutMutation(user, showToast, addNotification);
  const [permission, requestPermission] = useCameraPermissions();

  const checkInShift = async (shiftId, qrToken, latitude, longitude, photoUrl) => {
    try {
      const res = await checkInMutation.mutateAsync({ shiftId, qrToken, latitude, longitude, photoUrl });
      const timekeepingId = res?.data?.timekeepingId || res?.data?.TimekeepingId || res?.timekeepingId || res?.TimekeepingId;
      const targetShift = shifts.find(s => s.id === shiftId);
      if (targetShift) {
        const now = new Date();
        const checkInTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const updatedShift = {
          ...targetShift,
          status: 'checkin_active',
          checkInTime,
          timekeepingId
        };
        setActiveShift(updatedShift);
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  const checkOutShift = async (shiftId, latitude, longitude, photoUrl) => {
    try {
      const targetShift = shifts.find(s => s.id === shiftId);
      const timekeepingId = targetShift?.timekeepingId || contextActiveShift?.timekeepingId;
      await checkOutMutation.mutateAsync({ timekeepingId, latitude, longitude, photoUrl });
      setActiveShift(null);
      return true;
    } catch (e) {
      return false;
    }
  };

  const [selectedShiftForCheckIn, setSelectedShiftForCheckIn] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // New 2FA QR Flow States
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  // Animated values
  const laserAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Shop coordinates (Default to FPT Polytechnic HCM for the thesis defense presentation)
  const shopLat = selectedShiftForCheckIn?.latitude || 10.8261;
  const shopLng = selectedShiftForCheckIn?.longitude || 106.6297;

  // Active shift
  const activeShift = contextActiveShift || shifts.find(s => s.status === 'checkin_active');
  const approvedShifts = shifts.filter(s => s.status === 'approved');

  // Keep selected shift in sync
  useEffect(() => {
    if (activeShift) {
      setSelectedShiftForCheckIn(activeShift);
      setIsTimerRunning(true);
    } else if (navigationParams?.shiftId) {
      const targetShift = shifts.find(s => s.id === navigationParams.shiftId);
      if (targetShift) {
        setSelectedShiftForCheckIn(targetShift);
        setIsTimerRunning(false);
        setTimerSeconds(0);
      }
    } else if (approvedShifts.length > 0 && !selectedShiftForCheckIn) {
      setSelectedShiftForCheckIn(approvedShifts[0]);
      setIsTimerRunning(false);
      setTimerSeconds(0);
    } else if (approvedShifts.length === 0 && !activeShift) {
      setSelectedShiftForCheckIn(null);
      setIsTimerRunning(false);
      setTimerSeconds(0);
    }
  }, [shifts, activeShift, navigationParams]);

  // Sync simulated distance dynamically when studentCoords or selectedShift changes
  useEffect(() => {
    if (studentCoords && selectedShiftForCheckIn) {
      const dist = calculateHaversineDistance(
        studentCoords.latitude,
        studentCoords.longitude,
        shopLat,
        shopLng
      );
      setSimulatedDistanceToActive(dist);
    }
  }, [studentCoords, selectedShiftForCheckIn]);

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

  // Laser line animation loop
  useEffect(() => {
    if (showQRScanner) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      laserAnim.setValue(0);
    }
  }, [showQRScanner]);

  // Success Pop-up animation trigger
  useEffect(() => {
    if (showSuccessCard) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true
        })
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [showSuccessCard]);

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
      showToast('Đã di chuyển vào vùng an toàn của quán!', 'success');
    } else {
      const farCoords = { latitude: 10.8550, longitude: 106.6300 }; // Far away
      setStudentCoords(farCoords);
      showToast('Đã di chuyển ra xa cửa hàng!', 'info');
    }
  };

  const handleTriggerQRScan = async () => {
    setShowQRScanner(true);
    
    // Try to auto-request permission
    if (!permission || !permission.granted) {
      try {
        await requestPermission();
      } catch (err) {
        console.log('Error requesting camera permissions:', err);
      }
    }
  };

  const handleQRScanSuccess = async (scannedToken) => {
    setShowQRScanner(false);
    
    const lat = studentCoords?.latitude || 10.8265;
    const lng = studentCoords?.longitude || 106.6302;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (!activeShift) {
      // Check-In
      const success = await checkInShift(
        selectedShiftForCheckIn.id,
        scannedToken || 'shop-qr-code-token',
        lat,
        lng,
        ''
      );
      if (success) {
        let isLate = false;
        if (selectedShiftForCheckIn.startTime) {
          const schedStart = new Date(selectedShiftForCheckIn.startTime);
          const limitTime = new Date(schedStart.getTime() + 15 * 60 * 1000);
          if (now > limitTime) {
            isLate = true;
          }
        }
        
        setSuccessInfo({
          type: 'CHECK-IN',
          title: 'CHECK-IN THÀNH CÔNG 🎉',
          timestamp: timeStr,
          status: isLate ? 'Vào Muộn' : 'Đúng Giờ',
          statusColor: isLate ? '#EF4444' : '#10B981',
          shopName: selectedShiftForCheckIn.shopName,
          shiftTitle: selectedShiftForCheckIn.title
        });
        setShowSuccessCard(true);
      }
    } else {
      // Check-Out
      const success = await checkOutShift(
        selectedShiftForCheckIn.id,
        lat,
        lng,
        ''
      );
      if (success) {
        setSuccessInfo({
          type: 'CHECK-OUT',
          title: 'CHECK-OUT THÀNH CÔNG 🎉',
          timestamp: timeStr,
          status: 'Hoàn Thành',
          statusColor: '#0052CC',
          shopName: selectedShiftForCheckIn.shopName,
          shiftTitle: selectedShiftForCheckIn.title
        });
        
        // Reset coordinates to far away after a small delay
        setTimeout(() => {
          const farCoords = { latitude: 10.8550, longitude: 106.6300 };
          setStudentCoords(farCoords);
        }, 800);

        setShowSuccessCard(true);
      }
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
              <View style={{width: '100%'}}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    isWithinRadius ? styles.checkInBtn : styles.disabledBtn
                  ]}
                  disabled={!isWithinRadius}
                  onPress={handleTriggerQRScan}
                >
                  <Text style={styles.actionBtnText}>
                    {isWithinRadius ? '📸 QUÉT MÃ QR TẠI QUẦY' : 'Bạn đang ở quá xa quán để điểm danh'}
                  </Text>
                </TouchableOpacity>

                {!isWithinRadius && (
                  <Text style={styles.warningText}>
                    ⚠️ Hãy sử dụng "Giả lập GPS" để di chuyển vào bán kính 100m của quán để thực hiện điểm danh.
                  </Text>
                )}
              </View>
            </View>

          </View>
        )}
      </ScrollView>

      {/* QR Code Scanner Overlay Simulator */}
      <Modal
        visible={showQRScanner}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowQRScanner(false)}
      >
        <View style={styles.scannerOverlay}>
          {permission && permission.granted && (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={async (event) => {
                if (event.data) {
                  handleQRScanSuccess(event.data);
                }
              }}
            />
          )}

          <SafeAreaView style={styles.scannerSafe}>
            {/* Header */}
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerTitle}>QUÉT MÃ QR TẠI QUẦY</Text>
              <TouchableOpacity 
                style={styles.scannerCloseBtn}
                onPress={() => setShowQRScanner(false)}
              >
                <Text style={styles.scannerCloseBtnText}>✕ Đóng</Text>
              </TouchableOpacity>
            </View>

            {/* Viewfinder Area */}
            <View style={styles.viewfinderContainer}>
              {(!permission || !permission.granted) ? (
                <View style={styles.permissionPromptBox}>
                  <Text style={styles.permissionPromptTitle}>Yêu cầu Camera 📸</Text>
                  <Text style={styles.permissionPromptText}>
                    Chúng tôi cần bạn cấp quyền truy cập camera để quét mã QR điểm danh trực tiếp tại quầy của cửa hàng.
                  </Text>
                  <TouchableOpacity 
                    style={styles.requestPermissionBtn} 
                    onPress={requestPermission}
                  >
                    <Text style={styles.requestPermissionBtnText}>Cho phép truy cập Camera</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.viewfinder}>
                  {/* Viewfinder Corners */}
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                  
                  {/* Animated Laser Line */}
                  <Animated.View style={[
                    styles.laserLine,
                    {
                      transform: [{
                        translateY: laserAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 200]
                        })
                      }]
                    }
                  ]} />
                </View>
              )}
            </View>

            {/* Bottom Actions */}
            <View style={styles.scannerBottom}>
              <Text style={styles.scannerInstructions}>
                {(!permission || !permission.granted) 
                  ? 'Vui lòng cho phép quyền truy cập camera để bắt đầu quét mã.' 
                  : 'Di chuyển camera đến mã QR của cửa hàng để tiến hành điểm danh.'}
              </Text>
              {permission && permission.granted && (
                <>
                  <ActivityIndicator color={theme.colors.student} style={{ marginVertical: 12 }} />
                  <Text style={styles.scannerSubtext}>Đang tự động nhận diện mã...</Text>
                </>
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Success Confirmation Card Modal */}
      <Modal
        visible={showSuccessCard}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowSuccessCard(false)}
      >
        <View style={styles.successOverlay}>
          <Animated.View style={[
            styles.successCard,
            theme.shadows.dark,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.successTitle}>{successInfo?.title}</Text>
            
            <View style={styles.successDetails}>
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>Cửa hàng:</Text>
                <Text style={styles.successDetailVal}>{successInfo?.shopName}</Text>
              </View>
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>Ca làm:</Text>
                <Text style={styles.successDetailVal}>{successInfo?.shiftTitle}</Text>
              </View>
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>Thời gian:</Text>
                <Text style={styles.successDetailVal}>{successInfo?.timestamp}</Text>
              </View>
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>Trạng thái:</Text>
                <View style={[styles.successStatusBadge, { backgroundColor: successInfo?.statusColor }]}>
                  <Text style={styles.successStatusText}>{successInfo?.status}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.successOkBtn}
              onPress={() => setShowSuccessCard(false)}
            >
              <Text style={styles.successOkBtnText}>Xác nhận</Text>
            </TouchableOpacity>
          </Animated.View>
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
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 120,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    lineHeight: 34,
    marginBottom: theme.spacing.md,
  },
  simulatorCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  simulatorTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#D97706',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  simulatorText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
    marginBottom: theme.spacing.md,
  },
  simulateBtn: {
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
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
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  briefShop: {
    fontSize: 11,
    color: '#0A58CA',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  briefTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 4,
    marginBottom: 8,
  },
  briefTime: {
    fontSize: 13,
    color: theme.colors.text,
    marginVertical: 2,
  },
  briefRate: {
    fontSize: 13,
    color: theme.colors.success,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  mapCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  ringRed: {
    borderColor: '#FEE2E2',
    shadowColor: theme.colors.danger,
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  ringGreen: {
    borderColor: '#D1FAE5',
    shadowColor: theme.colors.success,
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  ringActiveWorking: {
    borderColor: theme.colors.success,
    borderWidth: 8,
    shadowColor: theme.colors.success,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 6,
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
    fontWeight: '900',
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
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    width: '100%',
  },
  checkInBtn: {
    backgroundColor: theme.colors.student,
    shadowColor: theme.colors.student,
  },
  checkOutBtn: {
    backgroundColor: theme.colors.danger,
    shadowColor: theme.colors.danger,
  },
  disabledBtn: {
    backgroundColor: theme.colors.textLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  actionBtnText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  warningText: {
    fontSize: 11,
    color: theme.colors.danger,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
    paddingHorizontal: theme.spacing.sm,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerSafe: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
  },
  scannerHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: Platform.OS === 'ios' ? 0 : 20,
  },
  scannerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scannerCloseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  scannerCloseBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinder: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: theme.colors.student,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  laserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  scannerBottom: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 20,
  },
  scannerInstructions: {
    color: '#FFF',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
    opacity: 0.8,
  },
  scannerSubtext: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    marginBottom: 16,
  },
  manualScanBtn: {
    backgroundColor: theme.colors.student,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: theme.colors.student,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  manualScanBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 340,
    padding: 28,
    alignItems: 'center',
  },
  successEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  successDetails: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 24,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  successDetailLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  successDetailVal: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '700',
  },
  successStatusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  successStatusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  successOkBtn: {
    backgroundColor: '#0F172A',
    width: '100%',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  successOkBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  permissionPromptBox: {
    width: 280,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  permissionPromptTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionPromptText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  requestPermissionBtn: {
    backgroundColor: theme.colors.student,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  requestPermissionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  }
});
