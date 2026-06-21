import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Dimensions,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';
import { useShiftsQuery } from '../../hooks/queries';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

const getLeftBorderColor = (index) => {
  const colors = ['#8B5CF6', '#C2410C', '#0D9488', '#2563EB', '#EC4899'];
  return colors[index % colors.length];
};

const getShopBgColor = (shopName) => {
  if (!shopName) return '#EFF6FF';
  const charCode = shopName.charCodeAt(0) || 0;
  const colors = ['#FFE4E6', '#FEF3C7', '#ECFDF5', '#EFF6FF', '#F5F3FF', '#FFF7ED'];
  return colors[charCode % colors.length];
};

const getShopTextColor = (shopName) => {
  if (!shopName) return '#475569';
  const charCode = shopName.charCodeAt(0) || 0;
  const colors = ['#E11D48', '#D97706', '#059669', '#2563EB', '#7C3AED', '#EA580C'];
  return colors[charCode % colors.length];
};

const getShopInitials = (shopName) => {
  if (!shopName) return 'PJ';
  const cleanName = shopName.replace(/(Coffee|Tea|Restaurant|Store|Shop|Quán|Café)/gi, '').trim();
  const parts = cleanName.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return cleanName.substring(0, 2).toUpperCase();
};

const getDistrict = (address) => {
  if (!address) return '';
  const match = address.match(/(Quận \d+|Q\.\s*\d+|Quận [a-zA-ZÀ-ỹ\s]+|Bình Thạnh|Gò Vấp|Thủ Đức|Phú Nhuận|Tân Bình|Tân Phú|Bình Tân)/i);
  return match ? match[0] : address;
};

// Module-level state to persist view mode (list/map) across unmounts
let globalViewMode = 'list';

