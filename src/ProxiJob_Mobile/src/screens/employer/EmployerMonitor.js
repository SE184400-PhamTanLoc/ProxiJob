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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { getAvatarSource } from '../../utils/avatarHelper';
import { handleCallUser } from '../../utils/callHelper';
import { useAttendanceLogsQuery, useStaffListQuery, useEmployerJobsQuery } from '../../hooks/queries';
import { getQrCode, generateQrCode, updateQrRadius, updateQrLocation } from '../../api/management';
import { getBusinessProfileApi } from '../../api/businessApi';

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
    studentCoords,
    navigateTo,
    navigationParams,
    setNavigationParams
  } = useContext(AppContext);

  const { data: attendanceLogs = [], refetch: refetchAttendanceLogs } = useAttendanceLogsQuery(user);
  const { data: staffList = [] } = useStaffListQuery(user);
  const { data: employerData } = useEmployerJobsQuery(user);
  const employerShifts = employerData?.shifts || [];

  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Shift slots states (for mapping note/slotId to shift details)
  const [shiftSlots, setShiftSlots] = useState([
    { id: 'morning', name: 'Ca Sáng', time: '08:00 - 12:00', icon: '☀️' },
    { id: 'afternoon', name: 'Ca Chiều', time: '13:00 - 17:00', icon: '⛅' },
    { id: 'evening', name: 'Ca Tối', time: '18:00 - 22:00', icon: '🌙' },
  ]);

  useEffect(() => {
    const loadCustomShifts = async () => {
      try {
        const storageKey = `@custom_shift_slots_${user?.id || 'default'}`;
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          setShiftSlots(JSON.parse(stored));
        }
      } catch (err) {
        console.log('Error loading shift slots in EmployerMonitor:', err);
      }
    };
    if (user) {
      loadCustomShifts();
    }
  }, [user]);

  const formatShiftName = (shiftKey) => {
    if (shiftKey === 'external_staff') return '⚡ Nhân Sự Vãng Lai';
    if (!shiftKey) return 'Không có ca';
    const slot = shiftSlots.find(s => s.id === shiftKey);
    if (slot) {
      return `${slot.name} (${slot.time})`;
    }
    if (shiftKey.startsWith('custom_')) {
      return 'Ca Tự Chọn';
    }
    return shiftKey;
  };

  const getShiftTimeRange = (shiftKey) => {
    const slot = shiftSlots.find(s => s.id === shiftKey);
    if (slot && slot.time) {
      const parts = slot.time.split(' - ');
      if (parts.length === 2) {
        return { startStr: parts[0], endStr: parts[1] };
      }
    }
    return null;
  };

  const getShiftStartMinutes = (shiftKey) => {
    if (shiftKey === 'external_staff') return 25 * 60;
    const range = getShiftTimeRange(shiftKey);
    if (range) {
      const [h, m] = range.startStr.split(':').map(Number);
      return h * 60 + m;
    }
    if (shiftKey === 'morning') return 8 * 60;
    if (shiftKey === 'afternoon') return 13 * 60;
    if (shiftKey === 'evening') return 18 * 60;
    return 24 * 60; // other/custom shifts go last
  };

  const [shopLat, setShopLat] = useState(10.857461); // 84/10 Nam Cao, Quận 9, TP.HCM
  const [shopLng, setShopLng] = useState(106.801522);
  const [businessProfile, setBusinessProfile] = useState(null);

  useEffect(() => {
    async function loadShopLocation() {
      try {
        const profile = await getBusinessProfileApi();
        if (profile) {
          setBusinessProfile(profile);
          if (profile.address) {
            const queryStr = `${profile.address} ${profile.city || ''}`.trim();
            let latVal = null;
            let lngVal = null;

            // Try Goong Maps API (Google Maps style Vietnamese clone)
            const GOONG_API_KEY = 'CvNapWs3C3Vt7ZTRZf0uZliN9v3q8TBJKxd2CEcW';
            try {
              const goongUrl = `https://rsapi.goong.io/Geocode?address=${encodeURIComponent(queryStr)}&api_key=${GOONG_API_KEY}`;
              const goongRes = await fetch(goongUrl);
              if (goongRes.ok) {
                const goongData = await goongRes.json();
                if (goongData.results && goongData.results.length > 0) {
                  const loc = goongData.results[0].geometry.location;
                  latVal = loc.lat;
                  lngVal = loc.lng;
                }
              }
            } catch (err) {
              console.log('Error geocoding with Goong Maps:', err);
            }

            // Fallback to Nominatim OpenStreetMap
            if (latVal === null || lngVal === null) {
              try {
                const geoResponse = await fetch(
                  `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1`,
                  { headers: { 'User-Agent': 'ProxiJob-App' } }
                );
                if (geoResponse.ok) {
                  const geoData = await geoResponse.json();
                  if (geoData && geoData.length > 0) {
                    latVal = parseFloat(geoData[0].lat);
                    lngVal = parseFloat(geoData[0].lon);
                  }
                }
              } catch (osmErr) {
                console.log('Error geocoding with Nominatim:', osmErr);
              }
            }

            if (latVal !== null && lngVal !== null) {
              setShopLat(latVal);
              setShopLng(lngVal);
              
              // Auto-sync shop coordinates to QR code for accurate GPS distance checks
              try {
                await updateQrLocation(latVal, lngVal);
                console.log('[EmployerMonitor] Synced shop GPS to QR code:', latVal, lngVal);
              } catch (syncErr) {
                console.log('[EmployerMonitor] Non-critical: failed to sync QR location:', syncErr);
              }
            }
          }
        }
      } catch (err) {
        console.log('Error loading business profile or geocoding in EmployerMonitor:', err);
      }
    }
    loadShopLocation();
  }, []);

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

  // Compute live student coordinates and distance
  const studentLat = studentCoords?.latitude || 10.8550;
  const studentLng = studentCoords?.longitude || 106.6300;
  const studentDistance = calculateHaversineDistance(studentLat, studentLng, shopLat, shopLng);

  // Combine into active working personnel list by querying attendanceLogs
  const activePersonnel = (attendanceLogs || [])
    .map(log => {
      // Find staff profile from staffList to get their true avatarUrl and type
      const staffMember = staffList.find(s => s.id === log.employeeId || s.name === log.studentName);
      const isExternal = staffMember ? staffMember.isExternal : false;
      const realPhotoUrl = staffMember?.avatarUrl || log.photo || null;

      // Check if this log belongs to our test student
      const isStudent = log.studentName.toLowerCase().includes('mai') || log.studentName.toLowerCase().includes('a') || isExternal;
      const isGpsActive = log.status === 'working' || log.status === 'suspicious';

      // Resolve the target work coordinates for this employee (Branch / Job Post coordinates)
      let targetLat = shopLat;
      let targetLng = shopLng;
      let targetAddress = businessProfile?.address || 'Cửa hàng';
      
      if (isExternal && log.jobShiftId) {
        const matchingShift = employerShifts.find(s => s.id === log.jobShiftId);
        if (matchingShift) {
          targetLat = matchingShift.latitude || targetLat;
          targetLng = matchingShift.longitude || targetLng;
          targetAddress = matchingShift.address || targetAddress;
        }
      }

      const lat = isGpsActive ? (isStudent ? studentLat : targetLat + 0.0001) : null;
      const lng = isGpsActive ? (isStudent ? studentLng : targetLng + 0.0001) : null;
      const distance = isGpsActive ? calculateHaversineDistance(lat, lng, targetLat, targetLng) : null;
      const isSuspicious = log.status === 'suspicious' || (distance && distance > 100);

      return {
        id: log.id || `ws_${log.shiftId}`,
        employeeId: log.employeeId || null,
        name: log.studentName,
        role: log.jobTitle || 'Nhân viên',
        shiftName: isExternal ? 'external_staff' : log.shiftName,
        checkInTime: log.checkInTime || 'Chưa check-in',
        checkOutTime: log.checkOutTime,
        distance: distance,
        isStudent: isStudent,
        shop: log.shopName || 'Cửa hàng',
        latitude: lat,
        longitude: lng,
        gpsStatus: log.status === 'suspicious' ? 'Suspicious' : (log.status === 'not_checked_in' ? 'NotCheckedIn' : 'Valid'),
        photo: realPhotoUrl,
        rawStatus: log.status,
        isExternal: isExternal,
        targetLat,
        targetLng,
        targetAddress
      };
    });

  // Sort personnel: suspicious first, then working/valid, then not_checked_in
  const sortedPersonnel = [...activePersonnel].sort((a, b) => {
    const score = (status) => {
      if (status === 'suspicious') return 0;
      if (status === 'working') return 1;
      if (status === 'not_checked_in') return 2;
      return 3; // completed/absent
    };
    return score(a.rawStatus) - score(b.rawStatus);
  });

  // Group personnel by shiftKey
  const groupedShifts = {};
  sortedPersonnel.forEach(person => {
    const shiftKey = person.shiftName || 'other';
    if (!groupedShifts[shiftKey]) {
      groupedShifts[shiftKey] = [];
    }
    groupedShifts[shiftKey].push(person);
  });

  const availableShiftKeys = Object.keys(groupedShifts);
  const sortedShiftKeys = availableShiftKeys.sort((a, b) => {
    return getShiftStartMinutes(a) - getShiftStartMinutes(b);
  });

  const [selectedShiftKey, setSelectedShiftKey] = useState(null);

  useEffect(() => {
    if (sortedShiftKeys.length > 0) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      let activeKey = null;
      let closestKey = null;
      let minDiff = Infinity;

      sortedShiftKeys.forEach(key => {
        const range = getShiftTimeRange(key);
        if (range) {
          const [startH, startM] = range.startStr.split(':').map(Number);
          const [endH, endM] = range.endStr.split(':').map(Number);
          const startMin = startH * 60 + startM;
          const endMin = endH * 60 + endM;

          if (currentMinutes >= startMin && currentMinutes <= endMin) {
            activeKey = key;
          }

          const diff = Math.abs(currentMinutes - startMin);
          if (diff < minDiff) {
            minDiff = diff;
            closestKey = key;
          }
        }
      });

      const defaultKey = activeKey || closestKey || sortedShiftKeys[0];
      setSelectedShiftKey(prev => prev && sortedShiftKeys.includes(prev) ? prev : defaultKey);
    } else {
      setSelectedShiftKey(null);
    }
  }, [attendanceLogs]);

  const displayedPersonnel = selectedShiftKey ? (groupedShifts[selectedShiftKey] || []) : [];
  const mapPersonnel = displayedPersonnel.filter(p => p.latitude !== null && p.longitude !== null);

  const uniqueWorkLocations = [];
  displayedPersonnel.forEach(p => {
    const lat = p.targetLat || shopLat;
    const lng = p.targetLng || shopLng;
    const address = p.targetAddress || 'Cửa hàng';
    const exists = uniqueWorkLocations.some(loc => loc.latitude === lat && loc.longitude === lng);
    if (!exists) {
      uniqueWorkLocations.push({ latitude: lat, longitude: lng, address });
    }
  });

  if (uniqueWorkLocations.length === 0) {
    uniqueWorkLocations.push({
      latitude: shopLat,
      longitude: shopLng,
      address: businessProfile?.address || 'Cửa hàng'
    });
  }

  // Leaflet HTML String for Employer GPS Live
  const personnelPinsJS = mapPersonnel.map(person => `
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
        }).setView([${uniqueWorkLocations[0].latitude}, ${uniqueWorkLocations[0].longitude}], 16);
        L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          maxZoom: 19
        }).addTo(map);

        // Render branch locations and their geofences
        ${uniqueWorkLocations.map((loc, idx) => `
          L.circle([${loc.latitude}, ${loc.longitude}], {
            color: '#00D1FF',
            fillColor: '#00D1FF',
            fillOpacity: 0.1,
            radius: 100
          }).addTo(map);

          L.marker([${loc.latitude}, ${loc.longitude}], {
            icon: L.divIcon({
              html: '<div class="shop-pulse-icon" style="background: #EF4444; width: 44px; height: 44px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 22px;">🏪</div>',
              className: 'custom-shop-icon',
              iconSize: [44, 44],
              iconAnchor: [22, 22],
              popupAnchor: [0, -22]
            })
          }).addTo(map)
            .bindPopup('<b>${businessProfile?.businessName || "Cửa hàng"} (${loc.address.replace(/'/g, "\\'")})</b>')
            ${idx === 0 ? '.openPopup()' : ''};
        `).join('\n')}

        // Active Personnel Markers
        ${personnelPinsJS}

        // Auto bounds fitting
        var markerCoords = [];
        ${uniqueWorkLocations.map(loc => `markerCoords.push([${loc.latitude}, ${loc.longitude}]);`).join('\n')}
        ${mapPersonnel.map(p => `markerCoords.push([${p.latitude}, ${p.longitude}]);`).join('\n')}
        if (markerCoords.length > 0) {
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
          <Text style={styles.sectionHeader}>NHÂN SỰ TRONG NGÀY ({(() => {
            const localDate = new Date();
            return `${localDate.getDate().toString().padStart(2, '0')}/${(localDate.getMonth() + 1).toString().padStart(2, '0')}/${localDate.getFullYear()}`;
          })()})</Text>
          {selectedShiftKey && (
            <View style={styles.activeCountBadge}>
              <Text style={styles.activeCountText}>
                {displayedPersonnel.filter(p => p.rawStatus === 'working' || p.rawStatus === 'suspicious').length.toString().padStart(2, '0')} Đang Làm
              </Text>
            </View>
          )}
        </View>

        {/* Shift Selection Tabs */}
        {sortedShiftKeys.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsContainer}
            contentContainerStyle={styles.tabsContent}
          >
            {sortedShiftKeys.map((key) => {
              const isActive = selectedShiftKey === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.shiftTabBtn,
                    isActive && styles.shiftTabBtnActive
                  ]}
                  onPress={() => setSelectedShiftKey(key)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.shiftTabText,
                    isActive && styles.shiftTabTextActive
                  ]}>
                    {formatShiftName(key)} ({groupedShifts[key]?.length || 0})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {displayedPersonnel.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💤</Text>
            <Text style={styles.emptyText}>Ca làm việc này không có ai được phân lịch.</Text>
            <Text style={styles.emptySub}>Chọn ca khác hoặc thêm lịch trực ở trang Phân Công.</Text>
          </View>
        ) : (
          displayedPersonnel.map((person) => {
            const isSuspicious = person.rawStatus === 'suspicious';
            const isNotCheckedIn = person.rawStatus === 'not_checked_in';
            const isAbsent = person.rawStatus === 'absent';
            const isCompleted = person.rawStatus === 'completed';
            const isWorking = person.rawStatus === 'working';

            let cardStatusStyle = null;
            let statusColor = theme.colors.success;
            let statusText = `• ${person.distance}m - AN TOÀN`;

            if (isSuspicious) {
              cardStatusStyle = styles.staffCardSuspicious;
              statusColor = theme.colors.danger;
              statusText = `⚠️ Nghi vấn GPS - Cách ${person.distance}m`;
            } else if (isNotCheckedIn) {
              cardStatusStyle = styles.staffCardNotCheckedIn;
              statusColor = '#94A3B8';
              statusText = '• CHƯA ĐIỂM DANH';
            } else if (isAbsent) {
              cardStatusStyle = styles.staffCardAbsent;
              statusColor = '#EF4444';
              statusText = '❌ VẮNG MẶT';
            } else if (isCompleted) {
              cardStatusStyle = styles.staffCardCompleted;
              statusColor = '#3B82F6';
              statusText = '✓ ĐÃ RA CA';
            }

            return (
              <View
                key={person.id}
                style={[
                  styles.premiumStaffCard,
                  cardStatusStyle
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
                      { backgroundColor: statusColor }
                    ]} />
                    <Text style={[
                      styles.staffStatusText,
                      { color: statusColor }
                    ]}>
                      {statusText}
                    </Text>
                  </View>
                  <Text style={styles.staffRole} numberOfLines={1} ellipsizeMode="tail">
                    {person.role} • {formatShiftName(person.shiftName)}
                  </Text>
                </View>

                {/* Right: Actions & Timestamp */}
                <View style={styles.staffRightContainer}>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.actionIconButton, styles.chatButton]}
                      activeOpacity={0.7}
                      onPress={() => {
                        const staffMember = staffList.find(s => s.id === person.employeeId || s.name === person.name);
                        if (staffMember && staffMember.userId) {
                          navigationParams.partnerId = staffMember.userId;
                          navigationParams.partnerName = staffMember.name;
                          navigationParams.partnerAvatar = staffMember.avatarUrl;
                          navigationParams.partnerPhone = staffMember.phone;
                          setNavigationParams({ ...navigationParams });
                          navigateTo('employer_chat');
                        } else {
                          Alert.alert('Không thể nhắn tin', 'Không tìm thấy tài khoản liên kết với nhân sự này.');
                        }
                      }}
                    >
                      <Ionicons name="chatbubble-ellipses" size={16} color="#FF6B00" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionIconButton, styles.callButton]}
                      activeOpacity={0.7}
                      onPress={() => {
                        const staffMember = staffList.find(s => s.id === person.employeeId || s.name === person.name);
                        const phone = staffMember?.phone || '0901234567';
                        handleCallUser(phone);
                      }}
                    >
                      <Ionicons name="call" size={15} color="#0A58CA" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.checkInTimeText}>
                    {isNotCheckedIn ? 'Chưa Điểm Danh' :
                     isAbsent ? 'Vắng Mặt' :
                     isCompleted ? `Ra ca: ${person.checkOutTime}` :
                     `Check-in: ${person.checkInTime}`}
                  </Text>
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

              {/* <View style={styles.qrMetaRow}>
                <Text style={styles.qrMetaLabel}>Token hiện tại:</Text>
                <Text style={styles.qrMetaVal} numberOfLines={1}>{qrCodeData.qrToken}</Text>
              </View> */}

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
  staffCardNotCheckedIn: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    opacity: 0.85,
  },
  staffCardAbsent: {
    borderColor: '#EF4444',
    borderWidth: 1,
    backgroundColor: '#FEF2F2',
    opacity: 0.8,
  },
  staffCardCompleted: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
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
    marginRight: 8,
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
    gap: 8,
  },
  actionIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  chatButton: {
    backgroundColor: '#FFF3EB',
    borderWidth: 1,
    borderColor: '#FFE0CC',
  },
  callButton: {
    backgroundColor: '#E6F0FA',
    borderWidth: 1,
    borderColor: '#CCE0F5',
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
  },
  tabsContainer: {
    marginVertical: 12,
  },
  tabsContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  shiftTabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shiftTabBtnActive: {
    backgroundColor: theme.colors.student,
    borderColor: theme.colors.student,
  },
  shiftTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  shiftTabTextActive: {
    color: '#FFFFFF',
  },
});
