import React, { useContext, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';
import { useShiftsQuery, usePayrollsQuery } from '../../hooks/queries';
import { Ionicons } from '@expo/vector-icons';

// TÍCH HỢP THƯ VIỆN ĐỊNH VỊ GPS PHẦN CỨNG CỦA EXPO
import * as Location from 'expo-location';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
import { getStudentProfileApi, updateStudentProfileApi, registerStudentProfileApi } from '../../api/studentApi';
import { supabase } from '../../db/dbConfig';
import * as ImagePicker from 'expo-image-picker';

const getInitials = (name) => {
  if (!name) return 'VA';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

import { getAvatarSource, isValidAvatar } from '../../utils/avatarHelper';

const formatDateToInput = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateToDisplay = (isoString) => {
  if (!isoString) return 'Chưa cập nhật';
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const GOOGLE_MAPS_API_KEY = 'CvNapWs3C3Vt7ZTRZf0uZliN9v3q8TBJKxd2CEcW';

const cleanAddress = (rawAddress) => {
  if (!rawAddress) return '';
  let cleaned = rawAddress.replace(/,\s*(Việt Nam|Vietnam)\s*$/i, '');
  cleaned = cleaned.replace(/,\s*\d{5,6}\b/g, '');
  return cleaned.trim();
};

const reverseGeocode = async (lat, lng) => {
  let addressVal = '';
  let cityVal = 'TP. Hồ Chí Minh';

  if (GOOGLE_MAPS_API_KEY) {
    try {
      const response = await fetch(
        `https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${GOOGLE_MAPS_API_KEY}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const result = data.results[0];
          addressVal = cleanAddress(result.formatted_address);

          if (result.address_components) {
            const cityComponent = result.address_components.find(comp =>
              comp.types && (comp.types.includes('administrative_area_level_1') || comp.types.includes('city'))
            );
            if (cityComponent) {
              cityVal = cityComponent.long_name;
            }
          }
          return { address: addressVal, city: cityVal };
        }
      }
    } catch (e) {
      console.log('Goong reverse geocoding error:', e);
    }
  }

  // Fallback to OSM Nominatim
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'ProxiJobApp/1.0' } }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.display_name) {
        addressVal = cleanAddress(data.display_name);
      } else {
        const road = data.address?.road || '';
        const suburb = data.address?.suburb || data.address?.quarter || '';
        const city = data.address?.city || data.address?.town || data.address?.state || '';
        addressVal = [road, suburb, city].filter(Boolean).join(', ');
      }
      cityVal = data.address?.city || data.address?.town || data.address?.state || 'TP. Hồ Chí Minh';
      return { address: addressVal, city: cityVal };
    }
  } catch (e) {
    console.log('OSM reverse geocoding error:', e);
  }

  return {
    address: `Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    city: 'TP. Hồ Chí Minh'
  };
};

const fetchGeocode = async (q) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'ProxiJobApp/1.0' } }
    );
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (err) {
    console.log('fetchGeocode error:', err);
  }
  return null;
};

const parseDateInput = (str) => {
  if (!str) return new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(str).toISOString();
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    return new Date(parts[2], parts[1] - 1, parts[0]).toISOString();
  }
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
};

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const lookup = new Uint8Array(256);
for (let i = 0; i < chars.length; i++) {
  lookup[chars.charCodeAt(i)] = i;
}

