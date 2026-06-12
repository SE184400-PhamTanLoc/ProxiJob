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
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';

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

const isValidAvatar = (url) => {
  if (!url) return false;
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.toLowerCase() === 'string' || trimmed.toLowerCase() === 'null' || trimmed === '') {
    return false;
  }
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/');
};

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
  const { reviews, shifts, user, setUser, showToast, studentCoords, setStudentCoords } = useContext(AppContext);
  const [profile, setProfile] = useState(null);
  const [profileExists, setProfileExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedLat, setSelectedLat] = useState(10.7769);
  const [selectedLng, setSelectedLng] = useState(106.7009);

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

      console.log('[StudentPortfolio] generated publicUrl:', publicUrl);

      const updatedProfileData = {
        phoneNumber: profile?.phoneNumber || '',
        avatarUrl: publicUrl,
        dateOfBirth: profile?.dateOfBirth || new Date().toISOString(),
        gender: profile?.gender || 'Nam',
        address: profile?.address || '',
        city: profile?.city || '',
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

      // Update the global user context so it updates the header immediately!
      const updatedUser = { ...user, avatarUrl: `${publicUrl.split('?')[0]}?t=${Date.now()}` };
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

  // Sync calendar date when form date changes
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
            // Synchronize with global user context if they differ
            if (user && user.avatarUrl !== data.avatarUrl) {
              const updatedUser = { ...user, avatarUrl: data.avatarUrl };
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
          } else {
            data.avatarUrl = '';
          }
        }
        console.log('[StudentPortfolio] profile data loaded:', data);
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
          // Ignore non-JSON or unrelated messages
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
    try {
      const query = `${addressText}${cityText ? ', ' + cityText : ''}, Viet Nam`;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, {
        headers: {
          'User-Agent': 'ProxiJobApp/1.0'
        }
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      }
    } catch (e) {
      console.log('Geocoding error:', e);
    }
    return null;
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      // Auto geocode address input if custom coords not explicitly picked
      if (form.address && form.address !== initialForm?.address) {
        const coords = await geocodeAddress(form.address, form.city);
        if (coords) {
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
      // Reverse geocode chosen coordinates to get a human-readable address
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${selectedLat}&lon=${selectedLng}&format=json`, {
        headers: {
          'User-Agent': 'ProxiJobApp/1.0'
        }
      });
      if (response.ok) {
        const data = await response.json();
        const displayName = data.display_name || '';
        const addressVal = data.address?.road || data.address?.suburb || data.address?.quarter || displayName.split(',')[0] || 'Địa chỉ chọn trên bản đồ';
        const cityVal = data.address?.city || data.address?.town || data.address?.state || 'TP. Hồ Chí Minh';
        
        setForm(prev => ({
          ...prev,
          address: addressVal,
          city: cityVal
        }));
      } else {
        setForm(prev => ({
          ...prev,
          address: `Tọa độ: ${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`,
          city: 'TP. Hồ Chí Minh'
        }));
      }
      
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
        city: 'TP. Hồ Chí Minh'
      }));
      setMapModalVisible(false);
      setTimeout(() => {
        setEditModalVisible(true);
      }, 400);
    } finally {
      setSaving(false);
    }
  };
  // Compute stats based on completed shifts
  const completedShifts = shifts.filter(s => s.status === 'completed');
  const totalCompletedShifts = completedShifts.length + (profile?.reviewCount || 12);
  const averageRating = profile?.reputationScore !== undefined ? profile.reputationScore.toFixed(1) : '4.9';

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
            ) : isValidAvatar(user?.avatarUrl) ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : isValidAvatar(profile?.avatarUrl) ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(profile?.fullName || user?.name)}</Text>
              </View>
            )}
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓</Text>
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
            <Text style={styles.editButtonText}>📝 Chỉnh sửa thông tin</Text>
          </TouchableOpacity>
        </View>

        {/* Reputation Stats Summary */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, theme.shadows.light]}>
            <Text style={styles.statValue}>⭐ {averageRating}</Text>
            <Text style={styles.statLabel}>Đánh giá trung bình</Text>
          </View>

          <View style={[styles.statBox, theme.shadows.light]}>
            <Text style={styles.statValue}>{totalCompletedShifts}</Text>
            <Text style={styles.statLabel}>Ca đã làm</Text>
          </View>

          <View style={[styles.statBox, theme.shadows.light]}>
            <Text style={styles.statValue}>{profile?.completionPercent !== undefined ? `${profile.completionPercent}%` : '100%'}</Text>
            <Text style={styles.statLabel}>Độ hoàn thiện HS</Text>
          </View>
        </View>

        {/* Contact & Personal Details Section */}
        <Text style={styles.sectionHeader}>Thông tin liên hệ & Cá nhân</Text>
        <View style={[styles.detailsCard, theme.shadows.light]}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>📞 Số điện thoại:</Text>
            <Text style={styles.detailValue}>{profile?.phoneNumber || 'Chưa cập nhật'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>🎂 Ngày sinh:</Text>
            <Text style={styles.detailValue}>{formatDateToDisplay(profile?.dateOfBirth)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>🚻 Giới tính:</Text>
            <Text style={styles.detailValue}>{profile?.gender || 'Chưa cập nhật'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>📍 Địa chỉ:</Text>
            <Text style={styles.detailValue}>{profile?.address ? `${profile.address}, ${profile.city || ''}` : 'Chưa cập nhật'}</Text>
          </View>
        </View>

        {/* Skills Section */}
        <Text style={styles.sectionHeader}>Kỹ năng nổi bật</Text>
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
        <Text style={styles.sectionHeader}>Đánh giá từ chủ quán ({reviews.length})</Text>
        <View style={styles.reviewsList}>
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <View key={review.id} style={[styles.reviewCard, theme.shadows.light]}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewAuthor}>{review.author}</Text>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>

                <View style={styles.starRow}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Text key={i} style={[
                      styles.star,
                      i < review.rating ? styles.starFilled : styles.starEmpty
                    ]}>
                      ★
                    </Text>
                  ))}
                </View>

                <Text style={styles.reviewComment}>"{review.comment}"</Text>
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
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
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
                  <Text style={styles.calendarIcon}>📅</Text>
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
                  <Text style={styles.dropdownIcon}>▾</Text>
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
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                    value={form.address}
                    onChangeText={(val) => setForm(prev => ({ ...prev, address: val }))}
                    placeholder="Nhập địa chỉ nhà"
                  />
                  <TouchableOpacity
                    style={styles.mapIconButton}
                    onPress={() => {
                      setSelectedLat(studentCoords?.latitude || 10.7769);
                      setSelectedLng(studentCoords?.longitude || 106.7009);
                      setEditModalVisible(false);
                      setTimeout(() => {
                        setMapModalVisible(true);
                      }, 400);
                    }}
                  >
                    <Text style={styles.mapIconButtonText}>📍 Bản đồ</Text>
                  </TouchableOpacity>
                </View>
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
                <Text style={styles.label}>Kỹ năng (Phân cách bằng dấu phẩy)</Text>
                <TextInput
                  style={styles.input}
                  value={form.skills}
                  onChangeText={(val) => setForm(prev => ({ ...prev, skills: val }))}
                  placeholder="Pha chế, Giao tiếp, Đúng giờ..."
                />
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

            {/* Calendar Picker Absolute Overlay inside modalContent */}
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
                      {/* Month / Year Nav Row */}
                      <View style={styles.calNavRow}>
                        {/* Month Nav */}
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

                        {/* Year Nav */}
                        <TouchableOpacity
                          style={styles.calYearBadge}
                          onPress={() => setShowYearList(true)}
                        >
                          <Text style={styles.calYearBadgeText}>Năm {calYear} ▾</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Weekdays Row */}
                      <View style={styles.calWeekdays}>
                        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
                          <Text key={i} style={styles.weekdayLabel}>{d}</Text>
                        ))}
                      </View>

                      {/* Days Grid */}
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
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
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
                      var map = L.map('map', { zoomControl: true }).setView([${selectedLat}, ${selectedLng}], 15);
                      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

                      var marker = L.marker([${selectedLat}, ${selectedLng}], {
                        draggable: true
                      }).addTo(map);

                      function sendCoords(lat, lng) {
                        var payload = JSON.stringify({ lat: lat, lng: lng });
                        if (window.ReactNativeWebView) {
                          window.ReactNativeWebView.postMessage(payload);
                        } else {
                          window.parent.postMessage(payload, '*');
                        }
                      }

                      map.on('click', function(e) {
                        marker.setLatLng(e.latlng);
                        sendCoords(e.latlng.lat, e.latlng.lng);
                      });

                      marker.on('dragend', function(e) {
                        var position = marker.getLatLng();
                        sendCoords(position.lat, position.lng);
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
                        var map = L.map('map', { zoomControl: true }).setView([${selectedLat}, ${selectedLng}], 15);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

                        var marker = L.marker([${selectedLat}, ${selectedLng}], {
                          draggable: true
                        }).addTo(map);

                        function sendCoords(lat, lng) {
                          var payload = JSON.stringify({ lat: lat, lng: lng });
                          if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(payload);
                          } else {
                            window.parent.postMessage(payload, '*');
                          }
                        }

                        map.on('click', function(e) {
                          marker.setLatLng(e.latlng);
                          sendCoords(e.latlng.lat, e.latlng.lng);
                        });

                        marker.on('dragend', function(e) {
                          var position = marker.getLatLng();
                          sendCoords(position.lat, position.lng);
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
          {(isValidAvatar(user?.avatarUrl) || isValidAvatar(profile?.avatarUrl)) && (
            <Image
              source={{ uri: isValidAvatar(user?.avatarUrl) ? user.avatarUrl : profile.avatarUrl }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
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
    paddingBottom: theme.spacing.xl,
  },
  profileHeaderCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing.sm,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.student + '1A',
    borderColor: theme.colors.student,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderColor: theme.colors.student,
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.student,
  },
  verifiedBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  verifiedText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  userRole: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
    marginBottom: theme.spacing.sm,
  },
  userBio: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    paddingHorizontal: theme.spacing.sm,
  },
  editButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.student + '15',
    borderColor: theme.colors.student,
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: theme.colors.student,
    fontSize: 13,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 9,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  detailsCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '50',
  },
  detailLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.lg,
  },
  skillBadge: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  featuredSkill: {
    backgroundColor: theme.colors.student + '1A',
    borderColor: theme.colors.student + '33',
  },
  skillText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  featuredSkillText: {
    color: theme.colors.student,
    fontWeight: 'bold',
  },
  reviewsList: {
    width: '100%',
  },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeText: {
    fontSize: 18,
    color: theme.colors.textMuted,
    padding: 4,
  },
  modalForm: {
    padding: theme.spacing.md,
  },
  formGroup: {
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: 10,
    fontSize: 13,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingBottom: Platform.OS === 'ios' ? 24 : theme.spacing.md,
  },
  btnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
  },
  btnCancelText: {
    color: theme.colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  btnSave: {
    backgroundColor: theme.colors.student,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaveDisabled: {
    backgroundColor: theme.colors.textLight,
    opacity: 0.6,
  },
  btnSaveText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
  // Gender Selector Styles
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  genderOption: {
    flex: 1,
    height: 40,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  genderOptionActive: {
    backgroundColor: theme.colors.student + '15',
    borderColor: theme.colors.student,
  },
  genderOptionText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  genderOptionActiveText: {
    color: theme.colors.student,
    fontWeight: 'bold',
  },

  // DatePicker styles
  datePickerBtn: {
    height: 46,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  datePickerBtnText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  calendarIcon: {
    fontSize: 16,
  },

  // Dropdown selector styles
  dropdownBtn: {
    height: 46,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dropdownBtnText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  dropdownIcon: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  dropdownList: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    marginTop: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemText: {
    fontSize: 13,
    color: theme.colors.text,
  },

  // Custom Calendar Styles
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
});

