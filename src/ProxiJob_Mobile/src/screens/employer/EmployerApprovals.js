import React, { useState, useContext, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';
import { getCategoriesApi, getSkillsApi, getJobPostById } from '../../api/jobs';
import { useEmployerJobsQuery, useDeleteJobPostMutation, useUpdateJobPostWizardMutation, useHandleLeaveRequestMutation } from '../../hooks/queries';
import { Ionicons } from '@expo/vector-icons';

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

const GOOGLE_MAPS_API_KEY = 'CvNapWs3C3Vt7ZTRZf0uZliN9v3q8TBJKxd2CEcW';

const cleanAddress = (rawAddress) => {
  if (!rawAddress) return '';
  let cleaned = rawAddress.replace(/,\s*(Việt Nam|Vietnam)\s*$/i, '');
  cleaned = cleaned.replace(/,\s*\d{5,6}\b/g, '');
  return cleaned.trim();
};

const reverseGeocode = async (lat, lng) => {
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const response = await fetch(
        `https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${GOOGLE_MAPS_API_KEY}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          return cleanAddress(data.results[0].formatted_address);
        }
      }
    } catch (e) {
      console.log('Goong reverse geocoding error:', e);
    }
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'ProxiJobApp/1.0' } }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.display_name) {
        return cleanAddress(data.display_name);
      }
      const road = data.address?.road || '';
      const suburb = data.address?.suburb || data.address?.quarter || '';
      const city = data.address?.city || data.address?.town || data.address?.state || '';
      return [road, suburb, city].filter(Boolean).join(', ');
    }
  } catch (e) {
    console.log('OSM reverse geocoding error:', e);
  }
  return '';
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

const geocodeAddressWithFallback = async (queryText) => {
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const url = `https://rsapi.goong.io/Geocode?address=${encodeURIComponent(queryText)}&api_key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          return {
            data: [{
              lat: loc.lat,
              lon: loc.lng,
              display_name: cleanAddress(data.results[0].formatted_address)
            }],
            isFallback: false
          };
        }
      }
    } catch (e) {
      console.log('Goong geocoding API error:', e);
    }
  }

  let data = await fetchGeocode(queryText);
  if (data && data.length > 0) {
    return { data, isFallback: false };
  }

  let simplified = queryText
    .replace(/^\s*(số|so)?\s*\d+(\/\d+)*\s*/i, '')
    .replace(/,\s*(khu phố|kp|tổ|to|hẻm|hem)\s*\d+/gi, '')
    .replace(/,\s*(khu phố|kp|tổ|to|hẻm|hem)\s+[a-zA-Z0-9_.-]+/gi, '');

  simplified = simplified.trim();
  if (simplified && simplified !== queryText) {
    data = await fetchGeocode(simplified);
    if (data && data.length > 0) {
      return { data, isFallback: true, fallbackText: simplified };
    }
  }

  const parts = queryText.split(',').map(p => p.trim()).filter(Boolean);
  for (let i = 1; i < parts.length; i++) {
    const fallbackQuery = parts.slice(i).join(', ');
    if (fallbackQuery.length > 5) {
      data = await fetchGeocode(fallbackQuery);
      if (data && data.length > 0) {
        return { data, isFallback: true, fallbackText: fallbackQuery };
      }
    }
  }

  return null;
};