const decodeBase64ToArrayBuffer = (base64String) => {
  const cleaned = base64String.replace(/[^A-Za-z0-9+/=]/g, "");
  let bufferLength = cleaned.length * 0.75;
  let len = cleaned.length;
  let i;
  let p = 0;
  let encoded1, encoded2, encoded3, encoded4;

  if (cleaned[cleaned.length - 1] === '=') {
    bufferLength--;
    if (cleaned[cleaned.length - 2] === '=') {
      bufferLength--;
    }
  }

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);

  for (i = 0; i < len; i += 4) {
    encoded1 = lookup[cleaned.charCodeAt(i)];
    encoded2 = lookup[cleaned.charCodeAt(i + 1)];
    encoded3 = lookup[cleaned.charCodeAt(i + 2)];
    encoded4 = lookup[cleaned.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  return arrayBuffer;
};

export default function StudentPortfolio() {
  const { user, setUser, showToast, studentCoords, setStudentCoords } = useContext(AppContext);
  const { data: shifts = [] } = useShiftsQuery(user, studentCoords);
  const { data: payrolls = [] } = usePayrollsQuery(user);

  // Dynamic reviews mapped from real database payrolls rated by employers
  const reviews = (payrolls || [])
    .filter(p => (p.rating && p.rating > 0) || (p.Rating && p.Rating > 0))
    .map(p => ({
      id: p.id || p.Id,
      author: p.shopName || p.ShopName || 'Chủ cửa hàng ProxiJob',
      date: p.payDate || p.PayDate || 'Gần đây',
      rating: p.rating || p.Rating || 5,
      comment: p.comments || p.Comments || 'Làm việc tốt, thái độ phục vụ khách hàng tốt.'
    }));
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [profileExists, setProfileExists] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State phục vụ quét định vị thiết bị
  const [gpsScanning, setGpsScanning] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedLat, setSelectedLat] = useState(10.7769);
  const [selectedLng, setSelectedLng] = useState(106.7009);
  const [mapStartCoords, setMapStartCoords] = useState({ lat: 10.7769, lng: 106.7009 });

  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const [viewingAvatar, setViewingAvatar] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handlePickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setAvatarMenuVisible(false);
          Alert.alert('Quyền truy cập', 'Bạn cần cho phép truy cập thư viện ảnh để đổi ảnh đại diện.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType ? ImagePicker.MediaType.Images : 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      setAvatarMenuVisible(false);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const localUri = result.assets[0].uri;
        const base64Data = result.assets[0].base64;
        await handleUploadAvatar(localUri, base64Data);
      }
    } catch (error) {
      setAvatarMenuVisible(false);
      console.log('[StudentPortfolio] handlePickImage error:', error);
      Alert.alert('Lỗi', 'Không thể chọn hình ảnh.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setAvatarMenuVisible(false);
          Alert.alert('Quyền truy cập', 'Bạn cần cho phép truy cập camera để chụp ảnh đại diện.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaType ? ImagePicker.MediaType.Images : 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      setAvatarMenuVisible(false);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const localUri = result.assets[0].uri;
        const base64Data = result.assets[0].base64;
        await handleUploadAvatar(localUri, base64Data);
      }
    } catch (error) {
      setAvatarMenuVisible(false);
      console.log('[StudentPortfolio] handleTakePhoto error:', error);
      Alert.alert('Lỗi', 'Không thể chụp ảnh.');
    }
  };

  const handleUploadAvatar = async (localUri, base64Data) => {
    try {
      setUploadingAvatar(true);

      if (!base64Data) {
        throw new Error("Không thể lấy dữ liệu ảnh.");
      }

      const arrayBuffer = decodeBase64ToArrayBuffer(base64Data);
      const fileExt = localUri.split('.').pop() || 'jpg';
      const fileName = `avatar_${user?.id || 'guest'}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          upsert: true,
          contentType: `image/${fileExt}`
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const updatedProfileData = {
        phoneNumber: profile?.phoneNumber || '',
        avatarUrl: publicUrl,
        dateOfBirth: profile?.dateOfBirth || new Date().toISOString(),
        gender: profile?.gender || 'Nam',
        address: profile?.address || '',
        city: profile?.city || '',
        latitude: profile?.latitude || null,
        longitude: profile?.longitude || null,
        school: profile?.school || '',
        major: profile?.major || '',
        yearOfStudy: profile?.yearOfStudy || 1,
        bio: profile?.bio || '',
        skills: profile?.skills || '',
      };

      if (profileExists) {
        await updateStudentProfileApi(updatedProfileData);
      } else {
        await registerStudentProfileApi(updatedProfileData);
        setProfileExists(true);
      }

      const updatedUser = {
        ...user,
        avatarUrl: `${publicUrl.split('?')[0]}?t=${Date.now()}`,
        gender: updatedProfileData.gender
      };
      if (setUser) {
        setUser(updatedUser);
        const { saveAuthSession, getStoredToken, getStoredRefreshToken } = require('../../api/auth');
        const token = await getStoredToken();
        const refreshToken = await getStoredRefreshToken();
        await saveAuthSession(token, refreshToken, updatedUser);
      }

      await loadProfile();
      showToast('Cập nhật ảnh đại diện thành công!', 'success');
    } catch (err) {
      console.log('[StudentPortfolio] Upload avatar error:', err);
      Alert.alert('Lỗi', err.message || 'Không thể tải ảnh lên.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const [form, setForm] = useState({
    phoneNumber: '',
    avatarUrl: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    latitude: null,
    longitude: null,
    school: '',
    major: '',
    yearOfStudy: '0',
    bio: '',
    skills: '',
  });

  const [initialForm, setInitialForm] = useState(null);

  const hasChanges = () => {
    if (!initialForm) return false;
    return (
      form.phoneNumber !== initialForm.phoneNumber ||
      form.dateOfBirth !== initialForm.dateOfBirth ||
      form.gender !== initialForm.gender ||
      form.address !== initialForm.address ||
      form.city !== initialForm.city ||
      form.latitude !== initialForm.latitude ||
      form.longitude !== initialForm.longitude ||
      form.school !== initialForm.school ||
      form.major !== initialForm.major ||
      form.yearOfStudy !== initialForm.yearOfStudy ||
      form.bio !== initialForm.bio ||
      form.skills !== initialForm.skills
    );
  };

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calMonth, setCalMonth] = useState(0);
  const [calYear, setCalYear] = useState(2004);
  const [showYearList, setShowYearList] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);

  useEffect(() => {
    if (form.dateOfBirth) {
      const d = new Date(form.dateOfBirth);
      if (!isNaN(d.getTime())) {
        setCalMonth(d.getMonth());
        setCalYear(d.getFullYear());
      }
    }
  }, [form.dateOfBirth]);

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getVnFirstDayIndex = (month, year) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const renderCalendarDays = () => {
    const vnFirstDayIdx = getVnFirstDayIndex(calMonth, calYear);
    const totalDays = getDaysInMonth(calMonth, calYear);
    const cells = [];

    for (let i = 0; i < vnFirstDayIdx; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calDayCellEmpty} />);
    }

    for (let d = 1; d <= totalDays; d++) {
      let isSelected = false;
      if (form.dateOfBirth) {
        const dObj = new Date(form.dateOfBirth);
        isSelected = !isNaN(dObj.getTime()) &&
          dObj.getDate() === d &&
          dObj.getMonth() === calMonth &&
          dObj.getFullYear() === calYear;
      }

      cells.push(
        <TouchableOpacity
          key={`day-${d}`}
          style={[styles.calDayCell, isSelected && styles.calDayCellActive]}
          onPress={() => {
            const monthStr = String(calMonth + 1).padStart(2, '0');
            const dayStr = String(d).padStart(2, '0');
            const dateStr = `${calYear}-${monthStr}-${dayStr}`;
            setForm(prev => ({ ...prev, dateOfBirth: dateStr }));
            setCalendarVisible(false);
          }}
        >
          <Text style={[styles.calDayText, isSelected && styles.calDayTextActive]}>
            {d}
          </Text>
        </TouchableOpacity>
      );
    }

    return cells;
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getStudentProfileApi();
      if (data) {
        if (data.avatarUrl) {
          if (isValidAvatar(data.avatarUrl)) {
            data.avatarUrl = `${data.avatarUrl.split('?')[0]}?t=${Date.now()}`;
          } else {
            data.avatarUrl = '';
          }
        }

        if (user && (user.avatarUrl !== (data.avatarUrl || '') || user.gender !== data.gender)) {
          const updatedUser = { ...user, avatarUrl: data.avatarUrl || '', gender: data.gender };
          setUser(updatedUser);
          try {
            const { saveAuthSession, getStoredToken, getStoredRefreshToken } = require('../../api/auth');
            const token = await getStoredToken();
            const refreshToken = await getStoredRefreshToken();
            await saveAuthSession(token, refreshToken, updatedUser);
          } catch (e) {
            console.log('[StudentPortfolio] error saving auth session during sync:', e);
          }
        }
        if (data.latitude && data.longitude) {
          const coords = { latitude: data.latitude, longitude: data.longitude };
          await AsyncStorage.setItem('@student_custom_gps', JSON.stringify(coords));
          if (setStudentCoords) {
            setStudentCoords(coords);
          }
        }
        setProfile(data);
        setProfileExists(true);
      }
    } catch (err) {
      console.log('[StudentPortfolio] Error loading profile:', err.message);
      if (err.message.includes('404') || err.message.includes('not found') || err.message.includes('NotFound')) {
        setProfileExists(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleMessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.lat && data.lng) {
            setSelectedLat(data.lat);
            setSelectedLng(data.lng);
          }
        } catch (e) {
          // Ignore non-JSON
        }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, []);

  const openEditModal = () => {
    let initialValues;
    if (profile) {
      initialValues = {
        phoneNumber: profile.phoneNumber || '',
        avatarUrl: profile.avatarUrl || '',
        dateOfBirth: formatDateToInput(profile.dateOfBirth),
        gender: profile.gender || '',
        address: profile.address || '',
        city: profile.city || '',
        latitude: profile.latitude || null,
        longitude: profile.longitude || null,
        school: profile.school || '',
        major: profile.major || '',
        yearOfStudy: String(profile.yearOfStudy || 0),
        bio: profile.bio || '',
        skills: profile.skills || '',
      };
    } else {
      initialValues = {
        phoneNumber: '',
        avatarUrl: '',
        dateOfBirth: formatDateToInput(new Date()),
        gender: 'Nam',
        address: '',
        city: '',
        latitude: null,
        longitude: null,
        school: '',
        major: '',
        yearOfStudy: '1',
        bio: '',
        skills: '',
      };
    }
    setForm(initialValues);
    setInitialForm(initialValues);
    setEditModalVisible(true);
  };

  const geocodeAddress = async (addressText, cityText) => {
    const query = `${addressText}${cityText ? ', ' + cityText : ''}`;

    if (GOOGLE_MAPS_API_KEY) {
      try {
        const url = `https://rsapi.goong.io/Geocode?address=${encodeURIComponent(query)}&api_key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const loc = data.results[0].geometry.location;
            return {
              latitude: loc.lat,
              longitude: loc.lng
            };
          }
        }
      } catch (e) {
        console.log('Goong geocoding API error:', e);
      }
    }

    try {
      let cleaned = addressText.trim();
      cleaned = cleaned.replace(/^\d+([/.-]\d+)*[a-zA-Z]?\s+/, '');
      cleaned = cleaned.replace(/^(hẻm|ngõ|kiệt)\s+\d+([/.-]\d+)*[a-zA-Z]?\s+/, '');

      const fallbackQuery = `${cleaned}${cityText ? ', ' + cityText : ''}, Viet Nam`;
      let response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallbackQuery)}&format=json&limit=1`, {
        headers: {
          'User-Agent': 'ProxiJobApp/1.0'
        }
      });
      let data = await response.json().catch(() => []);
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      }

      const lower = addressText.toLowerCase();
      let fallbackQuery2 = '';
      if (lower.includes('trường thọ')) {
        fallbackQuery2 = 'Trường Thọ, Thủ Đức, Viet Nam';
      } else if (lower.includes('thủ đức')) {
        fallbackQuery2 = 'Thủ Đức, Viet Nam';
      } else {
        const parts = addressText.split(/[,.-]/);
        if (parts.length > 1) {
          fallbackQuery2 = `${parts[parts.length - 2].trim()}, ${parts[parts.length - 1].trim()}, Viet Nam`;
        }
      }

      if (fallbackQuery2) {
        response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallbackQuery2)}&format=json&limit=1`, {
          headers: {
            'User-Agent': 'ProxiJobApp/1.0'
          }
        });
        data = await response.json().catch(() => []);
        if (data && data.length > 0) {
          return {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon)
          };
        }
      }
    } catch (e) {
      console.log('OSM Geocoding error:', e);
    }
    return null;
  };

  const handleAddSkillTag = () => {
    const trimmedInput = skillInput.trim();
    if (!trimmedInput) return;

    // Check if tag already exists in comma separated string
    const currentSkills = form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (currentSkills.includes(trimmedInput)) {
      showToast('Kỹ năng này đã được thêm!', 'warning');
      return;
    }

    const updatedSkills = [...currentSkills, trimmedInput].join(', ');
    setForm(prev => ({ ...prev, skills: updatedSkills }));
    setSkillInput('');
  };

  const handleRemoveSkillTag = (skillToRemove) => {
    const currentSkills = form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    const updatedSkills = currentSkills.filter(s => s !== skillToRemove).join(', ');
    setForm(prev => ({ ...prev, skills: updatedSkills }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      let currentLat = form.latitude;
      let currentLng = form.longitude;

      if (form.address && form.address !== initialForm?.address && !form.latitude) {
        const coords = await geocodeAddress(form.address, form.city);
        if (coords) {
          currentLat = coords.latitude;
          currentLng = coords.longitude;
          await AsyncStorage.setItem('@student_custom_gps', JSON.stringify(coords));
          if (setStudentCoords) {
            setStudentCoords(coords);
          }
          showToast(`Đã tự động định vị: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`, 'success');
        }
      }

      const payload = {
        phoneNumber: form.phoneNumber,
        avatarUrl: form.avatarUrl,
        dateOfBirth: parseDateInput(form.dateOfBirth),
        gender: form.gender,
        address: form.address,
        city: form.city,
        latitude: currentLat,
        longitude: currentLng,
        school: form.school,
        major: form.major,
        yearOfStudy: parseInt(form.yearOfStudy, 10) || 0,
        bio: form.bio,
        skills: form.skills,
      };

      if (profileExists) {
        await updateStudentProfileApi(payload);
        showToast('Cập nhật hồ sơ thành công!', 'success');
      } else {
        await registerStudentProfileApi(payload);
        setProfileExists(true);
        showToast('Tạo hồ sơ thành công!', 'success');
      }
      await loadProfile();
      setEditModalVisible(false);
    } catch (err) {
      console.log('Error saving profile:', err);
      Alert.alert('Thất bại', err.message || 'Không thể lưu thông tin hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmMapLocation = async () => {
    try {
      setSaving(true);
      const { address: addressVal, city: cityVal } = await reverseGeocode(selectedLat, selectedLng);

      setForm(prev => ({
        ...prev,
        address: addressVal,
        city: cityVal,
        latitude: selectedLat,
        longitude: selectedLng
      }));

      const coords = { latitude: selectedLat, longitude: selectedLng };
      await AsyncStorage.setItem('@student_custom_gps', JSON.stringify(coords));
      if (setStudentCoords) {
        setStudentCoords(coords);
      }

      setMapModalVisible(false);
      setTimeout(() => {
        setEditModalVisible(true);
      }, 400);
      showToast('Đã định vị thành công vị trí của bạn!', 'success');
    } catch (e) {
      console.log('Reverse geocoding error:', e);
      setForm(prev => ({
        ...prev,
        address: `Tọa độ: ${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`,
        city: 'TP. Hồ Chí Minh',
        latitude: selectedLat,
        longitude: selectedLng
      }));
      setMapModalVisible(false);
      setTimeout(() => {
        setEditModalVisible(true);
      }, 400);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenMapPicker = async () => {
    let lat = form.latitude || studentCoords?.latitude || 10.7769;
    let lng = form.longitude || studentCoords?.longitude || 106.7009;

    setSelectedLat(lat);
    setSelectedLng(lng);
    setMapStartCoords({ lat, lng });
    setEditModalVisible(false);

    setTimeout(() => {
      setMapModalVisible(true);
    }, 400);
  };

  const handleGetCurrentGPSLocation = async () => {
    try {
      setGpsScanning(true);
      showToast('Đang quét GPS độ chính xác cao...', 'info');

      // 1. Hỏi xin quyền sử dụng định vị của thiết bị
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        showToast('Quyền định vị bị từ chối! Vui lòng cho phép trong cài đặt.', 'warning');
        return;
      }

      // 2. Ép phần cứng quét tọa độ thời gian thực
      const geoPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      if (geoPosition && geoPosition.coords) {
        const { latitude, longitude } = geoPosition.coords;
        console.log('[GPS Lấy vị trí hiện tại]:', latitude, longitude);

        // 3. Gọi reverse geocode để điền địa chỉ
        const { address: addressVal, city: cityVal } = await reverseGeocode(latitude, longitude);

        setForm(prev => ({
          ...prev,
          address: addressVal,
          city: cityVal,
          latitude: latitude,
          longitude: longitude
        }));

        setSelectedLat(latitude);
        setSelectedLng(longitude);
        setMapStartCoords({ lat: latitude, lng: longitude });

        const coords = { latitude, longitude };
        await AsyncStorage.setItem('@student_custom_gps', JSON.stringify(coords));
        if (setStudentCoords) {
          setStudentCoords(coords);
        }

        showToast('Đã lấy vị trí hiện tại và điền địa chỉ thành công!', 'success');
      } else {
        showToast('Không nhận được tín hiệu GPS từ thiết bị.', 'error');
      }
    } catch (error) {
      console.log('Error getting current GPS location:', error);
      showToast('Không lấy được vị trí GPS hiện tại.', 'error');
    } finally {
      setGpsScanning(false);
    }
  };

  const handleSearchAddress = async () => {
    if (!form.address) {
      showToast('Vui lòng nhập địa chỉ trước khi tìm kiếm!', 'warning');
      return;
    }
    try {
      setGpsScanning(true);
      showToast('Đang định vị địa chỉ của bạn...', 'info');
      const coords = await geocodeAddress(form.address, form.city);
      if (coords) {
        setForm(prev => ({
          ...prev,
          latitude: coords.latitude,
          longitude: coords.longitude
        }));
        setSelectedLat(coords.latitude);
        setSelectedLng(coords.longitude);
        setMapStartCoords({ lat: coords.latitude, lng: coords.longitude });

        // Save to AsyncStorage and update context coordinates
        const coordsObj = { latitude: coords.latitude, longitude: coords.longitude };
        await AsyncStorage.setItem('@student_custom_gps', JSON.stringify(coordsObj));
        if (setStudentCoords) {
          setStudentCoords(coordsObj);
        }

        showToast('Định vị địa chỉ thành công!', 'success');
      } else {
        showToast('Không tìm thấy tọa độ cho địa chỉ này. Vui lòng nhập chi tiết hơn.', 'error');
      }
    } catch (err) {
      console.log('Error geocoding typed address:', err);
      showToast('Lỗi khi định vị địa chỉ!', 'error');
    } finally {
      setGpsScanning(false);
    }
  };

  const handleAddressChange = async (text) => {
    setForm(prev => ({ ...prev, address: text }));
    if (text.length < 4) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setSuggestionsLoading(true);
      if (GOOGLE_MAPS_API_KEY) {
        const response = await fetch(
          `https://rsapi.goong.io/Place/AutoComplete?input=${encodeURIComponent(text)}&api_key=${GOOGLE_MAPS_API_KEY}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OK' && data.predictions) {
            const formatted = data.predictions.map(item => ({
              display_name: item.description,
              place_id: item.place_id,
              isGoogle: true
            }));
            setAddressSuggestions(formatted);
            setShowSuggestions(formatted.length > 0);
          }
        }
      } else {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5`,
          { headers: { 'User-Agent': 'ProxiJobApp/1.0' } }
        );
        if (response.ok) {
          const data = await response.json();
          const formatted = data.map(item => ({
            display_name: cleanAddress(item.display_name),
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon)
          }));
          setAddressSuggestions(formatted);
          setShowSuggestions(formatted.length > 0);
        }
      }
    } catch (e) {
      console.log('Suggestions fetch error:', e);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleSelectSuggestion = async (suggestion) => {
    let cityVal = form.city || 'TP. Hồ Chí Minh';
    const lowerAddr = suggestion.display_name.toLowerCase();
    if (lowerAddr.includes('hồ chí minh') || lowerAddr.includes('hcm')) {
      cityVal = 'Thành phố Hồ Chí Minh';
    } else if (lowerAddr.includes('hà nội')) {
      cityVal = 'Thành phố Hà Nội';
    } else if (lowerAddr.includes('đà nẵng')) {
      cityVal = 'Thành phố Đà Nẵng';
    } else if (lowerAddr.includes('bình dương')) {
      cityVal = 'Tỉnh Bình Dương';
    } else if (lowerAddr.includes('đồng nai')) {
      cityVal = 'Tỉnh Đồng Nai';
    }

    setForm(prev => ({
      ...prev,
      address: suggestion.display_name,
      city: cityVal
    }));
    setShowSuggestions(false);

    try {
      setGpsScanning(true);
      let lat = 0;
      let lon = 0;
      if (suggestion.isGoogle) {
        const response = await fetch(
          `https://rsapi.goong.io/Place/Detail?place_id=${suggestion.place_id}&api_key=${GOOGLE_MAPS_API_KEY}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OK' && data.result) {
            if (data.result.geometry?.location) {
              lat = data.result.geometry.location.lat;
              lon = data.result.geometry.location.lng;
            }
            if (data.result.address_components) {
              const cityComponent = data.result.address_components.find(comp => 
                comp.types && (comp.types.includes('administrative_area_level_1') || comp.types.includes('city'))
              );
              if (cityComponent) {
                cityVal = cityComponent.long_name;
              }
            }
          }
        }
      } else {
        lat = suggestion.lat;
        lon = suggestion.lon;
      }

      if (lat && lon) {
        setForm(prev => ({
          ...prev,
          city: cityVal,
          latitude: lat,
          longitude: lon
        }));
        setSelectedLat(lat);
        setSelectedLng(lon);
        setMapStartCoords({ lat, lng: lon });

        // Save to AsyncStorage and update context coordinates
        const coordsObj = { latitude: lat, longitude: lon };
        await AsyncStorage.setItem('@student_custom_gps', JSON.stringify(coordsObj));
        if (setStudentCoords) {
          setStudentCoords(coordsObj);
        }

        showToast('Đã chọn địa chỉ & lấy tọa độ thành công!', 'success');
      } else {
        showToast('Không lấy được tọa độ cho vị trí này.', 'warning');
      }
    } catch (err) {
      console.log('Select suggestion error:', err);
    } finally {
      setGpsScanning(false);
    }
  };

  const completedShifts = shifts.filter(s => s.status === 'completed');
  const totalCompletedShifts = completedShifts.length + (profile?.reviewCount || 12);
  const averageRating = profile?.reputationScore !== undefined ? profile.reputationScore.toFixed(1) : '4.9';

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.student]}
            tintColor={theme.colors.student}
          />
        }
      >
        {loading && (
          <View style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(255, 107, 0, 0.05)', borderRadius: 10, marginHorizontal: 16, marginBottom: 12 }}>
            <ActivityIndicator size="small" color={theme.colors.student} />
            <Text style={{ fontSize: 11, color: theme.colors.student, marginTop: 4, fontWeight: '600' }}>Đang đồng bộ hồ sơ...</Text>
          </View>
        )}

        {/* Profile Card Header */}
        <View style={[styles.profileHeaderCard, theme.shadows.light]}>
          <TouchableOpacity
            style={styles.avatarContainer}
            activeOpacity={0.85}
            onPress={() => setAvatarMenuVisible(true)}
          >
            {uploadingAvatar ? (
              <View style={[styles.avatarCircle, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="small" color={theme.colors.student} />
              </View>
            ) : (
              <Image
                source={getAvatarSource(user?.avatarUrl || profile?.avatarUrl, profile?.gender || user?.gender, profile?.fullName || user?.name)}
                style={styles.avatarImage}
              />
            )}
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{profile?.fullName || user?.name || 'Nguyễn Văn A'}</Text>
          <Text style={styles.userRole}>
            {profile?.school ? `Sinh viên ${profile.school}` : 'Sinh viên'}
            {profile?.major ? ` - Ngành ${profile.major}` : ''}
            {profile?.yearOfStudy ? ` (Năm ${profile.yearOfStudy})` : ''}
          </Text>
          <Text style={styles.userBio}>
            {profile?.bio || 'Chưa cập nhật giới thiệu bản thân. Hãy cập nhật để nhà tuyển dụng hiểu bạn hơn!'}
          </Text>

          <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
            <Ionicons name="create-outline" size={16} color="#FF6B00" style={{ marginRight: 6 }} />
            <Text style={styles.editButtonText}>Chỉnh sửa hồ sơ</Text>
          </TouchableOpacity>
        </View>

        {/* Reputation Stats Summary */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, styles.statBoxRating, theme.shadows.light]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="star" size={18} color="#EAB308" />
            </View>
            <Text style={styles.statValue}>{averageRating}</Text>
            <Text style={styles.statLabel}>Đánh giá</Text>
          </View>

          <View style={[styles.statBox, styles.statBoxShifts, theme.shadows.light]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="briefcase" size={18} color="#2563EB" />
            </View>
            <Text style={styles.statValue}>{totalCompletedShifts}</Text>
            <Text style={styles.statLabel}>Ca đã làm</Text>
          </View>

          <View style={[styles.statBox, styles.statBoxPercent, theme.shadows.light]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="ribbon" size={18} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{profile?.completionPercent !== undefined ? `${profile.completionPercent}%` : '100%'}</Text>
            <Text style={styles.statLabel}>Hoàn thiện HS</Text>
          </View>
        </View>

        {/* Contact & Personal Details Section */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="person-outline" size={18} color="#FF6B00" style={{ marginRight: 6 }} />
          <Text style={styles.sectionHeader}>Thông tin cá nhân</Text>
        </View>
        <View style={[styles.detailsCard, theme.shadows.light]}>
          <View style={styles.detailItem}>
            <View style={styles.detailLabelRow}>
              <Ionicons name="call-outline" size={16} color="#64748B" style={{ marginRight: 8 }} />
              <Text style={styles.detailLabel}>Số điện thoại</Text>
            </View>
            <Text style={styles.detailValue}>{profile?.phoneNumber || 'Chưa cập nhật'}</Text>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailLabelRow}>
              <Ionicons name="calendar-outline" size={16} color="#64748B" style={{ marginRight: 8 }} />
              <Text style={styles.detailLabel}>Ngày sinh</Text>
            </View>
            <Text style={styles.detailValue}>{formatDateToDisplay(profile?.dateOfBirth)}</Text>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailLabelRow}>
              <Ionicons name="male-female-outline" size={16} color="#64748B" style={{ marginRight: 8 }} />
              <Text style={styles.detailLabel}>Giới tính</Text>
            </View>
            <Text style={styles.detailValue}>{profile?.gender || 'Chưa cập nhật'}</Text>
          </View>

          <View style={[styles.detailItem, { borderBottomWidth: 0 }]}>
            <View style={styles.detailLabelRow}>
              <Ionicons name="location-outline" size={16} color="#64748B" style={{ marginRight: 8 }} />
              <Text style={styles.detailLabel}>Địa chỉ</Text>
            </View>
            <Text style={[styles.detailValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]} numberOfLines={2}>
              {profile?.address ? `${profile.address}, ${profile.city || ''}` : 'Chưa cập nhật'}
            </Text>
          </View>
        </View>

        {/* Skills Section */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="extension-puzzle-outline" size={18} color="#FF6B00" style={{ marginRight: 6 }} />
          <Text style={styles.sectionHeader}>Kỹ năng nổi bật</Text>
        </View>
        <View style={styles.skillsContainer}>
          {profile?.skills ? (
            profile.skills.split(',').map((skill, index) => (
              <View key={index} style={[styles.skillBadge, index === 0 && styles.featuredSkill]}>
                <Text style={[styles.skillText, index === 0 && styles.featuredSkillText]}>
                  {index === 0 ? '✨ ' + skill.trim() : skill.trim()}
                </Text>
              </View>
            ))
          ) : (
            ['Pha chế Latte', 'Chăm sóc khách hàng', 'Thao tác POS', 'Đúng giờ'].map((skill, index) => (
              <View key={index} style={styles.skillBadge}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))
          )}
        </View>

        {/* E-Portfolio Feedbacks */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="chatbubbles-outline" size={18} color="#FF6B00" style={{ marginRight: 6 }} />
          <Text style={styles.sectionHeader}>Đánh giá từ chủ quán ({reviews.length})</Text>
        </View>
        <View style={styles.reviewsList}>
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <View key={review.id} style={[styles.reviewCard, theme.shadows.light]}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerAvatar}>
                    <Text style={styles.reviewerAvatarText}>
                      {(review.author || 'Q').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.reviewAuthor}>{review.author}</Text>
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                  <View style={styles.starRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < review.rating ? "star" : "star-outline"}
                        size={14}
                        color="#EAB308"
                        style={{ marginRight: 2 }}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.reviewQuoteBg}>
                  <Text style={styles.reviewComment}>"{review.comment}"</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.reviewCard, { alignItems: 'center', paddingVertical: 20 }]}>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>Chưa có đánh giá nào.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{profileExists ? 'Chỉnh sửa hồ sơ' : 'Tạo hồ sơ năng lực'}</Text>
              <TouchableOpacity style={styles.closeBtnCircle} onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Số điện thoại</Text>
                <TextInput
                  style={styles.input}
                  value={form.phoneNumber}
                  onChangeText={(val) => setForm(prev => ({ ...prev, phoneNumber: val }))}
                  placeholder="Nhập số điện thoại"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Ngày sinh</Text>
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => setCalendarVisible(true)}
                >
                  <Text style={styles.datePickerBtnText}>
                    {form.dateOfBirth ? formatDateToDisplay(form.dateOfBirth) : 'Chọn ngày sinh...'}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Giới tính</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setShowGenderDropdown(prev => !prev)}
                >
                  <Text style={styles.dropdownBtnText}>
                    {form.gender || 'Chọn giới tính...'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#64748B" />
                </TouchableOpacity>

                {showGenderDropdown && (
                  <View style={styles.dropdownList}>
                    {['Nam', 'Nữ', 'Khác'].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setForm(prev => ({ ...prev, gender: g }));
                          setShowGenderDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Trường học</Text>
                <TextInput
                  style={styles.input}
                  value={form.school}
                  onChangeText={(val) => setForm(prev => ({ ...prev, school: val }))}
                  placeholder="Ví dụ: Đại học Bách Khoa"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Chuyên ngành</Text>
                <TextInput
                  style={styles.input}
                  value={form.major}
                  onChangeText={(val) => setForm(prev => ({ ...prev, major: val }))}
                  placeholder="Ví dụ: Công nghệ thông tin"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Năm học hiện tại</Text>
                <TextInput
                  style={styles.input}
                  value={form.yearOfStudy}
                  onChangeText={(val) => setForm(prev => ({ ...prev, yearOfStudy: val }))}
                  placeholder="Ví dụ: 2"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Địa chỉ</Text>
                <View style={{ position: 'relative', marginBottom: 12, zIndex: 10 }}>
                  <TextInput
                    style={[styles.input, { paddingRight: 105, marginBottom: 0 }]}
                    placeholder="Nhập địa chỉ hoặc nhấn nút GPS bên dưới..."
                    value={form.address}
                    onChangeText={handleAddressChange}
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: 7,
                      backgroundColor: '#64748B',
                      borderRadius: 10,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      height: 34,
                      justifyContent: 'center',
                    }}
                    disabled={gpsScanning}
                    onPress={handleSearchAddress}
                  >
                    {gpsScanning ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }}>Tìm Tọa Độ</Text>
                    )}
                  </TouchableOpacity>

                  {showSuggestions && (
                    <View style={{
                      position: 'absolute',
                      top: 48,
                      left: 0,
                      right: 0,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 4,
                      maxHeight: 200,
                      zIndex: 9999,
                    }}>
                      <ScrollView keyboardShouldPersistTaps="always">
                        {addressSuggestions.map((item, index) => (
                          <TouchableOpacity
                            key={index}
                            style={{
                              paddingVertical: 12,
                              paddingHorizontal: 16,
                              borderBottomWidth: index === addressSuggestions.length - 1 ? 0 : 1,
                              borderBottomColor: '#F1F5F9',
                            }}
                            onPress={() => handleSelectSuggestion(item)}
                          >
                            <Text style={{ fontSize: 13, color: '#334155', fontWeight: '500' }}>{item.display_name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Location Buttons Row */}
                <View style={styles.locationButtonsRow}>
                  <TouchableOpacity
                    style={[styles.gpsButton, { flex: 1, marginRight: 8, marginBottom: 0 }]}
                    onPress={handleGetCurrentGPSLocation}
                    disabled={gpsScanning}
                  >
                    {gpsScanning ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.gpsButtonText}>📍 GPS Hiện Tại</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.mapButton, { flex: 1 }]}
                    onPress={handleOpenMapPicker}
                  >
                    <Text style={styles.mapButtonText}>🗺 Bản Đồ</Text>
                  </TouchableOpacity>
                </View>

                {/* Coordinates */}
                {form.latitude && form.longitude ? (
                  <View style={styles.coordsRow}>
                    <View style={styles.coordBox}>
                      <Text style={styles.coordLabel}>Lat: {parseFloat(form.latitude).toFixed(6)}</Text>
                    </View>
                    <View style={styles.coordBox}>
                      <Text style={styles.coordLabel}>Long: {parseFloat(form.longitude).toFixed(6)}</Text>
                    </View>
                    <View style={[styles.coordBox, { backgroundColor: '#10B98120', borderColor: '#10B981', borderWidth: 1 }]}>
                      <Text style={[styles.coordLabel, { color: '#10B981' }]}>✓ GPS Đã kết nối</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.coordsRow}>
                    <View style={[styles.coordBox, { backgroundColor: '#EF444420', borderColor: '#EF4444', borderWidth: 1 }]}>
                      <Text style={[styles.coordLabel, { color: '#EF4444' }]}>⚠ Chưa có tọa độ GPS</Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Thành phố</Text>
                <TextInput
                  style={styles.input}
                  value={form.city}
                  onChangeText={(val) => setForm(prev => ({ ...prev, city: val }))}
                  placeholder="Ví dụ: TP. Hồ Chí Minh"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Mô tả bản thân (Bio)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.bio}
                  onChangeText={(val) => setForm(prev => ({ ...prev, bio: val }))}
                  placeholder="Giới thiệu ngắn gọn về bản thân bạn..."
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Kỹ năng</Text>
                <View style={styles.skillInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    value={skillInput}
                    onChangeText={setSkillInput}
                    placeholder="Nhập kỹ năng (ví dụ: Rửa chén)..."
                    onSubmitEditing={handleAddSkillTag}
                  />
                  <TouchableOpacity style={styles.btnAddSkillTag} onPress={handleAddSkillTag}>
                    <Ionicons name="add" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {/* Skill tag list */}
                <View style={styles.skillTagsWrapper}>
                  {form.skills ? (
                    form.skills.split(',').map(s => s.trim()).filter(Boolean).map((skill, index) => (
                      <View key={index} style={styles.skillTagBadge}>
                        <Text style={styles.skillTagText}>#{skill}</Text>
                        <TouchableOpacity onPress={() => handleRemoveSkillTag(skill)} style={styles.btnRemoveSkillTag}>
                          <Ionicons name="close" size={14} color="#94A3B8" />
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noSkillsText}>Chưa có kỹ năng nào được thêm.</Text>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.btnCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnSave, !hasChanges() && styles.btnSaveDisabled]}
                onPress={handleSaveProfile}
                disabled={saving || !hasChanges()}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnSaveText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Calendar Picker Absolute Overlay */}
            {calendarVisible && (
              <View style={styles.calOverlay}>
                <View style={styles.calContent}>
                  <View style={styles.calHeader}>
                    <Text style={styles.calTitle}>Chọn ngày sinh</Text>
                    <TouchableOpacity onPress={() => setCalendarVisible(false)}>
                      <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {showYearList ? (
                    <View style={{ height: 260 }}>
                      <Text style={styles.sectionSelectTitle}>Chọn năm sinh</Text>
                      <ScrollView contentContainerStyle={styles.yearListContainer} showsVerticalScrollIndicator={true}>
                        {Array.from({ length: 46 }, (_, i) => 1970 + i).map((y) => (
                          <TouchableOpacity
                            key={y}
                            style={[styles.yearItem, calYear === y && styles.yearItemActive]}
                            onPress={() => {
                              setCalYear(y);
                              setShowYearList(false);
                            }}
                          >
                            <Text style={[styles.yearItemText, calYear === y && styles.yearItemTextActive]}>
                              Năm {y}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  ) : (
                    <View>
                      <View style={styles.calNavRow}>
                        <View style={styles.calNavGroup}>
                          <TouchableOpacity
                            style={styles.calNavBtn}
                            onPress={() => {
                              if (calMonth === 0) {
                                setCalMonth(11);
                                setCalYear(prev => prev - 1);
                              } else {
                                setCalMonth(prev => prev - 1);
                              }
                            }}
                          >
                            <Text style={styles.calNavBtnText}>◀</Text>
                          </TouchableOpacity>
                          <Text style={styles.calNavLabel}>Tháng {calMonth + 1}</Text>
                          <TouchableOpacity
                            style={styles.calNavBtn}
                            onPress={() => {
                              if (calMonth === 11) {
                                setCalMonth(0);
                                setCalYear(prev => prev + 1);
                              } else {
                                setCalMonth(prev => prev + 1);
                              }
                            }}
                          >
                            <Text style={styles.calNavBtnText}>▶</Text>
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          style={styles.calYearBadge}
                          onPress={() => {
                            setShowYearList(true);
                          }}
                        >
                          <Text style={styles.calYearBadgeText}>Năm {calYear} ▾</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.calWeekdays}>
                        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
                          <Text key={i} style={styles.weekdayLabel}>{d}</Text>
                        ))}
                      </View>

                      <View style={styles.calDaysGrid}>
                        {renderCalendarDays()}
                      </View>
                    </View>
                  )}

                  <View style={styles.calFooter}>
                    <TouchableOpacity
                      style={styles.calCancelBtn}
                      onPress={() => setCalendarVisible(false)}
                    >
                      <Text style={styles.calCancelBtnText}>Hủy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Map Picker Modal */}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setMapModalVisible(false);
          setTimeout(() => {
            setEditModalVisible(true);
          }, 400);
        }}
      >
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={["top", "left", "right", "bottom"]}>
            <View style={{
              height: 56,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E9EB'
            }}>
              <TouchableOpacity
                onPress={() => {
                  setMapModalVisible(false);
                  setTimeout(() => {
                    setEditModalVisible(true);
                  }, 400);
                }}
                style={{ padding: 8 }}
              >
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.textMuted }}>Hủy</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.text }}>📍 Định vị trên bản đồ</Text>
              <TouchableOpacity onPress={handleConfirmMapLocation} style={{ padding: 8, backgroundColor: theme.colors.student, borderRadius: 8, paddingHorizontal: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' }}>Xác nhận</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, position: 'relative' }}>
              {Platform.OS === 'web' ? (
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                      <style>
                        body { margin: 0; padding: 0; }
                        #map { height: 100vh; width: 100vw; }
                      </style>
                    </head>
                    <body>
                      <div id="map"></div>
                      <script>
                        var map = L.map('map', { zoomControl: true, tap: false }).setView([${mapStartCoords.lat}, ${mapStartCoords.lng}], 15);
                        L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { attribution: 'Google Maps' }).addTo(map);

                        var marker = L.marker(map.getCenter()).addTo(map);

                        function sendCoords(lat, lng) {
                          var payload = JSON.stringify({ lat: lat, lng: lng });
                          if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(payload);
                          } else {
                            window.parent.postMessage(payload, '*');
                          }
                        }

                        map.on('move', function() {
                          marker.setLatLng(map.getCenter());
                        });

                        map.on('moveend', function() {
                          var center = map.getCenter();
                          sendCoords(center.lat, center.lng);
                        });

                        map.on('click', function(e) {
                          map.panTo(e.latlng);
                        });
                      </script>
                    </body>
                    </html>
                  `}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Bản đồ chọn vị trí"
                />
              ) : (
                <WebView
                  originWhitelist={['*']}
                  source={{
                    html: `
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                        <style>
                          body { margin: 0; padding: 0; }
                          #map { height: 100vh; width: 100vw; }
                        </style>
                      </head>
                      <body>
                        <div id="map"></div>
                        <script>
                          var map = L.map('map', { zoomControl: true, tap: false }).setView([${mapStartCoords.lat}, ${mapStartCoords.lng}], 15);
                          L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { attribution: 'Google Maps' }).addTo(map);

                          var marker = L.marker(map.getCenter()).addTo(map);

                          function sendCoords(lat, lng) {
                            var payload = JSON.stringify({ lat: lat, lng: lng });
                            if (window.ReactNativeWebView) {
                              window.ReactNativeWebView.postMessage(payload);
                            } else {
                              window.parent.postMessage(payload, '*');
                            }
                          }

                          map.on('move', function() {
                            marker.setLatLng(map.getCenter());
                          });

                          map.on('moveend', function() {
                            var center = map.getCenter();
                            sendCoords(center.lat, center.lng);
                          });

                          map.on('click', function(e) {
                            map.panTo(e.latlng);
                          });
                        </script>
                      </body>
                      </html>
                    `
                  }}
                  onMessage={(event) => {
                    try {
                      const data = JSON.parse(event.nativeEvent.data);
                      if (data.lat && data.lng) {
                        setSelectedLat(data.lat);
                        setSelectedLng(data.lng);
                      }
                    } catch (e) {
                      console.log('Error parsing map webview message:', e);
                    }
                  }}
                  style={{ flex: 1 }}
                />
              )}
              <View style={{
                position: 'absolute',
                bottom: 20,
                left: 20,
                right: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E5E9EB',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 4
              }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.colors.student }}>Di chuyển bản đồ hoặc kéo ghim đến đúng vị trí của bạn</Text>
                <Text style={{ fontSize: 10, color: theme.colors.textMuted, marginTop: 4 }}>
                  Tọa độ hiện tại: {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
                </Text>
              </View>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      {/* Menu lua chon Avatar */}
      <Modal
        visible={avatarMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAvatarMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.avatarMenuOverlay}
          activeOpacity={1}
          onPress={() => setAvatarMenuVisible(false)}
        >
          <View style={styles.avatarMenuContent}>
            <Text style={styles.avatarMenuTitle}>Ảnh đại diện</Text>

            {(isValidAvatar(user?.avatarUrl) || isValidAvatar(profile?.avatarUrl)) && (
              <TouchableOpacity
                style={styles.avatarMenuItem}
                onPress={() => {
                  setAvatarMenuVisible(false);
                  setTimeout(() => {
                    setViewingAvatar(true);
                  }, 400);
                }}
              >
                <Text style={styles.avatarMenuItemText}>👁️ Xem ảnh đại diện</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.avatarMenuItem}
              onPress={() => {
                handleTakePhoto();
              }}
            >
              <Text style={styles.avatarMenuItemText}>📷 Chụp ảnh mới</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarMenuItem}
              onPress={() => {
                handlePickImage();
              }}
            >
              <Text style={styles.avatarMenuItemText}>🖼️ Chọn ảnh từ thư viện</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.avatarMenuItem, styles.avatarMenuCancel]}
              onPress={() => setAvatarMenuVisible(false)}
            >
              <Text style={styles.avatarMenuCancelText}>Hủy bỏ</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Xem Anh Full Screen */}
      <Modal
        visible={viewingAvatar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingAvatar(false)}
      >
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity
            style={styles.closeFullscreenBtn}
            onPress={() => setViewingAvatar(false)}
          >
            <Text style={styles.closeFullscreenText}>✕ Đóng</Text>
          </TouchableOpacity>
          <Image
            source={getAvatarSource(user?.avatarUrl || profile?.avatarUrl, profile?.gender || user?.gender, profile?.fullName || user?.name)}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 110,
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
    zIndex: 2,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FF6B001A',
    borderColor: '#FF6B00',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderColor: '#FFFFFF',
    borderWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  verifiedBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6', // Blue verification badge
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  userRole: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  userBio: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
    paddingHorizontal: 12,
    fontStyle: 'italic',
  },
  editButton: {
    marginTop: 20,
    backgroundColor: '#FF6B0010',
    borderColor: '#FF6B0030',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#FF6B00',
    fontSize: 13,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  statBoxRating: {
    borderLeftWidth: 4,
    borderLeftColor: '#EAB308',
  },
  statBoxShifts: {
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  statBoxPercent: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '700',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  skillBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featuredSkill: {
    backgroundColor: '#FF6B0010',
    borderColor: '#FF6B0025',
  },
  skillText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  featuredSkillText: {
    color: '#FF6B00',
    fontWeight: '700',
  },
  reviewsList: {
    width: '100%',
    marginBottom: 20,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewAuthor: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  reviewDate: {
    fontSize: 11,
    color: theme.colors.textLight,
  },
  starRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  star: {
    fontSize: 14,
    marginRight: 2,
  },
  starFilled: {
    color: theme.colors.warning,
  },
  starEmpty: {
    color: theme.colors.border,
  },
  reviewComment: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  closeBtnCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 18,
    color: theme.colors.textMuted,
    padding: 4,
  },
  modalForm: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  btnCancel: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginRight: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCancelText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  btnSave: {
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  btnSaveDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  genderOption: {
    flex: 1,
    height: 44,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  genderOptionActive: {
    backgroundColor: '#FF6B0015',
    borderColor: '#FF6B00',
  },
  genderOptionText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  genderOptionActiveText: {
    color: '#FF6B00',
    fontWeight: 'bold',
  },
  datePickerBtn: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerBtnText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  calendarIcon: {
    fontSize: 16,
  },
  dropdownBtn: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownBtnText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  dropdownIcon: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#1E293B',
  },
  calOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  calContent: {
    width: 320,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  calTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  sectionSelectTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  yearListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  yearItem: {
    width: '30%',
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    alignItems: 'center',
    marginVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  yearItemActive: {
    backgroundColor: theme.colors.student,
    borderColor: theme.colors.student,
  },
  yearItemText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  yearItemTextActive: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  calNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    padding: 6,
    borderRadius: 8,
  },
  calNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calNavBtn: {
    padding: 6,
    backgroundColor: theme.colors.white,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  calNavBtnText: {
    fontSize: 10,
    color: theme.colors.text,
  },
  calNavLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginHorizontal: 8,
    minWidth: 65,
    textAlign: 'center',
  },
  calYearBadge: {
    backgroundColor: theme.colors.student + '15',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  calYearBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.student,
  },
  calWeekdays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekdayLabel: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.textLight,
  },
  calDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calDayCell: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 1,
  },
  calDayCellEmpty: {
    width: 38,
    height: 38,
  },
  calDayCellActive: {
    backgroundColor: theme.colors.student,
    borderRadius: 19,
  },
  calDayText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  calDayTextActive: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  calFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  calCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  calCancelBtnText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
  },
  avatarMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  avatarMenuContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : theme.spacing.lg,
  },
  avatarMenuTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarMenuItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatarMenuItemText: {
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  avatarMenuCancel: {
    marginTop: 10,
    borderBottomWidth: 0,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  avatarMenuCancelText: {
    fontSize: 14,
    color: theme.colors.danger,
    textAlign: 'center',
    fontWeight: '700',
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullscreenBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    zIndex: 999,
  },
  closeFullscreenText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  fullscreenImage: {
    width: screenWidth,
    height: screenHeight - 120,
    resizeMode: 'contain',
  },
  mapIconButton: {
    backgroundColor: '#FF6B001F',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FF6B0033',
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
  },
  mapIconButtonText: {
    color: '#FF6B00',
    fontSize: 12,
    fontWeight: 'bold',
  },
  locationButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gpsButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  gpsButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  mapButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  coordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  coordBox: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
    marginRight: 8,
    marginBottom: 8,
  },
  coordLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
  },
  skillInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  btnAddSkillTag: {
    backgroundColor: '#FF6B00',
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  skillTagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  skillTagBadge: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFD8A8',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  skillTagText: {
    color: '#D9480F',
    fontSize: 13,
    fontWeight: '600',
  },
  btnRemoveSkillTag: {
    marginLeft: 6,
    padding: 2,
  },
  noSkillsText: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
  },
});