import React, { useContext, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { WebView } from 'react-native-webview';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';
import { getAvatarSource } from '../../utils/avatarHelper';
import { useAttendanceLogsQuery, useStaffListQuery } from '../../hooks/queries';
import { getQrCode, generateQrCode, updateQrRadius } from '../../api/management';

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

export default function EmployerMonitor() {
  const { 
    user,
    studentCoords
  } = useContext(AppContext);

  const { data: attendanceLogs = [], refetch: refetchAttendanceLogs } = useAttendanceLogsQuery(user);
  const { data: staffList = [] } = useStaffListQuery(user);

  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // QR Code Management States
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);

  const loadQrCode = async () => {
    setLoadingQr(true);
    try {
      const data = await getQrCode();
      setQrCodeData(data);
    } catch (err) {
      console.log('Error fetching QR code:', err);
    } finally {
      setLoadingQr(false);
    }
  };

  useEffect(() => {
    loadQrCode();
  }, []);

  const handleGenerateQr = async () => {
    setGeneratingQr(true);
    try {
      await generateQrCode();
      await loadQrCode();
      if (Platform.OS === 'web') {
        alert('Mã QR đã được làm mới thành công! Token mới đã được cập nhật.');
      } else {
        Alert.alert('Thành công', 'Mã QR đã được làm mới thành công! Token mới đã được cập nhật.');
      }
    } catch (err) {
      console.log('Error generating QR code:', err);
      if (Platform.OS === 'web') {
        alert('Lỗi tạo mã QR: ' + err.message);
      } else {
        Alert.alert('Thất bại', 'Lỗi tạo mã QR: ' + err.message);
      }
    } finally {
      setGeneratingQr(false);
    }
  };

  const handleUpdateRadius = async (newRadius) => {
    try {
      await updateQrRadius(newRadius);
      setQrCodeData(prev => prev ? { ...prev, allowedRadiusMeters: newRadius } : null);
      if (Platform.OS === 'web') {
        alert(`Đã cập nhật bán kính điểm danh thành ${newRadius}m!`);
      } else {
        Alert.alert('Thành công', `Đã cập nhật bán kính điểm danh thành ${newRadius}m!`);
      }
    } catch (err) {
      console.log('Error updating radius:', err);
      if (Platform.OS === 'web') {
        alert('Lỗi cập nhật bán kính: ' + err.message);
      } else {
        Alert.alert('Thất bại', 'Lỗi cập nhật bán kính: ' + err.message);
      }
    }
  };

  useEffect(() => {
    // Set up polling to update logs from database every 5 seconds
    const interval = setInterval(() => {
      refetchAttendanceLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const shopLat = 10.857461; // 84/10 Nam Cao, Quận 9, TP.HCM
  const shopLng = 106.801522;

  // Compute live student coordinates and distance
  const studentLat = studentCoords?.latitude || 10.8550;
  const studentLng = studentCoords?.longitude || 106.6300;
  const studentDistance = calculateHaversineDistance(studentLat, studentLng, shopLat, shopLng);

  // Combine into active working personnel list by querying attendanceLogs (linked to database management_timekeepings)
  const activePersonnel = (attendanceLogs || [])
    .filter(log => log.status === 'working' || log.status === 'suspicious')
    .map(log => {
      // Check if this log belongs to our test student
      const isStudent = log.studentName.toLowerCase().includes('mai') || log.studentName.toLowerCase().includes('a');
      const lat = isStudent ? studentLat : 10.8575;
      const lng = isStudent ? studentLng : 106.8016;
      const distance = isStudent ? studentDistance : calculateHaversineDistance(lat, lng, shopLat, shopLng);
      const isSuspicious = distance > 100;

      return {
        id: log.id,
        name: log.studentName,
        role: log.jobTitle || 'Nhân viên',
        checkInTime: log.checkInTime || '18:00',
        distance: distance,
        isStudent: isStudent,
        shop: log.shopName || 'Cửa hàng',
        latitude: lat,
        longitude: lng,
        gpsStatus: isSuspicious ? 'Suspicious' : 'Valid',
        photo: log.photo || null
      };
    });

  // Sort personnel: suspicious first
  const sortedPersonnel = [...activePersonnel].sort((a, b) => {
    if (a.gpsStatus === 'Suspicious' && b.gpsStatus !== 'Suspicious') return -1;
    if (a.gpsStatus !== 'Suspicious' && b.gpsStatus === 'Suspicious') return 1;
    return 0;
  });

  // Leaflet HTML String for Employer GPS Live
  const personnelPinsJS = activePersonnel.map(person => `
    L.marker([${person.latitude}, ${person.longitude}], {
      icon: L.divIcon({
        html: '<div style="background: ${person.gpsStatus === 'Suspicious' ? '#EF4444' : '#10B981'}; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; font-size: 16px;">${person.gpsStatus === 'Suspicious' ? '⚠️' : '👤'}</div>',
        className: 'custom-person-icon',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17]
      })
    }).addTo(map)
      .bindPopup('<b>${person.name}</b><br>${person.role}<br>Khoảng cách: ${person.distance}m<br>Trạng thái: ${person.gpsStatus === 'Suspicious' ? 'Nghi vấn' : 'An toàn'}');
  `).join('\n');

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

        // 100m Geofence Circle (Cyan-Blue Translucent)
        L.circle([${shopLat}, ${shopLng}], {
          color: '#00D1FF',
          fillColor: '#00D1FF',
          fillOpacity: 0.1,
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
          .bindPopup('<b>Cửa hàng (84/10 Nam Cao)</b>')
          .openPopup();

        // Active Personnel Markers
        ${personnelPinsJS}

        // Auto bounds fitting
        var markerCoords = [[${shopLat}, ${shopLng}]];
        ${activePersonnel.map(p => `markerCoords.push([${p.latitude}, ${p.longitude}]);`).join('\n')}
        if (markerCoords.length > 1) {
          var bounds = L.latLngBounds(markerCoords);
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: 16 }]}
        scrollEnabled={!isMapExpanded}
      >
        {/* Bento-style Interactive Map Card */}
        <View style={styles.mapBentoCard}>
          <View style={styles.mapCardHeader}>
            <Text style={styles.mapTitle}>🗺️ Bản đồ định vị GPS (Leaflet Map API)</Text>
            <TouchableOpacity 
              style={styles.expandToggleBtn} 
              onPress={() => setIsMapExpanded(!isMapExpanded)}
            >
              <Text style={styles.expandToggleText}>
                {isMapExpanded ? 'Thu nhỏ ↩️' : 'Phóng to 🔍'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.mapWrapper, { height: isMapExpanded ? 400 : 220 }]}>
            {Platform.OS === 'web' ? (
              <iframe
                srcDoc={mapHtml}
                style={styles.webMap}
                title="Bản đồ định vị GPS Live"
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

            {!isMapExpanded && (
              <TouchableOpacity 
                style={styles.mapClickOverlay}
                onPress={() => setIsMapExpanded(true)}
                activeOpacity={0.8}
              />
            )}
          </View>

          <View style={styles.mapLegendInfo}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>
              Chấm xanh biểu thị nhân sự đã <Text style={{ fontWeight: 'bold', color: theme.colors.text }}>check-in thành công</Text> và đang ở trong vùng an toàn.
            </Text>
          </View>
        </View>

        {/* Workforce List Header */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionHeader}>NHÂN SỰ ĐANG TRỰC</Text>
          <View style={styles.activeCountBadge}>
            <Text style={styles.activeCountText}>
              {sortedPersonnel.filter(p => p.gpsStatus !== 'Suspicious').length.toString().padStart(2, '0')} Hoạt Động
            </Text>
          </View>
        </View>
        
        {sortedPersonnel.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💤</Text>
            <Text style={styles.emptyText}>Hiện tại chưa có ai check-in ca làm việc.</Text>
            <Text style={styles.emptySub}>Sinh viên check-in bằng GPS sẽ xuất hiện tại đây.</Text>
          </View>
        ) : (
          sortedPersonnel.map((person) => {
            const isSuspicious = person.gpsStatus === 'Suspicious';
            return (
              <View 
                key={person.id} 
                style={[
                  styles.premiumStaffCard,
                  isSuspicious && styles.staffCardSuspicious
                ]}
              >
                {/* Left: Square-rounded avatar */}
                <Image 
                  source={getAvatarSource(person.photo, null, person.name)} 
                  style={styles.staffAvatar} 
                />

                {/* Center: Info */}
                <View style={styles.staffInfoContainer}>
                  <Text style={styles.staffName}>{person.name}</Text>
                  <View style={styles.staffStatusRow}>
                    <View style={[
                      styles.statusIndicatorDot, 
                      { backgroundColor: isSuspicious ? theme.colors.danger : theme.colors.success }
                    ]} />
                    <Text style={[
                      styles.staffStatusText,
                      { color: isSuspicious ? theme.colors.danger : theme.colors.success }
                    ]}>
                      {isSuspicious 
                        ? `⚠️ Nghi vấn GPS - Cách ${person.distance}m` 
                        : `• ${person.distance}m - AN TOÀN`}
                    </Text>
                  </View>
                  <Text style={styles.staffRole}>{person.role} • {person.shop.split(' - ')[0]}</Text>
                </View>

                {/* Right: Actions & Timestamp */}
                <View style={styles.staffRightContainer}>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionIconButton}>
                      <Text style={styles.actionIconEmoji}>💬</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionIconButton}>
                      <Text style={styles.actionIconEmoji}>📞</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.checkInTimeText}>Check-in: {person.checkInTime}</Text>
                </View>
              </View>
            );
          })
        )}

        {/* QR Code Setup Card */}
        <View style={styles.qrManagementBentoCard}>
          <Text style={styles.qrCardTitle}>⚙️ Thiết lập Mã QR Điểm Danh</Text>
          <Text style={styles.qrCardDesc}>
            Mã QR này được dùng để đặt tại quầy thu ngân của quán. Sinh viên ở trong bán kính GPS và quét mã này để hoàn thành điểm danh.
          </Text>

          {loadingQr ? (
            <ActivityIndicator color={theme.colors.student} style={{ marginVertical: 20 }} />
          ) : qrCodeData ? (
            <View style={styles.qrDetailsContainer}>
              {/* Real QR Visual */}
              <View style={styles.qrCodeVisualBox}>
                <View style={styles.qrRealCodeContainer}>
                  <Image 
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeData.qrToken)}` }}
                    style={styles.qrCodeImage}
                  />
                </View>
              </View>

              <View style={styles.qrMetaRow}>
                <Text style={styles.qrMetaLabel}>Token hiện tại:</Text>
                <Text style={styles.qrMetaVal} numberOfLines={1}>{qrCodeData.qrToken}</Text>
              </View>

              {/* Allowed geofence radius selector */}
              <View style={styles.radiusSelectorSection}>
                <Text style={styles.radiusLabel}>Bán kính GPS cho phép:</Text>
                <View style={styles.radiusBtnRow}>
                  {[50, 100, 200].map((radius) => (
                    <TouchableOpacity
                      key={radius}
                      style={[
                        styles.radiusSelectBtn,
                        qrCodeData.allowedRadiusMeters === radius && styles.radiusSelectBtnActive
                      ]}
                      onPress={() => handleUpdateRadius(radius)}
                    >
                      <Text style={[
                        styles.radiusSelectText,
                        qrCodeData.allowedRadiusMeters === radius && styles.radiusSelectTextActive
                      ]}>
                        {radius}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={[styles.regenerateQrBtn, generatingQr && { opacity: 0.6 }]}
                disabled={generatingQr}
                onPress={handleGenerateQr}
              >
                <Text style={styles.regenerateQrBtnText}>
                  {generatingQr ? 'Đang tạo mới...' : '🔄 Làm mới Mã QR (Đổi Token)'}
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.qrSecurityTip}>
                🔒 Nhấn "Làm mới Mã QR" sau mỗi ngày làm việc để tránh tình trạng sinh viên chụp lại mã và tự điểm danh từ xa.
              </Text>
            </View>
          ) : (
            <View style={styles.noQrContainer}>
              <Text style={styles.noQrText}>Quán của bạn chưa tạo mã QR điểm danh.</Text>
              <TouchableOpacity
                style={styles.regenerateQrBtn}
                onPress={handleGenerateQr}
              >
                <Text style={styles.regenerateQrBtnText}>⚡ Khởi tạo mã QR ngay</Text>
              </TouchableOpacity>
            </View>
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
  radarHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Sora' : 'sans-serif',
    fontSize: 34,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 38,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'Hanken Grotesk' : 'sans-serif',
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 64,
  },
  mapBentoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 30,
    elevation: 3,
    marginBottom: 24,
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  expandToggleBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
  },
  expandToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  mapWrapper: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  webMap: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
  },
  mobileMap: {
    flex: 1,
  },
  mapLegendInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginTop: 3,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  activeCountBadge: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
  },
  activeCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  premiumStaffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 12,
  },
  staffCardSuspicious: {
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    backgroundColor: '#FFFBEB',
  },
  staffAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
  },
  staffInfoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  staffName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  staffStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  staffStatusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  staffRole: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  staffRightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 56,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconEmoji: {
    fontSize: 13,
  },
  checkInTimeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  mapClickOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  qrManagementBentoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 30,
    elevation: 3,
    marginTop: 12,
    marginBottom: 20,
  },
  qrCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  qrCardDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  qrDetailsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  qrCodeVisualBox: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  qrRealCodeContainer: {
    width: 200,
    height: 200,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  qrCodeImage: {
    width: 176,
    height: 176,
    resizeMode: 'contain',
  },
  qrMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  qrMetaLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  qrMetaVal: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '700',
    maxWidth: 200,
  },
  radiusSelectorSection: {
    width: '100%',
    marginVertical: 16,
  },
  radiusLabel: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '700',
    marginBottom: 10,
  },
  radiusBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusSelectBtn: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radiusSelectBtnActive: {
    backgroundColor: '#0F172A',
  },
  radiusSelectText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#475569',
  },
  radiusSelectTextActive: {
    color: '#FFFFFF',
  },
  regenerateQrBtn: {
    backgroundColor: theme.colors.student,
    width: '100%',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: theme.colors.student,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  regenerateQrBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  qrSecurityTip: {
    fontSize: 10.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  noQrContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  noQrText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
  }
});