export default function EmployerApprovals() {
  const {
    navigateTo,
    showToast,
    user
  } = useContext(AppContext);

  // TanStack Query
  const { data: employerData = { shifts: [], leaveRequests: [], employerJobs: [] }, isLoading, refetch } = useEmployerJobsQuery(user);
  const rawShifts = employerData.shifts || [];
  const leaveRequests = employerData.leaveRequests || [];

  // Find the absolute newest creation date in rawShifts
  const dates = rawShifts
    .map(s => s.createdAt && typeof s.createdAt === 'string' ? s.createdAt.split('T')[0] : '')
    .filter(Boolean);
  const newestDate = dates.length > 0 ? dates.sort().reverse()[0] : '';

  // Helper to sort shifts:
  // - Emergency shifts on the newest date go to the absolute top.
  // - Otherwise, sort by date descending (newest date first).
  // - If same date, and it is the newest date, prioritize emergency shifts.
  // - Otherwise, sort by creation time descending.
  const compareShifts = (a, b) => {
    const dateA = a.createdAt && typeof a.createdAt === 'string' ? a.createdAt.split('T')[0] : '';
    const dateB = b.createdAt && typeof b.createdAt === 'string' ? b.createdAt.split('T')[0] : '';

    const isNewestEmergencyA = a.isEmergency && dateA === newestDate;
    const isNewestEmergencyB = b.isEmergency && dateB === newestDate;

    if (isNewestEmergencyA && !isNewestEmergencyB) return -1;
    if (!isNewestEmergencyA && isNewestEmergencyB) return 1;

    if (dateA !== dateB) {
      return dateB.localeCompare(dateA);
    }

    if (dateA === newestDate) {
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
    }

    const timeA = new Date(a.createdAt || a.startTime || 0).getTime();
    const timeB = new Date(b.createdAt || b.startTime || 0).getTime();
    return timeB - timeA;
  };

  const shifts = [...rawShifts].sort(compareShifts);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSegment, shifts.length]);

  const totalPages = Math.ceil(shifts.length / ITEMS_PER_PAGE);
  const paginatedShifts = shifts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Mutations
  const deleteJobPostMutation = useDeleteJobPostMutation(user, showToast);
  const updateJobPostWizardMutation = useUpdateJobPostWizardMutation(user, showToast);
  const handleLeaveRequestMutation = useHandleLeaveRequestMutation(user, showToast);

  const [activeSegment, setActiveSegment] = useState('job_posts'); // 'job_posts' | 'leaves'

  // Categories & Skills local states
  const [categories, setCategories] = useState([
    { id: 1, name: 'Giao hàng' },
    { id: 2, name: 'Dịch vụ thú cưng' },
    { id: 3, name: 'Gia sư' },
    { id: 4, name: 'Sửa chữa' },
    { id: 5, name: 'Phục vụ' },
    { id: 6, name: 'Khác' }
  ]);
  const [skillsList, setSkillsList] = useState([{ id: 'other_skill_trigger', name: 'Khác...' }]);

  // Edit Modal States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('5');
  const [editCustomCategory, setEditCustomCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRequirements, setEditRequirements] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLatitude, setEditLatitude] = useState('');
  const [editLongitude, setEditLongitude] = useState('');
  const [editSelectedSkills, setEditSelectedSkills] = useState([]);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [showCustomSkillInput, setShowCustomSkillInput] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedLat, setSelectedLat] = useState(10.7769);
  const [selectedLng, setSelectedLng] = useState(106.7009);
  const [mapInitLat, setMapInitLat] = useState(10.7769);
  const [mapInitLng, setMapInitLng] = useState(106.7009);

  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const webviewRef = React.useRef(null);

  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const [mapSuggestions, setMapSuggestions] = useState([]);
  const [showMapSuggestions, setShowMapSuggestions] = useState(false);

  // Lắng nghe postMessage trên web (nếu có preview/web environment)
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
          // Bỏ qua tin nhắn không liên quan
        }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, []);

  // GPS: Lấy vị trí hiện tại của thiết bị
  const getCurrentLocation = async () => {
    try {
      setGpsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Bạn cần cấp quyền truy cập vị trí để sử dụng tính năng này!', 'warning');
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      setEditLatitude(lat.toString());
      setEditLongitude(lng.toString());

      // Reverse geocode để lấy địa chỉ
      try {
        const displayAddress = await reverseGeocode(lat, lng);
        if (displayAddress) {
          setEditAddress(displayAddress);
        }
      } catch (geoErr) {
        console.log('Reverse geocoding error:', geoErr);
      }

      showToast(`Đã lấy vị trí GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`, 'success');
    } catch (err) {
      console.log('GPS error:', err);
      showToast('Không thể lấy vị trí GPS. Vui lòng thử lại hoặc nhập thủ công.', 'error');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleOpenMapPicker = () => {
    const initialLat = parseFloat(editLatitude) || 10.7769;
    const initialLng = parseFloat(editLongitude) || 106.7009;
    setSelectedLat(initialLat);
    setSelectedLng(initialLng);
    setMapInitLat(initialLat);
    setMapInitLng(initialLng);
    setMapModalVisible(true);
  };

  const handleConfirmMapLocation = async () => {
    try {
      setEditLatitude(selectedLat.toString());
      setEditLongitude(selectedLng.toString());

      const displayAddress = await reverseGeocode(selectedLat, selectedLng);
      setEditAddress(displayAddress || `Tọa độ: ${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`);
      showToast('Đã định vị vị trí công việc thành công!', 'success');
    } catch (e) {
      console.log('Reverse geocoding error:', e);
      setEditAddress(`Tọa độ: ${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`);
    } finally {
      setMapModalVisible(false);
    }
  };

  const handleMapSearch = async () => {
    if (!mapSearchQuery.trim()) {
      showToast('Vui lòng nhập địa chỉ cần tìm!', 'warning');
      return;
    }
    try {
      setSearchLoading(true);
      const result = await geocodeAddressWithFallback(mapSearchQuery);
      if (result && result.data && result.data.length > 0) {
        const lat = parseFloat(result.data[0].lat);
        const lon = parseFloat(result.data[0].lon);
        setSelectedLat(lat);
        setSelectedLng(lon);

        // Smoothly update native map webview
        const jsCode = `
          if (typeof map !== 'undefined' && typeof marker !== 'undefined') {
            map.setView([${lat}, ${lon}], 15);
            marker.setLatLng([${lat}, ${lon}]);
          }
          true;
        `;
        if (webviewRef.current) {
          webviewRef.current.injectJavaScript(jsCode);
        }

        if (result.isFallback) {
          showToast(`Định vị theo khu vực: ${result.fallbackText}. Hãy kéo ghim bản đồ về số nhà cụ thể!`, 'info');
        } else {
          showToast('Đã định vị đến địa chỉ tìm kiếm!', 'success');
        }
      } else {
        showToast('Không tìm thấy địa chỉ này. Hãy thử lược bỏ bớt ngõ/hẻm hoặc số nhà.', 'warning');
      }
    } catch (e) {
      console.log('Forward geocoding error:', e);
      showToast('Lỗi kết nối khi tìm kiếm địa chỉ.', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  const geocodeTypedAddress = async () => {
    if (!editAddress.trim()) {
      showToast('Vui lòng nhập địa chỉ để tìm tọa độ!', 'warning');
      return;
    }
    try {
      setGpsLoading(true);
      const result = await geocodeAddressWithFallback(editAddress);
      if (result && result.data && result.data.length > 0) {
        const lat = parseFloat(result.data[0].lat);
        const lon = parseFloat(result.data[0].lon);
        setEditLatitude(lat.toString());
        setEditLongitude(lon.toString());
        setSelectedLat(lat);
        setSelectedLng(lon);

        if (result.data[0].display_name && !result.isFallback) {
          setEditAddress(cleanAddress(result.data[0].display_name));
        }

        if (result.isFallback) {
          showToast(`Tìm thấy tọa độ khu vực lân cận! Hãy mở Bản đồ để kéo ghim vào đúng vị trí số nhà.`, 'info');
        } else {
          showToast('Đã xác thực địa chỉ & lấy tọa độ thành công!', 'success');
        }
      } else {
        showToast('Không tìm thấy tọa độ. Hãy thử lược bỏ bớt số nhà/hẻm hoặc mở Bản đồ để chọn.', 'warning');
      }
    } catch (e) {
      console.log('Geocoding error:', e);
      showToast('Lỗi kết nối khi xác thực địa chỉ.', 'error');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleAddressChange = async (text) => {
    setEditAddress(text);
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
    setEditAddress(suggestion.display_name);
    setShowSuggestions(false);

    try {
      setGpsLoading(true);
      let lat = 0;
      let lon = 0;
      if (suggestion.isGoogle) {
        const response = await fetch(
          `https://rsapi.goong.io/Place/Detail?place_id=${suggestion.place_id}&api_key=${GOOGLE_MAPS_API_KEY}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OK' && data.result?.geometry?.location) {
            lat = data.result.geometry.location.lat;
            lon = data.result.geometry.location.lng;
          }
        }
      } else {
        lat = suggestion.lat;
        lon = suggestion.lon;
      }

      if (lat && lon) {
        setEditLatitude(lat.toString());
        setEditLongitude(lon.toString());
        setSelectedLat(lat);
        setSelectedLng(lon);
        showToast('Đã chọn địa chỉ & lấy tọa độ thành công!', 'success');
      } else {
        showToast('Không lấy được tọa độ cho vị trí này.', 'warning');
      }
    } catch (err) {
      console.log('Select suggestion error:', err);
    } finally {
      setGpsLoading(false);
    }
  };

  const handleMapSearchChange = async (text) => {
    setMapSearchQuery(text);
    if (text.length < 4) {
      setMapSuggestions([]);
      setShowMapSuggestions(false);
      return;
    }
    try {
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
            setMapSuggestions(formatted);
            setShowMapSuggestions(formatted.length > 0);
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
          setMapSuggestions(formatted);
          setShowMapSuggestions(formatted.length > 0);
        }
      }
    } catch (e) {
      console.log('Map suggestions fetch error:', e);
    }
  };

  const handleSelectMapSuggestion = async (suggestion) => {
    setMapSearchQuery(suggestion.display_name);
    setShowMapSuggestions(false);

    try {
      setSearchLoading(true);
      let lat = 0;
      let lon = 0;
      if (suggestion.isGoogle) {
        const response = await fetch(
          `https://rsapi.goong.io/Place/Detail?place_id=${suggestion.place_id}&api_key=${GOOGLE_MAPS_API_KEY}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OK' && data.result?.geometry?.location) {
            lat = data.result.geometry.location.lat;
            lon = data.result.geometry.location.lng;
          }
        }
      } else {
        lat = suggestion.lat;
        lon = suggestion.lon;
      }

      if (lat && lon) {
        setSelectedLat(lat);
        setSelectedLng(lon);

        // Smoothly update native map webview
        const jsCode = `
          if (typeof map !== 'undefined' && typeof marker !== 'undefined') {
            map.setView([${lat}, ${lon}], 15);
            marker.setLatLng([${lat}, ${lon}]);
          }
          true;
        `;
        if (webviewRef.current) {
          webviewRef.current.injectJavaScript(jsCode);
        }
        showToast('Đã định vị đến địa chỉ đã chọn!', 'success');
      } else {
        showToast('Không lấy được tọa độ cho vị trí này.', 'warning');
      }
    } catch (err) {
      console.log('Select map suggestion error:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Delete Modal States
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingShift, setDeletingShift] = useState(null);
  const [deletingJob, setDeletingJob] = useState(false);

  useEffect(() => {
    // Fetch categories and skills from backend
    getCategoriesApi().then(res => {
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.items || []));
      if (list.length > 0) setCategories(list);
    }).catch(e => console.log('Error loading categories in approvals:', e));

    getSkillsApi().then(res => {
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (res?.items || []));
      if (list) {
        setSkillsList([...list, { id: 'other_skill_trigger', name: 'Khác...' }]);
      }
    }).catch(e => console.log('Error loading skills in approvals:', e));
  }, []);

  // Handle Delete Press
  const handleDeletePress = (shift) => {
    setDeletingShift(shift);
    setDeleteModalVisible(true);
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingShift) return;
    try {
      setDeletingJob(true);
      await deleteJobPostMutation.mutateAsync(deletingShift.jobPostId);
      setDeleteModalVisible(false);
      setDeletingShift(null);
    } catch (err) {
      console.log('Error deleting job post:', err);
    } finally {
      setDeletingJob(false);
    }
  };

  // Handle Edit Press
  const handleEditPress = async (shift) => {
    try {
      setLoadingDetails(true);
      setEditModalVisible(true); // Open modal immediately to show loader and eliminate perceived delay
      const originalJob = await getJobPostById(shift.jobPostId);
      if (!originalJob) {
        setEditModalVisible(false);
        showToast('Không tìm thấy thông tin bài đăng gốc.', 'error');
        return;
      }

      setEditingJobId(originalJob.id);
      setEditTitle(originalJob.title || '');
      setEditDescription(originalJob.description || '');
      setEditRequirements(originalJob.requirements || '');

      const cat = categories.find(c => c.name === originalJob.categoryName);
      const catIdStr = cat ? String(cat.id) : '6';
      setEditCategoryId(catIdStr);

      const isOther = catIdStr === '6' || catIdStr === '9999' || (cat && cat.name.toLowerCase() === 'khác');
      let extractedCustom = '';
      if (isOther && originalJob.description?.startsWith('[Danh mục khác:')) {
        const match = originalJob.description.match(/^\[Danh mục khác:\s*([^\]]+)\]/);
        if (match) {
          extractedCustom = match[1].trim();
        }
      }
      setEditCustomCategory(extractedCustom);

      setEditAddress(originalJob.location?.address || '');
      setEditLatitude(String(originalJob.location?.latitude || ''));
      setEditLongitude(String(originalJob.location?.longitude || ''));

      if (Array.isArray(originalJob.skills)) {
        setSkillsList(prev => {
          const merged = [...prev];
          originalJob.skills.forEach(os => {
            if (!merged.some(s => s.id === os.id)) {
              const triggerIndex = merged.findIndex(s => s.id === 'other_skill_trigger');
              if (triggerIndex !== -1) {
                merged.splice(triggerIndex, 0, os);
              } else {
                merged.push(os);
              }
            }
          });
          return merged;
        });
      }

      const skillIds = Array.isArray(originalJob.skills)
        ? originalJob.skills.map(s => s.id)
        : [];
      setEditSelectedSkills(skillIds);
      setCustomSkillInput('');
      setShowCustomSkillInput(false);
    } catch (err) {
      console.log('Error opening edit modal:', err);
      setEditModalVisible(false);
      showToast('Không thể tải thông tin chi tiết bài đăng.', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handle Submit Edit
  const handleSubmitEdit = async () => {
    const selectedCat = categories.find(c => c.id.toString() === editCategoryId);
    const isOtherCat = selectedCat && (selectedCat.name.toLowerCase() === 'khác' || selectedCat.name.toLowerCase() === 'other' || editCategoryId === '9999');

    if (isOtherCat && !editCustomCategory.trim()) {
      showToast('Vui lòng nhập tên danh mục khác!', 'warning');
      return;
    }
    if (!editTitle.trim()) {
      showToast('Vui lòng nhập tiêu đề!', 'warning');
      return;
    }
    if (!editDescription.trim()) {
      showToast('Vui lòng nhập mô tả!', 'warning');
      return;
    }
    if (!editAddress.trim()) {
      showToast('Vui lòng nhập địa chỉ!', 'warning');
      return;
    }

    let finalTitle = editTitle;
    let finalDescription = editDescription;

    // Clean up old custom categories prefix/suffix to prevent duplicates
    finalTitle = finalTitle.replace(/\s*\([^)]+\)\s*$/, '');
    finalDescription = finalDescription.replace(/^\[Danh mục khác:\s*[^\]]+\]\n\n/, '');

    if (isOtherCat && editCustomCategory.trim()) {
      finalTitle = `${finalTitle} (${editCustomCategory.trim()})`;
      finalDescription = `[Danh mục khác: ${editCustomCategory.trim()}]\n\n${finalDescription}`;
    }

    let finalCategoryId = editCategoryId;
    if (editCategoryId === '9999') {
      const realOther = categories.find(c => c.name.toLowerCase() === 'khác' && c.id !== 9999);
      finalCategoryId = realOther ? realOther.id.toString() : '6';
    }

    const finalSelectedSkillNames = editSelectedSkills
      .map(id => skillsList.find(s => s.id === id)?.name)
      .filter(Boolean);

    if (showCustomSkillInput && customSkillInput.trim()) {
      const customSkills = customSkillInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      finalSelectedSkillNames.push(...customSkills);
    }

    try {
      setSavingEdit(true);
      await updateJobPostWizardMutation.mutateAsync({
        jobPostId: editingJobId,
        data: {
          title: finalTitle,
          description: finalDescription,
          requirements: editRequirements,
          categoryId: finalCategoryId,
          address: editAddress,
          latitude: editLatitude,
          longitude: editLongitude,
          skillNames: finalSelectedSkillNames
        }
      });
      setEditModalVisible(false);
    } catch (err) {
      console.log('Error updating job post:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const selectedCat = categories.find(c => c.id.toString() === editCategoryId);
  const isOtherCat = selectedCat && (selectedCat.name.toLowerCase() === 'khác' || selectedCat.name.toLowerCase() === 'other' || editCategoryId === '9999');

  // Toggle skill
  const handleSkillToggle = (skillId) => {
    if (skillId === 'other_skill_trigger') {
      setShowCustomSkillInput(!showCustomSkillInput);
      return;
    }
    if (editSelectedSkills.includes(skillId)) {
      setEditSelectedSkills(editSelectedSkills.filter(id => id !== skillId));
    } else {
      setEditSelectedSkills([...editSelectedSkills, skillId]);
    }
  };

  // Filter pending leave requests
  const pendingLeaves = leaveRequests.filter(l => l.status === 'pending');

  // Sort leaves so pending is first, followed by approved and rejected
  const sortedLeaves = [...leaveRequests].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return 0;
  });

  // Stats calculation
  const activeShiftsCount = shifts.filter(s => s.status !== 'completed').length;
  const totalApplicantsCount = shifts.reduce((acc, s) => acc + (s.applicantCount || 0), 0);
  const simulatedViews = shifts.reduce((acc, s) => acc + (s.applicantCount || 0) * 15 + 120, 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome Block */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeGreeting}>Chào buổi sáng, {user?.name || 'Quản lý'}</Text>
          <Text style={styles.welcomeSubtitle}>
            Hôm nay bạn có {shifts.length} tin tuyển dụng cần theo dõi.
          </Text>
        </View>

        {/* Bento Stats Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsContainer}
        >
          <View style={[styles.statsBadge, { borderLeftColor: theme.colors.primary }]}>
            <View style={[styles.statsDot, { backgroundColor: '#FF6B00' }]} />
            <Text style={styles.statsText}>{simulatedViews >= 1000 ? (simulatedViews / 1000).toFixed(1) + 'k' : simulatedViews} Lượt xem</Text>
          </View>

          <View style={[styles.statsBadge, { borderLeftColor: theme.colors.secondary }]}>
            <View style={[styles.statsDot, { backgroundColor: '#0A58CA' }]} />
            <Text style={styles.statsText}>{activeShiftsCount} Đang chạy</Text>
          </View>

          <View style={[styles.statsBadge, { borderLeftColor: '#10B981' }]}>
            <View style={[styles.statsDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.statsText}>{totalApplicantsCount} Ứng viên mới</Text>
          </View>
        </ScrollView>

        {/* Capsule Navigation Tabs */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'job_posts' && styles.segmentBtnActive]}
            onPress={() => setActiveSegment('job_posts')}
          >
            <Text style={[styles.segmentText, activeSegment === 'job_posts' && styles.segmentTextActive]}>
              Quản Lý Tin Đăng ({shifts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'leaves' && styles.segmentBtnActive]}
            onPress={() => setActiveSegment('leaves')}
          >
            <Text style={[styles.segmentText, activeSegment === 'leaves' && styles.segmentTextActive]}>
              Xin Nghỉ / Đổi Ca ({pendingLeaves.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeSegment === 'job_posts' ? (
          /* Job Posts Management Tab */
          <View style={styles.cardsWrapper}>
            {shifts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📬</Text>
                <Text style={styles.emptyText}>Chưa có bài đăng nào hết</Text>
                <Text style={styles.emptySub}>Bấm vào nút "+" ở góc dưới bên phải để bắt đầu tạo tin tuyển dụng mới.</Text>
              </View>
            ) : (
              paginatedShifts.map((shift, index) => {
                const applicantCount = shift.applicantCount !== undefined ? shift.applicantCount : (shift.status === 'applied' ? 1 : 0);
                const hasApplicants = applicantCount > 0;
                const leftBorderColor = getLeftBorderColor(index);
                const cardViews = (shift.applicantCount || 0) * 15 + 120;
                
                return (
                  <TouchableOpacity
                    key={shift.id}
                    style={styles.cardShadowContainer}
                    activeOpacity={0.9}
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
                          <View style={styles.viewCountRow}>
                            <Ionicons name="eye-outline" size={13} color="#64748B" style={{ marginRight: 2 }} />
                            <Text style={styles.viewCountText}>
                              {cardViews >= 1000 ? (cardViews / 1000).toFixed(1) + 'k' : cardViews} lượt xem
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cardActionsRow}>
                          <TouchableOpacity
                            style={[styles.cardActionBtn, { marginRight: 8, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                            onPress={() => handleEditPress(shift)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="pencil" size={15} color="#2563EB" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.cardActionBtn, styles.cardActionBtnDelete, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}
                            onPress={() => handleDeletePress(shift)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash" size={15} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text style={styles.jobTitleText} numberOfLines={2}>{shift.title}</Text>
                      <Text style={styles.shopSubtitleText} numberOfLines={1}>{shift.shopName}</Text>

                      <View style={styles.timeInfoRow}>
                        <Ionicons name="calendar-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.timeInfoText}>{shift.date} • {shift.time}</Text>
                      </View>

                      <View style={styles.cardFooterRow}>
                        <View style={styles.salaryAndStatus}>
                          <Text style={styles.salaryText}>
                            {(shift.hourlyRate).toLocaleString('vi-VN')} đ/h
                          </Text>
                          <Text style={[
                            styles.statusText,
                            shift.status === 'completed' && { color: '#64748B' },
                            shift.status === 'checkin_active' && { color: '#10B981' },
                            shift.status === 'approved' && { color: '#0A58CA' }
                          ]}>
                            • {shift.status === 'completed'
                              ? 'Đã hoàn thành'
                              : shift.status === 'checkin_active'
                                ? 'Sinh viên đang làm'
                                : shift.status === 'approved'
                                  ? 'Đã duyệt hồ sơ'
                                  : 'Đang hiển thị'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.viewCandidatesBtn}
                          onPress={() => navigateTo('candidate_list', { shiftId: shift.id })}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.viewCandidatesBtnText}>
                            {hasApplicants ? `Xem ứng viên (${applicantCount})` : 'Tìm lân cận'}
                          </Text>
                          {hasApplicants ? (
                            <Ionicons name="chevron-forward" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                          ) : (
                            <Ionicons name="search" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  disabled={currentPage === 1}
                  onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                >
                  <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? '#94A3B8' : '#0A58CA'} />
                  <Text style={[styles.pageBtnText, currentPage === 1 && styles.pageBtnTextDisabled]}>Trước</Text>
                </TouchableOpacity>

                <View style={styles.pageIndicator}>
                  <Text style={styles.pageIndicatorText}>
                    Trang <Text style={{fontWeight: 'bold', color: '#0A58CA'}}>{currentPage}</Text> / {totalPages}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  disabled={currentPage === totalPages}
                  onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                >
                  <Text style={[styles.pageBtnText, currentPage === totalPages && styles.pageBtnTextDisabled]}>Sau</Text>
                  <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? '#94A3B8' : '#0A58CA'} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* Leaves / Swaps Tab */
          <View style={styles.cardsWrapper}>
            {leaveRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🏖️</Text>
                <Text style={styles.emptyText}>Mọi người đều đi làm đầy đủ!</Text>
                <Text style={styles.emptySub}>Không có yêu cầu xin nghỉ hoặc đổi ca nào đang chờ duyệt.</Text>
              </View>
            ) : (
              sortedLeaves.map((request) => {
                const isPending = request.status === 'pending';
                const isSwap = request.type === 'swap';
                const isApproved = request.status === 'approved';
                const isRejected = request.status === 'rejected';

                // Styles for type tags
                let tagBg = '#E8DDFF';
                let tagColor = '#5300CD';
                let tagText = '🔄 ĐỔI CA';

                if (!isSwap) {
                  tagBg = '#FFDAD6';
                  tagColor = '#93000A';
                  tagText = '❌ XIN NGHỈ';
                }

                if (isApproved) {
                  tagBg = '#E6F4EA';
                  tagColor = '#137333';
                  tagText = '✅ ĐÃ CHẤP THUẬN';
                } else if (isRejected) {
                  tagBg = '#FCE8E6';
                  tagColor = '#C5221F';
                  tagText = '❌ ĐÃ TỪ CHỐI';
                }

                const borderLeftColor = isSwap ? '#FF6B00' : '#EF4444';

                return (
                  <View
                    key={request.id}
                    style={[
                      styles.approvalCard,
                      !isPending && { opacity: 0.7, borderStyle: 'dashed', borderColor: '#8E7164' }
                    ]}
                  >
                    {/* Viewfinder brackets for pending items only */}
                    {isPending && (
                      <>
                        <View style={[styles.viewfinderCornerTL, { borderColor: isSwap ? '#5B00DF' : '#FF6B00' }]} />
                        <View style={[styles.viewfinderCornerBR, { borderColor: isSwap ? '#5B00DF' : '#FF6B00' }]} />
                      </>
                    )}

                    {/* Tag Header Row */}
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.typeTag, { backgroundColor: tagBg }]}>
                        <Text style={[styles.typeTagText, { color: tagColor }]}>{tagText}</Text>
                      </View>
                    </View>

                    {/* Employee Info Row */}
                    <View style={styles.applicantHeader}>
                      <View style={[styles.applicantAvatar, { backgroundColor: (isSwap ? '#5B00DF' : '#FF6B00') + '1A' }]}>
                        <Text style={[styles.avatarText, { color: isSwap ? '#5B00DF' : '#FF6B00' }]}>
                          {request.staffName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.applicantInfo}>
                        <Text style={styles.applicantName}>{request.staffName}</Text>
                        <Text style={styles.applicantStats}>👤 {request.position || 'Nhân viên'}</Text>
                      </View>
                    </View>

                    {/* Request Details Box */}
                    <View style={[styles.shiftDetailsBox, { borderLeftColor }]}>
                      <View style={styles.detailTitleRow}>
                        <Text style={styles.detailTitleIcon}>{isSwap ? '🔄' : '📅'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailTitleText}>
                            {isSwap ? 'Muốn đổi sang ca làm:' : 'Xin nghỉ ca làm:'}
                          </Text>
                          <Text style={styles.detailValueText}>
                            {request.jobTitle}
                          </Text>
                          <Text style={styles.detailTimeText}>
                            {request.shiftTime} | Ngày {request.shiftDate}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.reasonQuoteContainer}>
                        <Text style={styles.reasonQuoteText}>
                          "Lý do: {request.reason}"
                        </Text>
                      </View>
                    </View>

                    {/* Action Row for Pending Items only */}
                    {isPending && (
                      <View style={styles.actionRowCapsule}>
                        <TouchableOpacity
                          style={styles.rejectBtnCapsule}
                          onPress={() => handleLeaveRequest(request.id, 'rejected')}
                        >
                          <Text style={styles.rejectTextCapsule}>Từ chối</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.approveBtnCapsule}
                          onPress={() => handleLeaveRequest(request.id, 'approved')}
                        >
                          <Text style={styles.approveTextCapsule}>
                            {isSwap ? 'Duyệt Đổi ⚡' : 'Duyệt Nghỉ ⚡'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.floatingFab}
        onPress={() => navigateTo('employer_emergency_post')}
        activeOpacity={0.8}
      >
        <View style={styles.fabPlusHorizontal} />
        <View style={styles.fabPlusVertical} />
      </TouchableOpacity>

      {/* Edit Job Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalContentFullscreen}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa bài đăng</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={20} color="#5A4136" />
              </TouchableOpacity>
            </View>

            {loadingDetails ? (
              <View style={styles.modalLoaderContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.modalLoaderText}>Đang tải chi tiết bài đăng...</Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.modalScrollView} 
                contentContainerStyle={styles.modalScrollViewContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* CARD 1: Thông tin cơ bản */}
                <View style={styles.modalSectionCard}>
                  <View style={styles.modalSectionHeader}>
                    <Ionicons name="information-circle-outline" size={18} color="#FF6B00" style={{ marginRight: 6 }} />
                    <Text style={styles.modalSectionTitle}>Thông tin cơ bản</Text>
                  </View>

                  <Text style={styles.modalInputLabel}>Tiêu đề công việc</Text>
                  <TextInput
                    style={styles.modalPremiumInput}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="Nhập tiêu đề công việc..."
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={styles.modalInputLabel}>Danh mục công việc</Text>
                  <View style={styles.modalCategoryGrid}>
                    {categories.map((cat) => {
                      const isSelected = editCategoryId === String(cat.id);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.modalCategoryPill,
                            isSelected && styles.modalCategoryPillActive
                          ]}
                          onPress={() => setEditCategoryId(String(cat.id))}
                        >
                          <Text style={[
                            styles.modalCategoryPillText,
                            isSelected && styles.modalCategoryPillTextActive
                          ]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {isOtherCat && (
                    <View style={{ marginTop: 4 }}>
                      <Text style={styles.modalInputLabel}>Nhập danh mục khác</Text>
                      <TextInput
                        style={styles.modalPremiumInput}
                        placeholder="Ví dụ: Rửa bát, Phụ bếp..."
                        placeholderTextColor="#94A3B8"
                        value={editCustomCategory}
                        onChangeText={setEditCustomCategory}
                      />
                    </View>
                  )}
                </View>

                {/* CARD 2: Nội dung mô tả */}
                <View style={styles.modalSectionCard}>
                  <View style={styles.modalSectionHeader}>
                    <Ionicons name="document-text-outline" size={18} color="#FF6B00" style={{ marginRight: 6 }} />
                    <Text style={styles.modalSectionTitle}>Mô tả công việc</Text>
                  </View>

                  <Text style={styles.modalInputLabel}>Mô tả chi tiết</Text>
                  <TextInput
                    style={[styles.modalPremiumInput, styles.modalTextArea]}
                    value={editDescription}
                    onChangeText={setEditDescription}
                    multiline
                    numberOfLines={4}
                    placeholder="Nhập mô tả chi tiết công việc..."
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={styles.modalInputLabel}>Yêu cầu đối với ứng viên</Text>
                  <TextInput
                    style={[styles.modalPremiumInput, styles.modalTextArea, { height: 80 }]}
                    value={editRequirements}
                    onChangeText={setEditRequirements}
                    multiline
                    numberOfLines={3}
                    placeholder="Nhập yêu cầu đối với ứng viên..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* CARD 3: Địa điểm làm việc */}
                <View style={styles.modalSectionCard}>
                  <View style={styles.modalSectionHeader}>
                    <Ionicons name="location-outline" size={18} color="#FF6B00" style={{ marginRight: 6 }} />
                    <Text style={styles.modalSectionTitle}>Địa chỉ làm việc</Text>
                  </View>

                  <Text style={styles.modalInputLabel}>Địa chỉ chi tiết</Text>
                  <View style={{ position: 'relative', zIndex: 10, marginBottom: 16 }}>
                    <TextInput
                      style={[styles.modalPremiumInput, { marginBottom: 0 }]}
                      value={editAddress}
                      onChangeText={handleAddressChange}
                      placeholder="Nhập địa chỉ hoặc nhấn nút GPS bên dưới..."
                      placeholderTextColor="#94A3B8"
                    />

                    {showSuggestions && (
                      <View style={{
                        position: 'absolute',
                        top: 52,
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
                      style={[styles.gpsButton, { flex: 1, marginRight: 8 }]}
                      onPress={getCurrentLocation}
                      disabled={gpsLoading}
                    >
                      {gpsLoading ? (
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

                  {/* Coordinates Display */}
                  {editLatitude && editLongitude ? (
                    <View style={styles.coordsRow}>
                      <View style={styles.coordBox}>
                        <Text style={styles.coordLabel}>Lat: {parseFloat(editLatitude).toFixed(6)}</Text>
                      </View>
                      <View style={styles.coordBox}>
                        <Text style={styles.coordLabel}>Long: {parseFloat(editLongitude).toFixed(6)}</Text>
                      </View>
                      <View style={[styles.coordBox, { backgroundColor: '#10B98120', borderColor: '#10B981' }]}>
                        <Text style={[styles.coordLabel, { color: '#10B981' }]}>✓ GPS Đã kết nối</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.coordsRow}>
                      <View style={[styles.coordBox, { backgroundColor: '#EF444420', borderColor: '#EF4444' }]}>
                        <Text style={[styles.coordLabel, { color: '#EF4444' }]}>⚠ Chưa có tọa độ GPS</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* CARD 4: Kỹ năng cần thiết */}
                <View style={styles.modalSectionCard}>
                  <View style={styles.modalSectionHeader}>
                    <Ionicons name="flash-outline" size={18} color="#FF6B00" style={{ marginRight: 6 }} />
                    <Text style={styles.modalSectionTitle}>Kỹ năng yêu cầu</Text>
                  </View>

                  <Text style={styles.modalInputLabel}>Chọn kỹ năng (có thể chọn nhiều)</Text>
                  <View style={styles.modalSkillsContainer}>
                    {skillsList.map((skill) => {
                      const isSelected = skill.id === 'other_skill_trigger' ? showCustomSkillInput : editSelectedSkills.includes(skill.id);
                      return (
                        <TouchableOpacity
                          key={skill.id}
                          style={[
                            styles.modalSkillPill,
                            isSelected && styles.modalSkillPillActive
                          ]}
                          onPress={() => handleSkillToggle(skill.id)}
                        >
                          <Text style={[
                            styles.modalSkillPillText,
                            isSelected && styles.modalSkillPillTextActive
                          ]}>
                            {isSelected ? '✓ ' : ''}{skill.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {showCustomSkillInput && (
                    <View style={styles.customSkillInputRow}>
                      <TextInput
                        style={[styles.modalPremiumInput, styles.customSkillInput, { marginRight: 0 }]}
                        placeholder="Nhập kỹ năng khác (cách nhau bởi dấu phẩy)..."
                        placeholderTextColor="#94A3B8"
                        value={customSkillInput}
                        onChangeText={setCustomSkillInput}
                      />
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditModalVisible(false)}
                disabled={savingEdit}
              >
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSubmitEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Lưu thay đổi ⚡</Text>
                )}
              </TouchableOpacity>
            </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Map Picker Modal */}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setMapModalVisible(false)}
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
                setMapSearchQuery('');
                setMapModalVisible(false);
              }}
              style={{ padding: 8 }}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#64748B' }}>Hủy</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B' }}>📍 Vị trí công việc</Text>
            <TouchableOpacity onPress={handleConfirmMapLocation} style={{ padding: 8, backgroundColor: '#FF6B00', borderRadius: 8, paddingHorizontal: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' }}>Xác nhận</Text>
            </TouchableOpacity>
          </View>

          {/* Map Search Bar */}
          <View style={{ zIndex: 20, position: 'relative' }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 12,
              backgroundColor: '#F8FAFC',
              borderBottomWidth: 1,
              borderBottomColor: '#E5E9EB',
            }}>
              <TextInput
                style={{
                  flex: 1,
                  height: 40,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  fontSize: 14,
                  color: '#1E293B',
                }}
                placeholder="Nhập địa chỉ để dời ghim bản đồ..."
                placeholderTextColor="#94A3B8"
                value={mapSearchQuery}
                onChangeText={handleMapSearchChange}
                onSubmitEditing={handleMapSearch}
              />
              <TouchableOpacity
                onPress={handleMapSearch}
                disabled={searchLoading}
                style={{
                  marginLeft: 10,
                  backgroundColor: '#FF6B00',
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {searchLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>Tìm</Text>
                )}
              </TouchableOpacity>
            </View>

            {showMapSuggestions && (
              <View style={{
                position: 'absolute',
                top: 56,
                left: 12,
                right: 12,
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 5,
                maxHeight: 180,
                zIndex: 30,
              }}>
                <ScrollView keyboardShouldPersistTaps="always">
                  {mapSuggestions.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderBottomWidth: index === mapSuggestions.length - 1 ? 0 : 1,
                        borderBottomColor: '#F1F5F9',
                      }}
                      onPress={() => handleSelectMapSuggestion(item)}
                    >
                      <Text style={{ fontSize: 13, color: '#334155', fontWeight: '500' }}>{item.display_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
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
                      var map = L.map('map', { zoomControl: true }).setView([${mapInitLat}, ${mapInitLng}], 15);
                      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

                      var marker = L.marker([${mapInitLat}, ${mapInitLng}], {
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
                ref={webviewRef}
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
                        var map = L.map('map', { zoomControl: true }).setView([${mapInitLat}, ${mapInitLng}], 15);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

                        var marker = L.marker([${mapInitLat}, ${mapInitLng}], {
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
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#FF6B00' }}>Kéo ghim hoặc click chọn đúng địa điểm làm việc</Text>
              <Text style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>
                Tọa độ đã chọn: {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => {
          setDeleteModalVisible(false);
          setDeletingShift(null);
        }}
      >
        <SafeAreaView style={styles.confirmOverlay}>
          <View style={styles.confirmContent}>
            {/* Circular warning icon badge */}
            <View style={styles.warningBadge}>
              <Text style={styles.warningBadgeText}>!</Text>
            </View>

            <Text style={styles.confirmTitle}>Xác nhận xóa bài đăng</Text>
            <Text style={styles.confirmMessage}>
              Bạn có chắc chắn muốn xóa bài đăng{'\n'}
              <Text style={styles.confirmJobTitle}>"{deletingShift?.title}"</Text>?{'\n'}
              Hành động này không thể hoàn tác.
            </Text>

            <View style={styles.confirmFooter}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeletingShift(null);
                }}
                disabled={deletingJob}
              >
                <Text style={styles.confirmCancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={handleConfirmDelete}
                disabled={deletingJob}
              >
                {deletingJob ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmDeleteBtnText}>Xóa tin ⚡</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const FONT_REGULAR = Platform.OS === 'web' ? '"Plus Jakarta Sans", sans-serif' : 'PlusJakartaSans-Regular';
const FONT_BOLD = Platform.OS === 'web' ? '"Plus Jakarta Sans", sans-serif' : 'PlusJakartaSans-Bold';
const FONT_EXTRABOLD = Platform.OS === 'web' ? '"Plus Jakarta Sans", sans-serif' : 'PlusJakartaSans-ExtraBold';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC', // light background depth from design system
  },
  headerShell: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E9EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2BFB0',
    marginRight: 10,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  brandTitle: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '800',
    color: '#FF6B00', // Neon Orange primary
    lineHeight: 20,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5A4136',
    opacity: 0.7,
  },
  notificationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E9EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 110, // Generous padding to clear the FAB and Navigation tabs
  },
  welcomeSection: {
    marginBottom: 16,
  },
  welcomeGreeting: {
    fontFamily: 'System',
    fontSize: 22,
    fontWeight: '800',
    color: '#181C1E',
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#5A4136',
    opacity: 0.8,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
    marginBottom: 20,
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#EEF1F3',
    borderRadius: 9999,
    marginRight: 10,
    borderLeftWidth: 3,
  },
  statsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#181C1E',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E9EB',
    borderRadius: 9999,
    padding: 4,
    marginBottom: 24,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 9999,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5A4136',
  },
  segmentTextActive: {
    color: '#FF6B00', // Active brand neon orange
  },
  cardsWrapper: {
    width: '100%',
  },
  cardShadowContainer: {
    backgroundColor: 'transparent',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 3,
  },
  cardContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 20,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  logoAndName: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopLogoCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  shopLogoText: {
    fontSize: 15,
    fontWeight: '900',
  },
  viewCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viewCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  cardActionsRow: {
    flexDirection: 'row',
  },
  cardActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  cardActionBtnDelete: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  cardActionIcon: {
    fontSize: 14,
  },
  jobTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 26,
    marginBottom: 6,
  },
  shopSubtitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  timeInfoText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  salaryAndStatus: {
    flexDirection: 'column',
  },
  salaryText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF6B00',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B00',
    marginTop: 2,
  },
  viewCandidatesBtn: {
    backgroundColor: '#0A58CA',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0A58CA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  viewCandidatesBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  floatingFab: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B00', // Neon Orange accent
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
    zIndex: 99,
  },
  fabPlusHorizontal: {
    position: 'absolute',
    left: 18,
    top: 26,
    width: 20,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  fabPlusVertical: {
    position: 'absolute',
    left: 26,
    top: 18,
    width: 4,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#181C1E',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: '#5A4136',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  applicantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  applicantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  applicantInfo: {
    flex: 1,
  },
  applicantName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#181C1E',
  },
  applicantStats: {
    fontSize: 11,
    color: '#5A4136',
    opacity: 0.7,
    marginTop: 1,
  },
  shiftDetails: {
    backgroundColor: '#EEF1F3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  shiftTitleLabel: {
    fontSize: 10,
    color: '#5A4136',
    fontWeight: 'bold',
  },
  leaveReasonText: {
    fontSize: 13,
    color: '#181C1E',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  rejectBtn: {
    borderWidth: 1,
    borderColor: '#EF4444' + '33',
  },
  approveBtn: {
    backgroundColor: '#0A58CA',
  },
  rejectBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardHeaderRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  typeTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  typeTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  shiftDetailsBox: {
    backgroundColor: '#F1F4F6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  detailTitleIcon: {
    fontSize: 18,
    marginRight: 8,
    marginTop: 2,
  },
  detailTitleText: {
    fontSize: 10,
    color: '#5A4136',
    fontWeight: '700',
  },
  detailValueText: {
    fontSize: 14,
    color: '#181C1E',
    fontWeight: '800',
    marginTop: 1,
  },
  detailTimeText: {
    fontSize: 11,
    color: '#5A4136',
    opacity: 0.8,
    marginTop: 2,
  },
  reasonQuoteContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  reasonQuoteText: {
    fontSize: 12,
    color: '#181C1E',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionRowCapsule: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtnCapsule: {
    flex: 1,
    height: 40,
    borderRadius: 9999,
    backgroundColor: '#E5E9EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtnCapsule: {
    flex: 2,
    height: 40,
    borderRadius: 9999,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  rejectTextCapsule: {
    color: '#5A4136',
    fontSize: 12,
    fontWeight: '800',
  },
  approveTextCapsule: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  headerRightContainer: {
    alignItems: 'flex-end',
  },
  cardActionsRow: {
    flexDirection: 'row',
  },
  cardActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  cardActionBtnDelete: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  cardActionIcon: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Deep slate overlay
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    height: '92%',
    display: 'flex',
    flexDirection: 'column',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
    overflow: 'hidden',
  },
  modalContentFullscreen: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E9EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: FONT_EXTRABOLD,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF1F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalIcon: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5A4136',
  },
  modalScrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalScrollViewContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  modalSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: FONT_EXTRABOLD,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalFormGroup: {
    marginBottom: 20,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    fontFamily: FONT_BOLD,
    textTransform: 'uppercase',
  },
  modalPremiumInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#0F172A',
    fontFamily: FONT_REGULAR,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  modalTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  modalCategoryPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  modalCategoryPillActive: {
    backgroundColor: '#FF6B0010',
    borderColor: '#FF6B00',
  },
  modalCategoryPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    fontFamily: FONT_BOLD,
  },
  modalCategoryPillTextActive: {
    color: '#FF6B00',
  },
  modalSkillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  modalSkillPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  modalSkillPillActive: {
    backgroundColor: '#FF6B0010',
    borderColor: '#FF6B00',
  },
  modalSkillPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    fontFamily: FONT_BOLD,
  },
  modalSkillPillTextActive: {
    color: '#FF6B00',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E9EB',
    backgroundColor: '#FFFFFF',
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 9999,
    backgroundColor: '#EEF1F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalCancelBtnText: {
    color: '#5A4136',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: FONT_BOLD,
  },
  modalSaveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 9999,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: FONT_EXTRABOLD,
  },
  modalLoaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalLoaderText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 10,
    fontWeight: '600',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 28, 30, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  confirmContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  warningBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  warningBadgeText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#181C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 13,
    color: '#5A4136',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmJobTitle: {
    fontWeight: '800',
    color: '#FF6B00',
  },
  confirmFooter: {
    flexDirection: 'row',
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 9999,
    backgroundColor: '#EEF1F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  confirmCancelBtnText: {
    color: '#5A4136',
    fontSize: 13,
    fontWeight: '800',
  },
  confirmDeleteBtn: {
    flex: 1,
    height: 44,
    borderRadius: 9999,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0EBFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#0A58CA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  pageBtnDisabled: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    shadowOpacity: 0,
    elevation: 0,
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0A58CA',
    marginHorizontal: 4,
  },
  pageBtnTextDisabled: {
    color: '#94A3B8',
  },
  pageIndicator: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  pageIndicatorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  customSkillInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  customSkillInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    marginBottom: 0,
  },
  btnAddCustomSkill: {
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginLeft: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnAddCustomSkillText: {
    color: '#fff',
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
    gap: 8,
    marginBottom: 16,
  },
  coordBox: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 99,
  },
  coordLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
  },
});
