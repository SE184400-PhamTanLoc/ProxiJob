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
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

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
    setActiveShift,
    navigateTo
  } = useContext(AppContext);

  const { data: shiftsData, isLoading: isShiftsLoading } = useShiftsQuery(user, studentCoords);
  const shifts = shiftsData || EMPTY_ARRAY;
  const checkInMutation = useCheckInMutation(user, showToast, addNotification);
  const checkOutMutation = useCheckOutMutation(user, showToast, addNotification);
  const [permission, requestPermission] = useCameraPermissions();

  const checkInShift = async (shiftId, qrToken, latitude, longitude, photoUrl, targetLatitude, targetLongitude) => {
    try {
      const res = await checkInMutation.mutateAsync({ shiftId, qrToken, latitude, longitude, photoUrl, targetLatitude, targetLongitude });
      const timekeepingId = res?.data?.timekeepingId || res?.data?.TimekeepingId || res?.timekeepingId || res?.TimekeepingId;
      const targetShift = shifts.find(s => s.id === shiftId);
      if (targetShift) {
        const now = new Date();
        const checkInTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const updatedShift = {
          ...targetShift,
          status: 'checkin_active',
          checkInTime,
          actualCheckInTime: now.toISOString(),
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
  const [loadingGPS, setLoadingGPS] = useState(false);

  const getDeviceLocation = async () => {
    try {
      setLoadingGPS(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Vui lòng cấp quyền truy cập vị trí để lấy tọa độ thực tế!', 'warning');
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setStudentCoords(coords);
      
      const dist = calculateHaversineDistance(
        coords.latitude,
        coords.longitude,
        shopLat,
        shopLng
      );
      setSimulatedDistanceToActive(dist);

      showToast(`Đã cập nhật vị trí GPS: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`, 'success');
    } catch (e) {
      console.log('Error getting device location:', e);
      const mockCoords = {
        latitude: shopLat + 0.00003,
        longitude: shopLng + 0.00003,
      };
      setStudentCoords(mockCoords);
      const dist = calculateHaversineDistance(
        mockCoords.latitude,
        mockCoords.longitude,
        shopLat,
        shopLng
      );
      setSimulatedDistanceToActive(dist);
      showToast('Phát hiện lỗi GPS máy ảo, đã tự động định vị bạn tại cửa hàng!', 'info');
    } finally {
      setLoadingGPS(false);
    }
  };
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

  const getTodayDateStr = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Active shift - prioritize persisted contextActiveShift for instant display
  const activeShift = contextActiveShift || shifts.find(s => s.status === 'checkin_active');
  const todayStr = getTodayDateStr();
  const approvedShifts = shifts.filter(s => s.status === 'approved' && s.date === todayStr);

  // Keep selected shift in sync - guard reset behind isShiftsLoading to avoid flash
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
    } else if (!isShiftsLoading && approvedShifts.length > 0 && !selectedShiftForCheckIn) {
      // Only set approved shifts after data has loaded
      setSelectedShiftForCheckIn(approvedShifts[0]);
      setIsTimerRunning(false);
      setTimerSeconds(0);
    } else if (!isShiftsLoading && approvedShifts.length === 0 && !activeShift) {
      // Only reset when we're sure data is loaded and no active shift exists
      setSelectedShiftForCheckIn(null);
      setIsTimerRunning(false);
      setTimerSeconds(0);
    }
  }, [shifts, activeShift, navigationParams, isShiftsLoading]);

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
    if (activeShift) {
      if (activeShift.actualCheckInTime) {
        const calculateSeconds = () => {
          const checkInDate = new Date(activeShift.actualCheckInTime);
          const now = new Date();
          const diffMs = now.getTime() - checkInDate.getTime();
          const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
          setTimerSeconds(diffSecs);
        };
        calculateSeconds();
        interval = setInterval(calculateSeconds, 1000);
      } else {
        interval = setInterval(() => {
          setTimerSeconds((prev) => prev + 1);
        }, 1000);
      }
    } else {
      setTimerSeconds(0);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [activeShift]);

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

  // Auto-fetch real device location on mount or when selectedShiftForCheckIn changes
  useEffect(() => {
    const autoFetchGPS = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setStudentCoords(coords);
        }
      } catch (err) {
        console.log('Error auto-fetching device location:', err);
        if (shopLat && shopLng) {
          const mockCoords = {
            latitude: shopLat + 0.00003,
            longitude: shopLng + 0.00003,
          };
          setStudentCoords(mockCoords);
          const dist = calculateHaversineDistance(
            mockCoords.latitude,
            mockCoords.longitude,
            shopLat,
            shopLng
          );
          setSimulatedDistanceToActive(dist);
        }
      }
    };
    autoFetchGPS();
  }, [selectedShiftForCheckIn]);

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
        '',
        selectedShiftForCheckIn.latitude,
        selectedShiftForCheckIn.longitude
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
        L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          maxZoom: 19,
          attribution: 'Google Maps'
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


  const getShiftBadge = () => {
    if (activeShift) {
      return (
        <View style={[styles.badgeContainer, { backgroundColor: '#E8F5E9' }]}>
          <Text style={[styles.badgeText, { color: '#2E7D32' }]}>Đang trong ca ⚡</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badgeContainer, { backgroundColor: '#FFF3E0' }]}>
        <Text style={[styles.badgeText, { color: '#E65100' }]}>Chờ điểm danh 📍</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.headerTitle}>Điểm Danh</Text>
            <Text style={styles.headerSubtitle}>Xác thực GPS & Trình quét QR</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>Bản đồ GPS</Text>
          </View>
        </View>
        
        {/* If no approved/active shifts, show empty check-in screen */}
        {!selectedShiftForCheckIn ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="time-outline" size={64} color="#64748B" />
            </View>
            <Text style={styles.emptyText}>Hôm nay bạn chưa có ca làm nào được duyệt.</Text>
            <Text style={styles.emptySub}>Hãy ứng tuyển các ca làm việc gần bạn trên trang chủ và chờ chủ quán phê duyệt nhé!</Text>
          </View>
        ) : (
          <View style={styles.checkInConsole}>
            {/* Shift Brief Card */}
            <View style={[styles.briefCard, theme.shadows.light]}>
              <View style={styles.briefHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="storefront-outline" size={18} color="#FF6B00" style={{ marginRight: 6 }} />
                  <Text style={styles.briefShop}>{selectedShiftForCheckIn.shopName}</Text>
                </View>
                {getShiftBadge()}
              </View>
              <Text style={styles.briefTitle}>{selectedShiftForCheckIn.title}</Text>
              
              <View style={styles.briefDivider} />
              
              <View style={styles.briefMetaRow}>
                <View style={styles.briefMetaCol}>
                  <Text style={styles.briefMetaLabel}>CA LÀM VIỆC</Text>
                  <View style={styles.briefMetaValRow}>
                    <Ionicons name="time-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={styles.briefMetaVal}>{selectedShiftForCheckIn.time}</Text>
                  </View>
                </View>
                <View style={styles.briefMetaCol}>
                  <Text style={styles.briefMetaLabel}>LƯƠNG ĐỀ XUẤT</Text>
                  <View style={styles.briefMetaValRow}>
                    <Ionicons name="cash-outline" size={14} color="#10B981" style={{ marginRight: 4 }} />
                    <Text style={[styles.briefMetaVal, { color: '#10B981', fontWeight: 'bold' }]}>
                      {(selectedShiftForCheckIn.hourlyRate || 0).toLocaleString('vi-VN')} đ/h
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Interactive Leaflet Map Card */}
            <View style={[styles.mapCard, theme.shadows.light]}>
              <View style={styles.mapHeader}>
                <Ionicons name="map-outline" size={16} color="#FF6B00" style={{ marginRight: 6 }} />
                <Text style={styles.mapCardTitle}>Định vị thực tế (Leaflet Map API)</Text>
              </View>
              
              <View style={styles.mapOuterWrapper}>
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
              </View>
              
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
                  <Text style={styles.legendText}>Bán kính 100m</Text>
                </View>
              </View>

              {/* Location Controls Row */}
              <View style={styles.locationControlsRow}>
                <TouchableOpacity
                  style={styles.gpsUpdateBtn}
                  onPress={getDeviceLocation}
                  disabled={loadingGPS}
                >
                  {loadingGPS ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="location-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.locationBtnText}>📍 Cập Nhật Vị Trí GPS</Text>
                    </>
                  )}
                </TouchableOpacity>
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
                    <Ionicons name="pulse" size={26} color="#10B981" style={{ marginBottom: 4 }} />
                    <Text style={styles.timerLabel}>THỜI GIAN LÀM VIỆC</Text>
                    <Text style={styles.timerValue}>{formatTimer(timerSeconds)}</Text>
                    <View style={styles.timerBadge}>
                      <Text style={styles.timerBadgeText}>Đang trong ca</Text>
                    </View>
                    <Text style={styles.checkInTimeText}>Bắt đầu: {selectedShiftForCheckIn.checkInTime}</Text>
                  </View>
                ) : (
                  <View style={styles.statusCircleContent}>
                    <Ionicons 
                      name={isWithinRadius ? "checkmark-circle" : "warning"} 
                      size={32} 
                      color={isWithinRadius ? "#10B981" : "#EF4444"} 
                    />
                    <Text style={styles.statusLabel}>KHOẢNG CÁCH GẦN QUÁN</Text>
                    <Text style={[styles.statusValue, isWithinRadius ? styles.textGreen : styles.textRed]}>
                      {simulatedDistanceToActive >= 1000 
                        ? `${(simulatedDistanceToActive / 1000).toFixed(1)} km` 
                        : `${simulatedDistanceToActive} m`}
                    </Text>
                    <Text style={[styles.statusSubLabel, isWithinRadius ? styles.textGreen : styles.textRed]}>
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
                    isWithinRadius ? (activeShift ? styles.checkOutBtn : styles.checkInBtn) : styles.disabledBtn
                  ]}
                  disabled={!isWithinRadius}
                  onPress={handleTriggerQRScan}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="qr-code-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.actionBtnText}>
                      {activeShift 
                        ? (isWithinRadius ? 'QUÉT QR ĐỂ KẾT THÚC CA' : 'QUÁ XA ĐỂ KẾT THÚC CA')
                        : (isWithinRadius ? 'QUÉT MÃ QR BẮT ĐẦU CA' : 'QUÁ XA ĐỂ BẮT ĐẦU CA')
                      }
                    </Text>
                  </View>
                </TouchableOpacity>

                {!isWithinRadius && (
                  <View style={styles.warningContainer}>
                    <Ionicons name="information-circle-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.warningText}>
                      Khoảng cách đến quán vượt quá 100m. Vui lòng di chuyển lại gần cửa hàng để điểm danh.
                    </Text>
                  </View>
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
        animationType="fade"
        onRequestClose={() => setShowSuccessCard(false)}
      >
        <View style={styles.successOverlay}>
          <Animated.View style={[
            styles.successCard,
            theme.shadows.medium,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}>
            {/* Top Header circle */}
            <View style={styles.successHeader}>
              <View style={[styles.successHeaderCircle, { backgroundColor: successInfo?.type === 'CHECK-IN' ? '#E8F5E9' : '#FFF1F2' }]}>
                <Ionicons 
                  name={successInfo?.type === 'CHECK-IN' ? "checkmark-circle" : "log-out"} 
                  size={46} 
                  color={successInfo?.type === 'CHECK-IN' ? '#10B981' : '#EF4444'} 
                />
              </View>
              <Text style={styles.successSubtitle}>Ghi nhận thành công</Text>
              <Text style={styles.successTitle}>{successInfo?.title}</Text>
            </View>

            {/* Ticket Cutout Divider */}
            <View style={styles.ticketDividerContainer}>
              <View style={styles.leftCutout} />
              <View style={styles.dashedLine} />
              <View style={styles.rightCutout} />
            </View>

            {/* Receipt Details */}
            <View style={styles.receiptContent}>
              <View style={styles.receiptRow}>
                <View style={styles.receiptLabelContainer}>
                  <Ionicons name="storefront-outline" size={15} color="#64748B" style={{ marginRight: 6 }} />
                  <Text style={styles.receiptLabel}>Cửa hàng</Text>
                </View>
                <Text style={styles.receiptValue}>{successInfo?.shopName}</Text>
              </View>

              <View style={styles.receiptRow}>
                <View style={styles.receiptLabelContainer}>
                  <Ionicons name="briefcase-outline" size={15} color="#64748B" style={{ marginRight: 6 }} />
                  <Text style={styles.receiptLabel}>Ca làm việc</Text>
                </View>
                <Text style={styles.receiptValue}>{successInfo?.shiftTitle}</Text>
              </View>

              <View style={styles.receiptRow}>
                <View style={styles.receiptLabelContainer}>
                  <Ionicons name="time-outline" size={15} color="#64748B" style={{ marginRight: 6 }} />
                  <Text style={styles.receiptLabel}>Thời gian</Text>
                </View>
                <Text style={styles.receiptValue}>{successInfo?.timestamp}</Text>
              </View>

              <View style={styles.receiptRow}>
                <View style={styles.receiptLabelContainer}>
                  <Ionicons name="shield-checkmark-outline" size={15} color="#64748B" style={{ marginRight: 6 }} />
                  <Text style={styles.receiptLabel}>Trạng thái</Text>
                </View>
                <View style={[styles.successStatusBadge, { backgroundColor: successInfo?.statusColor }]}>
                  <Text style={styles.successStatusText}>{successInfo?.status}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.successOkBtn}
              activeOpacity={0.9}
              onPress={() => {
                setShowSuccessCard(false);
                if (successInfo?.type === 'CHECK-OUT') {
                  navigateTo('student_calendar');
                }
              }}
            >
              <Text style={styles.successOkBtnText}>Xác nhận & Đóng</Text>
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
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 120,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
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
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  emptySub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  checkInConsole: {
    width: '100%',
  },
  briefCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingLeft: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderLeftWidth: 5,
    borderLeftColor: '#FF6B00',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  briefHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  briefShop: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  briefTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 14,
  },
  briefDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  briefMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  briefMetaCol: {
    flex: 1,
  },
  briefMetaLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  briefMetaValRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  briefMetaVal: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  mapOuterWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  webMap: {
    width: '100%',
    height: 220,
    borderWidth: 0,
  },
  mobileMap: {
    height: 220,
    width: '100%',
  },
  mapLegends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  statusSection: {
    alignItems: 'center',
    marginVertical: 14,
  },
  radiusRing: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    elevation: 5,
  },
  ringRed: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  ringGreen: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  ringActiveWorking: {
    borderColor: '#FF6B00',
    backgroundColor: '#FFF7ED',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  statusCircleContent: {
    alignItems: 'center',
    gap: 2,
  },
  timerCircleContent: {
    alignItems: 'center',
    gap: 2,
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  timerLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  statusValue: {
    fontSize: 32,
    fontWeight: '900',
  },
  timerValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  timerBadge: {
    backgroundColor: '#FFEFE2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  timerBadgeText: {
    fontSize: 9,
    color: '#E65100',
    fontWeight: '800',
  },
  checkInTimeText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  statusSubLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  textRed: {
    color: '#EF4444',
  },
  textGreen: {
    color: '#10B981',
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  actionBtn: {
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  checkInBtn: {
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  checkOutBtn: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  disabledBtn: {
    backgroundColor: '#CBD5E1',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderColor: '#FED7D7',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    width: '100%',
  },
  warningText: {
    fontSize: 11,
    color: '#EF4444',
    lineHeight: 16,
    flex: 1,
    fontWeight: '500',
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
    borderColor: '#FF6B00',
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
    backgroundColor: '#FF6B00',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  requestPermissionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 340,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  successHeader: {
    alignItems: 'center',
    width: '100%',
  },
  successHeaderCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  ticketDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 20,
    marginVertical: 16,
  },
  leftCutout: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    position: 'absolute',
    left: -34,
  },
  rightCutout: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    position: 'absolute',
    right: -34,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 1,
    marginHorizontal: 10,
  },
  receiptContent: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  receiptLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  receiptValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '700',
  },
  successStatusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  successStatusText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  successOkBtn: {
    backgroundColor: '#0F172A',
    width: '100%',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successOkBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  locationControlsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  gpsUpdateBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gpsSimulateBtn: {
    flex: 1,
    backgroundColor: '#FF6B00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  locationBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