export default function StudentDashboard() {
  const {
    studentCoords,
    getDistanceInMeters,
    navigateTo,
    user,
    setUser,
    setStudentCoords,
    showToast
  } = useContext(AppContext);

  const { data: shifts = [], refetch: loadShifts } = useShiftsQuery(user, studentCoords);

  const [viewMode, setViewModeState] = useState(globalViewMode);
  const setViewMode = (mode) => {
    globalViewMode = mode;
    setViewModeState(mode);
  };

  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [radius, setRadius] = useState(999.0); // Default to 'Tất cả' (All)
  const [profileAddress, setProfileAddress] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isProfileAddressSetRef = useRef(false);

  const handleSelectLocation = async (lat, lng, addressName) => {
    const coords = { latitude: lat, longitude: lng };

    if (setStudentCoords) {
      setStudentCoords(coords);
    }
    setProfileAddress(addressName);
    isProfileAddressSetRef.current = true;

    try {
      await AsyncStorage.setItem('@student_custom_gps', JSON.stringify(coords));
      await AsyncStorage.setItem('@student_profile_address', addressName);
    } catch (err) {
      console.log('[StudentDashboard] Error saving location selection:', err);
    }

    setLocationModalVisible(false);
    await loadShifts(true);

    if (showToast) {
      showToast(`Đã cập nhật vị trí tìm việc: ${addressName}`, 'success');
    }
  };

  const handleMapSelectLocation = async (lat, lng) => {
    let addressName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
        headers: {
          'User-Agent': 'ProxiJobApp/1.0'
        }
      });
      if (response.ok) {
        const data = await response.json();
        const displayName = data.display_name || '';
        const addressVal = data.address?.road || data.address?.suburb || data.address?.quarter || data.address?.city_district || displayName.split(',')[0] || 'Vị trí bản đồ';
        const cityVal = data.address?.city || data.address?.town || data.address?.state || '';
        addressName = cityVal ? `${addressVal}, ${cityVal}` : addressVal;
      }
    } catch (err) {
      console.log('[StudentDashboard] reverse geocode error:', err);
    }

    const coords = { latitude: lat, longitude: lng };
    if (setStudentCoords) {
      setStudentCoords(coords);
    }
    setProfileAddress(addressName);
    isProfileAddressSetRef.current = true;

    try {
      await AsyncStorage.setItem('@student_custom_gps', JSON.stringify(coords));
      await AsyncStorage.setItem('@student_profile_address', addressName);
    } catch (err) {
      console.log('[StudentDashboard] Error saving map click selection:', err);
    }

    await loadShifts(true);
    if (showToast) {
      showToast(`Đã cập nhật vị trí tìm việc: ${addressName}`, 'success');
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      setGpsLoading(true);
      if (showToast) {
        showToast('Đang quét GPS độ chính xác cao...', 'info');
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (showToast) {
          showToast('Không có quyền truy cập GPS. Vui lòng cho phép định vị.', 'warning');
        }
        setGpsLoading(false);
        return;
      }

      const geoPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      if (geoPosition && geoPosition.coords) {
        const { latitude, longitude } = geoPosition.coords;
        await handleMapSelectLocation(latitude, longitude);
      }
    } catch (error) {
      console.log('Error getting current location:', error);
      if (showToast) {
        showToast('Lỗi khi lấy vị trí GPS từ thiết bị.', 'error');
      }
    } finally {
      setGpsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadShifts(true);
    setRefreshing(false);
  }, [loadShifts]);


  useEffect(() => {
    const loadAddressAndProfile = async () => {
      try {
        const savedAddress = await AsyncStorage.getItem('@student_profile_address');
        if (savedAddress) {
          setProfileAddress(savedAddress);
          isProfileAddressSetRef.current = true;
        }

        const { getStudentProfileApi } = require('../../api/studentApi');
        const profileData = await getStudentProfileApi();
        if (profileData) {
          if (profileData.address) {
            setProfileAddress(profileData.address);
            isProfileAddressSetRef.current = true;
            await AsyncStorage.setItem('@student_profile_address', profileData.address);
          }
          if (profileData.latitude && profileData.longitude) {
            const coords = { latitude: profileData.latitude, longitude: profileData.longitude };
            await AsyncStorage.setItem('@student_custom_gps', JSON.stringify(coords));
            if (setStudentCoords) {
              setStudentCoords(coords);
            }
          }

          // Sync user state in context
          const cleanAvatar = profileData.avatarUrl && profileData.avatarUrl !== 'string' && profileData.avatarUrl !== 'null' ? profileData.avatarUrl : '';
          if (user && setUser && (user.avatarUrl !== cleanAvatar || user.gender !== profileData.gender)) {
            const updatedUser = { ...user, avatarUrl: cleanAvatar, gender: profileData.gender };
            setUser(updatedUser);
            try {
              const { saveAuthSession, getStoredToken, getStoredRefreshToken } = require('../../api/auth');
              const token = await getStoredToken();
              const refreshToken = await getStoredRefreshToken();
              await saveAuthSession(token, refreshToken, updatedUser);
            } catch (err) {
              console.log('[StudentDashboard] Error saving session during background profile sync:', err);
            }
          }
        }
      } catch (e) {
        console.log('[StudentDashboard] Error loading profile address:', e);
      }
    };
    loadAddressAndProfile();
  }, []);

  // Geocode coords back into a text label for initial load/Guest
  useEffect(() => {
    const reverseGeocode = async () => {
      if (!studentCoords || !studentCoords.latitude || !studentCoords.longitude) return;
      if (isProfileAddressSetRef.current) return;

      if (studentCoords.latitude === 10.7769 && studentCoords.longitude === 106.7009) {
        setProfileAddress("Q. 1, TP.HCM (mặc định)");
        return;
      }

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${studentCoords.latitude}&lon=${studentCoords.longitude}&format=json`, {
          headers: {
            'User-Agent': 'ProxiJobApp/1.0'
          }
        });
        if (response.ok) {
          const data = await response.json();
          const displayName = data.display_name || '';
          const addressVal = data.address?.road || data.address?.suburb || data.address?.quarter || data.address?.city_district || displayName.split(',')[0] || 'Vị trí hiện tại';
          const cityVal = data.address?.city || data.address?.town || data.address?.state || '';
          const fullLabel = cityVal ? `${addressVal}, ${cityVal}` : addressVal;
          setProfileAddress(fullLabel);
        } else {
          setProfileAddress(`${studentCoords.latitude.toFixed(4)}, ${studentCoords.longitude.toFixed(4)}`);
        }
      } catch (err) {
        console.log('[StudentDashboard] Reverse geocode error:', err);
        setProfileAddress(`${studentCoords.latitude.toFixed(4)}, ${studentCoords.longitude.toFixed(4)}`);
      }
    };

    reverseGeocode();
  }, [studentCoords]);

  // Distance processor
  const processedShifts = (shifts || []).map(shift => {
    if (!shift.latitude || !shift.longitude || (shift.latitude === 0 && shift.longitude === 0)) {
      return { ...shift, distanceKm: Infinity, noGps: true };
    }
    const distMeters = getDistanceInMeters(
      studentCoords.latitude,
      studentCoords.longitude,
      shift.latitude,
      shift.longitude
    );
    const distKm = parseFloat((distMeters / 1000).toFixed(1));
    return { ...shift, distanceKm: distKm, noGps: false };
  });

  // Dynamic filter query
  const filteredShifts = processedShifts
    .filter(shift => {
      const matchRadius = shift.noGps || radius === 999.0 || shift.distanceKm <= radius;

      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        (shift.title || '').toLowerCase().includes(q) ||
        (shift.shopName || '').toLowerCase().includes(q);

      return matchRadius && matchQuery;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const closestShift = filteredShifts.filter(s => !s.noGps).length > 0
    ? [...filteredShifts].filter(s => !s.noGps).sort((a, b) => a.distanceKm - b.distanceKm)[0]
    : null;

  const renderShiftCard = (shift, index) => {
    const isApplied = shift.status === 'applied';
    const isApproved = shift.status === 'approved' || shift.status === 'checkin_active' || shift.status === 'completed';
    const isEmergency = shift.isEmergency;
    const leftBorderColor = getLeftBorderColor(index);

    return (
      <TouchableOpacity
        key={shift.id}
        style={styles.cardShadowContainer}
        activeOpacity={0.95}
        onPress={() => navigateTo('job_detail', { shiftId: shift.id })}
      >
        <View style={[
          styles.cardContent,
          { borderLeftColor: leftBorderColor, borderLeftWidth: 6 }
        ]}>
          <View style={styles.cardTopRow}>
            <View style={styles.logoAndName}>
              <View style={[styles.shopLogoCircle, { backgroundColor: getShopBgColor(shift.shopName) }]}>
                <Text style={[styles.shopLogoText, { color: getShopTextColor(shift.shopName) }]}>
                  {getShopInitials(shift.shopName)}
                </Text>
              </View>
              <View style={styles.shopRatingRow}>
                <Ionicons name="star" size={12} color="#FFB000" style={{ marginRight: 2 }} />
                <Text style={styles.shopRatingText}>{shift.rating || '5.0'}</Text>
              </View>
            </View>

            <View style={styles.tagRow}>
              {isEmergency && (
                <View style={styles.emergencyTag}>
                  <Text style={styles.emergencyTagText}>Tuyển Gấp</Text>
                </View>
              )}
              <View style={styles.jobTypeTag}>
                <Text style={styles.jobTypeTagText}>Part-time</Text>
              </View>
              {isApplied && (
                <View style={styles.appliedStatusTag}>
                  <Text style={styles.appliedStatusTagText}>Đang chờ duyệt</Text>
                </View>
              )}
              {isApproved && (
                <View style={styles.approvedStatusTag}>
                  <Text style={styles.approvedStatusTagText}>Đã duyệt</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.jobTitleText} numberOfLines={2}>{shift.title}</Text>

          <Text style={styles.shopSubtitleText} numberOfLines={1}>
            {shift.shopName} • {getDistrict(shift.address) || 'TP.HCM'}
          </Text>

          <View style={styles.timeInfoRow}>
            <Ionicons name="time-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.timeInfoText}>{shift.date} • {shift.time}</Text>
          </View>

          {shift.address ? (
            <View style={styles.addressInfoRow}>
              <Ionicons name="location-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.addressInfoText} numberOfLines={1} ellipsizeMode="tail">
                {shift.address}
              </Text>
            </View>
          ) : null}

          <View style={styles.cardFooterRow}>
            <Text style={styles.salaryText}>
              {(shift.hourlyRate).toLocaleString('vi-VN')} đ/h
              <Text style={styles.distanceText}>
                {shift.noGps ? '' : ` • ${shift.distanceKm} km`}
              </Text>
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMapView = () => {
    const lat = studentCoords?.latitude || 10.7769;
    const lng = studentCoords?.longitude || 106.7009;

    const shiftsData = filteredShifts
      .filter(s => s.latitude && s.longitude && s.latitude !== 0 && s.longitude !== 0)
      .map(s => ({
        id: s.id,
        title: s.title,
        shopName: s.shopName,
        latitude: s.latitude,
        longitude: s.longitude,
        hourlyRate: s.hourlyRate
      }));

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
          /* Custom user position marker circle with pulsing effect */
          .user-marker {
            background-color: #FF6B00;
            border: 3px solid #FFFFFF;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            box-shadow: 0 0 12px rgba(255, 107, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 11px;
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 107, 0, 0.7); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(255, 107, 0, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 107, 0, 0); }
          }
          /* Job markers styling */
          .job-marker {
            border: 1.5px solid #FFFFFF;
            border-radius: 12px;
            padding: 3px 6px;
            font-weight: 800;
            font-size: 9px;
            color: #FFFFFF;
            box-shadow: 0 3px 8px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false, tap: false }).setView([${lat}, ${lng}], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

          L.control.zoom({ position: 'bottomright' }).addTo(map);

          // Add user current position marker
          var userIcon = L.divIcon({
            className: 'user-marker-container',
            html: '<div class="user-marker">🎓</div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          var userMarker = L.marker([${lat}, ${lng}], { icon: userIcon }).addTo(map);
          userMarker.bindPopup("<b>Vị trí của bạn</b><br/>Tập trung quét ca làm việc quanh đây.");

          // Render job markers
          var shifts = ${JSON.stringify(shiftsData)};
          
          shifts.forEach(function(shift) {
            var pinBg = '#FF6B00'; // Default orange
            var icon = '☕';
            var t = (shift.title || '').toLowerCase();
            var s = (shift.shopName || '').toLowerCase();

            if (t.includes('giao hàng') || t.includes('shipper') || t.includes('delivery')) {
              pinBg = '#7C3AED'; // Purple
              icon = '📦';
            } else if (t.includes('bán hàng') || s.includes('winmart') || s.includes('mart') || s.includes('store') || s.includes('siêu thị')) {
              pinBg = '#EF4444'; // Red
              icon = '🛍️';
            }

            var rate = shift.hourlyRate ? (shift.hourlyRate / 1000).toFixed(0) + 'k/h' : '30k/h';
            var markerHtml = '<div class="job-marker" style="background-color: ' + pinBg + ';">' + icon + ' ' + shift.shopName.substring(0,12) + ' • ' + rate + '</div>';

            var jobIcon = L.divIcon({
              className: 'job-marker-container',
              html: markerHtml,
              iconSize: [110, 22],
              iconAnchor: [55, 11]
            });

            var marker = L.marker([shift.latitude, shift.longitude], { icon: jobIcon }).addTo(map);
            
            var popupContent = '<div style="font-family: sans-serif; font-size:12px; line-height: 1.4; min-width: 140px;">' +
                               '<b style="color:#1E293B; font-size:13px;">' + shift.title + '</b><br/>' +
                               '<span style="color:#64748B;">' + shift.shopName + '</span><br/>' +
                               '<b style="color:#EA580C; display:inline-block; margin-top:4px;">Lương: ' + shift.hourlyRate.toLocaleString("vi-VN") + ' đ/h</b><br/>' +
                               '<button onclick="viewJobDetails(' + shift.id + ')" style="margin-top:8px; width:100%; padding:6px; background-color:#FF6B00; color:white; border:none; border-radius:12px; font-weight:bold; cursor:pointer; font-size:11px;">Xem chi tiết ⚡</button>' +
                               '</div>';

            marker.bindPopup(popupContent);
          });

          window.viewJobDetails = function(id) {
            var payload = JSON.stringify({ type: 'view_job', shiftId: id });
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(payload);
            } else {
              window.parent.postMessage(payload, '*');
            }
          };

          map.on('click', function(e) {
            var payload = JSON.stringify({ type: 'select_location', lat: e.latlng.lat, lng: e.latlng.lng });
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(payload);
            } else {
              window.parent.postMessage(payload, '*');
            }
          });
        </script>
      </body>
      </html>
    `;

    return (
      <View style={styles.mapViewContainer}>
        {Platform.OS === 'web' ? (
          <iframe
            srcDoc={mapHtml}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Interactive Job Map"
          />
        ) : (
          <WebView
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'view_job') {
                  navigateTo('job_detail', { shiftId: data.shiftId });
                } else if (data.type === 'select_location') {
                  handleMapSelectLocation(data.lat, data.lng);
                }
              } catch (e) {
                console.log('[WebView message parsing error]:', e);
              }
            }}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        )}

        {/* Floating locator button */}
        <TouchableOpacity
          style={styles.gpsFloatingButton}
          onPress={handleGetCurrentLocation}
          disabled={gpsLoading}
          activeOpacity={0.8}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="locate" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.gpsFloatingText}>Định vị GPS</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const getGpsLabel = () => {
    if (profileAddress) {
      return profileAddress;
    }
    if (studentCoords.latitude === 10.7769 && studentCoords.longitude === 106.7009) {
      return "Q. 1, TP.HCM (mặc định)";
    }
    return `${studentCoords.latitude.toFixed(4)}, ${studentCoords.longitude.toFixed(4)}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeGreeting}>Chào bạn, {user?.name || 'Sinh viên'} 👋</Text>
          <Text style={styles.welcomeSubtitle}>Hôm nay bạn muốn tìm công việc gì?</Text>
        </View>
        <TouchableOpacity
          style={styles.gpsIndicator}
          onPress={() => setLocationModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="location" size={14} color={theme.colors.primary} style={{ marginRight: 4 }} />
          <Text style={styles.gpsText} numberOfLines={1} ellipsizeMode="tail">{getGpsLabel()}</Text>
        </TouchableOpacity>
      </View>

      {/* Top Search bar and advanced filter toggle */}
      <View style={styles.topSearchWrapper}>
        <View style={styles.searchBarRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm việc gần bạn..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, filterVisible && styles.filterBtnActive]}
            onPress={() => setFilterVisible(!filterVisible)}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.filterBtnText}>Lọc</Text>
          </TouchableOpacity>
        </View>

        {/* Collapsible Search Radius Drawer */}
        {filterVisible && (
          <View style={[styles.filterDrawer, theme.shadows.light]}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderTitle}>Phạm vi tìm kiếm</Text>
              <Text style={styles.sliderValue}>{radius === 999.0 ? 'Tất cả' : `${radius.toFixed(1)} km`}</Text>
            </View>
            <View style={styles.sliderTrackContainer}>
              <TouchableOpacity
                style={[styles.radiusOption, radius === 999.0 && styles.activeRadius]}
                onPress={() => setRadius(999.0)}
              >
                <Text style={[styles.radiusOptionText, radius === 999.0 && styles.activeRadiusText]}>Tất cả</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radiusOption, radius === 3.0 && styles.activeRadius]}
                onPress={() => setRadius(3.0)}
              >
                <Text style={[styles.radiusOptionText, radius === 3.0 && styles.activeRadiusText]}>3km</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radiusOption, radius === 5.0 && styles.activeRadius]}
                onPress={() => setRadius(5.0)}
              >
                <Text style={[styles.radiusOptionText, radius === 5.0 && styles.activeRadiusText]}>5km</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radiusOption, radius === 10.0 && styles.activeRadius]}
                onPress={() => setRadius(10.0)}
              >
                <Text style={[styles.radiusOptionText, radius === 10.0 && styles.activeRadiusText]}>10km</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* View mode toggle - List vs Map */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' && styles.activeToggle]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? theme.colors.student : '#64748B'} style={{ marginRight: 6 }} />
              <Text style={[styles.toggleText, viewMode === 'list' && styles.activeToggleText]}>Danh sách</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'map' && styles.activeToggle]}
            onPress={() => setViewMode('map')}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="map-outline" size={16} color={viewMode === 'map' ? theme.colors.student : '#64748B'} style={{ marginRight: 6 }} />
              <Text style={[styles.toggleText, viewMode === 'map' && styles.activeToggleText]}>Bản đồ Radar</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {closestShift && (
        <View style={styles.closestShiftBanner}>
          <Ionicons name="compass-outline" size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.closestShiftBannerText}>
            Ca làm gần nhất: <Text style={{ fontWeight: 'bold' }}>{closestShift.title}</Text> ({closestShift.shopName}) cách bạn chỉ <Text style={{ fontWeight: 'bold', color: theme.colors.student }}>{closestShift.distanceKm} km</Text>!
          </Text>
        </View>
      )}

      {viewMode === 'list' ? (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.student]}
              tintColor={theme.colors.student}
            />
          }
        >
          {filteredShifts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={theme.colors.textLight} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>Không tìm thấy ca làm việc nào trong bán kính {radius === 999.0 ? 'Tất cả' : `${radius}km`}.</Text>
              <Text style={styles.emptySub}>Hãy tăng phạm vi tìm kiếm hoặc bấm nút bên dưới để xem toàn bộ ca làm nhé!</Text>
              {radius !== 999.0 && (
                <TouchableOpacity
                  style={styles.showAllBtn}
                  onPress={() => setRadius(999.0)}
                >
                  <Text style={styles.showAllBtnText}>Xem tất cả ca làm</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredShifts.map(renderShiftCard)
          )}
        </ScrollView>
      ) : (
        renderMapView()
      )}

      {/* Location Picker Modal */}
      <Modal
        visible={locationModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '80%' }]}>
            <View style={styles.modalDragBar} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalShopName}>VỊ TRÍ TÌM VIỆC</Text>
                <Text style={[styles.modalJobTitle, { fontSize: 18, marginBottom: 0 }]}>Chọn khu vực hyperlocal</Text>
              </View>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={[styles.descriptionBody, { marginBottom: 12 }]}>
                Hệ thống ProxiJob tự động quét ca làm việc trong phạm vi bạn chọn. Vui lòng bấm chọn khu vực hoặc điểm định vị trên bản đồ radar để cập nhật danh sách việc làm gần nhất.
              </Text>

              {/* Radar Mockup Map */}
              <View style={styles.mapContainer}>
                <View style={styles.radarCircleBig}>
                  <View style={styles.radarCircleMedium}>
                    <View style={styles.radarCircleSmall}>
                      <View style={styles.userDot}>
                        <Text style={styles.userEmoji}>🎓</Text>
                      </View>
                    </View>
                  </View>

                  {/* Predefined mock pins around radar representing nearby shifts */}
                  <TouchableOpacity
                    style={[styles.pin, { top: 40, left: 60 }]}
                    onPress={() => handleSelectLocation(10.7828, 106.6958, 'Q. 3, TP.HCM')}
                  >
                    <Text style={styles.pinIcon}>☕</Text>
                    <View style={styles.pinLabel}>
                      <Text style={styles.pinLabelText} numberOfLines={1}>Q. 3</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pin, styles.emergencyPin, { top: 80, right: 40 }]}
                    onPress={() => handleSelectLocation(10.8016, 106.7118, 'Q. Bình Thạnh, TP.HCM')}
                  >
                    <Text style={styles.pinIcon}>⚡</Text>
                    <View style={styles.pinLabel}>
                      <Text style={[styles.pinLabelText, { color: theme.colors.danger }]} numberOfLines={1}>B.Thạnh</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pin, { bottom: 60, left: 50 }]}
                    onPress={() => handleSelectLocation(10.8156, 106.6636, 'Q. Tân Bình, TP.HCM')}
                  >
                    <Text style={styles.pinIcon}>🛍️</Text>
                    <View style={styles.pinLabel}>
                      <Text style={styles.pinLabelText} numberOfLines={1}>T.Bình</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pin, { bottom: 90, right: 60 }]}
                    onPress={() => handleSelectLocation(10.8746, 106.8029, 'TP. Thủ Đức, TP.HCM')}
                  >
                    <Text style={styles.pinIcon}>🍽️</Text>
                    <View style={styles.pinLabel}>
                      <Text style={styles.pinLabelText} numberOfLines={1}>Thủ Đức</Text>
                    </View>
                  </TouchableOpacity>
                </View>
                <Text style={styles.radarTip}>Mẹo: Bấm vào biểu tượng các cửa hàng trên radar để di chuyển vị trí của bạn</Text>
              </View>

              <Text style={styles.sectionHeader}>Chọn nhanh khu vực phổ biến</Text>

              <View style={{ gap: 10, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.guestButton, studentCoords.latitude === 10.7769 && { borderColor: theme.colors.student }]}
                  onPress={() => handleSelectLocation(10.7769, 106.7009, 'Q. 1, TP.HCM')}
                >
                  <Text style={styles.guestButtonText}>📍 Quận 1 (Trung tâm Sài Gòn)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.guestButton, studentCoords.latitude === 10.7828 && { borderColor: theme.colors.student }]}
                  onPress={() => handleSelectLocation(10.7828, 106.6958, 'Q. 3, TP.HCM')}
                >
                  <Text style={styles.guestButtonText}>📍 Quận 3 (Hồ Con Rùa)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.guestButton, studentCoords.latitude === 10.8016 && { borderColor: theme.colors.student }]}
                  onPress={() => handleSelectLocation(10.8016, 106.7118, 'Q. Bình Thạnh, TP.HCM')}
                >
                  <Text style={styles.guestButtonText}>📍 Quận Bình Thạnh (Hàng Xanh)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.guestButton, studentCoords.latitude === 10.8244 && { borderColor: theme.colors.student }]}
                  onPress={() => handleSelectLocation(10.8244, 106.6631, 'Q. Gò Vấp, TP.HCM')}
                >
                  <Text style={styles.guestButtonText}>📍 Quận Gò Vấp (Quang Trung)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.guestButton, studentCoords.latitude === 10.8746 && { borderColor: theme.colors.student }]}
                  onPress={() => handleSelectLocation(10.8746, 106.8029, 'TP. Thủ Đức, TP.HCM')}
                >
                  <Text style={styles.guestButtonText}>📍 TP. Thủ Đức (Làng Đại học)</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  welcomeSection: {
    flex: 1,
    marginRight: 8,
  },
  welcomeGreeting: {
    fontFamily: 'System',
    fontSize: 20,
    fontWeight: '800',
    color: '#181C1E',
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: '#5A4136',
    opacity: 0.8,
    marginTop: 2,
  },
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '1A',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary + '33',
    maxWidth: 160,
  },
  gpsSymbol: {
    fontSize: 12,
    marginRight: 4,
  },
  gpsText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.primary,
    flexShrink: 1,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sliderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.student,
  },
  sliderTrackContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.sm,
    padding: 2,
    marginBottom: theme.spacing.md,
  },
  radiusOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  activeRadius: {
    backgroundColor: theme.colors.student,
  },
  radiusOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  activeRadiusText: {
    color: theme.colors.white,
  },
  viewToggle: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeToggle: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.student,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  activeToggleText: {
    color: theme.colors.student,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 110,
  },
  cardShadowContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  cardContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 20,
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoAndName: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopLogoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  shopLogoText: {
    fontSize: 15,
    fontWeight: '800',
  },
  shopRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#FDE68A',
  },
  shopRatingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    marginLeft: 2,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobTypeTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 4,
  },
  jobTypeTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  emergencyTag: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emergencyTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EF4444',
  },
  appliedStatusTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 4,
  },
  appliedStatusTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
  },
  approvedStatusTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 4,
  },
  approvedStatusTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
  },
  jobTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 4,
    lineHeight: 22,
  },
  shopSubtitleText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
  timeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  timeInfoText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  addressInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  addressInfoText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  salaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#EA580C',
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
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
    marginTop: 4,
  },
  mapContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
  radarCircleBig: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: theme.colors.student + '22',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    position: 'relative',
  },
  radarCircleMedium: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: theme.colors.student + '33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarCircleSmall: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: theme.colors.student + '44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.student,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  userEmoji: {
    fontSize: 11,
  },
  pin: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.student,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emergencyPin: {
    borderColor: theme.colors.danger,
  },
  pinIcon: {
    fontSize: 14,
  },
  pinLabel: {
    marginTop: 2,
    paddingHorizontal: 4,
  },
  pinLabelText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: theme.colors.text,
    maxWidth: 60,
  },
  radarTip: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 30 : theme.spacing.lg,
  },
  modalDragBar: {
    width: 40,
    height: 5,
    backgroundColor: theme.colors.border,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginVertical: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  modalShopName: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
  },
  modalScroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  modalEmergencyHeader: {
    backgroundColor: theme.colors.danger + '1A',
    borderColor: theme.colors.danger + '33',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  modalEmergencyText: {
    color: theme.colors.danger,
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalJobTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  modalPaySection: {
    backgroundColor: theme.colors.success + '0A',
    borderColor: theme.colors.success + '22',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  modalPayLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  modalPayValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  infoIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
    marginRight: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: 6,
  },
  descriptionBody: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: 4,
  },
  modalFooter: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalApplyBtn: {
    backgroundColor: theme.colors.student,
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.student,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  modalAppliedBtn: {
    backgroundColor: theme.colors.textLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  modalApprovedBtn: {
    backgroundColor: theme.colors.success,
    shadowOpacity: 0,
    elevation: 0,
  },
  modalApplyBtnText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  applyTip: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  closestShiftBanner: {
    backgroundColor: '#FF6B000F',
    borderColor: '#FF6B0022',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closestShiftBannerText: {
    fontSize: 12,
    color: '#5A4136',
    textAlign: 'center',
  },
  showAllBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.student,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  showAllBtnText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  /* Map View Mode Styles */
  mapViewContainer: {
    height: 520,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    position: 'relative',
    marginBottom: Platform.OS === 'ios' ? 100 : 90,
  },
  gpsFloatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#FF6B00',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 999,
  },
  gpsFloatingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mapImageBackground: {
    width: '100%',
    height: 460,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  mapEmptyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapEmptyText: {
    color: '#64748B',
    fontWeight: 'bold',
  },
  mapMarkerContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  mapPinDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  mapPinLabelContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  mapPinLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E293B',
    maxWidth: 110,
  },
  /* Top Unified Search Styles */
  topSearchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  searchBox: {
    flex: 1,
    height: 44,
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  filterBtn: {
    width: 72,
    height: 44,
    backgroundColor: '#FF6B00',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  filterBtnActive: {
    backgroundColor: '#C2410C',
  },
  filterBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterDrawer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 8,
    marginBottom: 4,
  },
  guestButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9EB',
    backgroundColor: '#FFFFFF',
  },
  guestButtonText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
  },
});
