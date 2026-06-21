import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Switch,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';
import { getCategoriesApi, getSkillsApi } from '../../api/jobs';
import { Ionicons } from '@expo/vector-icons';

// ĐIỀN API KEY GOOGLE MAPS CỦA BẠN VÀO ĐÂY ĐỂ BẬT TỰ ĐỘNG GỢI Ý & TÌM KIẾM ĐỊA CHỈ GOOGLE MAPS
const GOOGLE_MAPS_API_KEY = 'CvNapWs3C3Vt7ZTRZf0uZliN9v3q8TBJKxd2CEcW';

const cleanAddress = (rawAddress) => {
  if (!rawAddress) return '';
  // Remove trailing country suffix
  let cleaned = rawAddress.replace(/,\s*(Việt Nam|Vietnam)\s*$/i, '');
  // Remove postal codes (5-6 digit values preceded by comma and space)
  cleaned = cleaned.replace(/,\s*\d{5,6}\b/g, '');
  return cleaned.trim();
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
  // 1. Nếu có Google Key, thử geocode bằng dịch vụ thông minh trước
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(queryText)}&key=${GOOGLE_MAPS_API_KEY}&language=vi`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          return {
            data: [{
              lat: loc.lat,
              lon: loc.lng,
              display_name: data.results[0].formatted_address
            }],
            isFallback: false
          };
        }
      }
    } catch (e) {
      console.log('Smart geocoding API error:', e);
    }
  }

  // 2. Dự phòng (OSM): Tìm kiếm trực tiếp chuỗi ban đầu
  let data = await fetchGeocode(queryText);
  if (data && data.length > 0) {
    return { data, isFallback: false };
  }

  // Dự phòng (OSM) Fallback 1: Lược bỏ số nhà, hẻm, khu phố để tìm kiếm tên đường lớn
  let simplified = queryText
    .replace(/^\s*(số|so)?\s*\d+(\/\d+)*\s*/i, '') // Loại bỏ số nhà dạng "50/19" ở đầu
    .replace(/,\s*(khu phố|kp|tổ|to|hẻm|hem)\s*\d+/gi, '') // Loại bỏ ", khu phố 32"
    .replace(/,\s*(khu phố|kp|tổ|to|hẻm|hem)\s+[a-zA-Z0-9_.-]+/gi, '');

  simplified = simplified.trim();
  if (simplified && simplified !== queryText) {
    data = await fetchGeocode(simplified);
    if (data && data.length > 0) {
      return { data, isFallback: true, fallbackText: simplified };
    }
  }

  // Dự phòng (OSM) Fallback 2: Cắt bớt phần tử đầu tiên sau dấu phẩy và tìm kiếm tiếp
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

export default function EmployerEmergencyPost() {
  const { createJobPostWizard, showToast, navigateTo, user, goBack } = useContext(AppContext);

  // Categories & Skills local states
  const [categories, setCategories] = useState([
    { id: 1, name: 'Giao hàng' },
    { id: 2, name: 'Dịch vụ thú cưng' },
    { id: 3, name: 'Gia sư' },
    { id: 4, name: 'Sửa chữa' },
    { id: 5, name: 'Phục vụ' },
    { id: 6, name: 'Khác' }
  ]);
  const [skillsList, setSkillsList] = useState([
    { id: 1, name: 'Giao tiếp' },
    { id: 2, name: 'Pha chế' },
    { id: 3, name: 'Xử lý tình huống' },
    { id: 4, name: 'Tiếng Anh' },
    { id: 5, name: 'Sử dụng máy POS' },
    { id: 6, name: 'Làm việc nhóm' }
  ]);

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Form states
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('Tuyển nhân viên phục vụ ca tối');
  const [categoryId, setCategoryId] = useState('5'); // Default 'Phục vụ'
  const [description, setDescription] = useState('Thực hiện order nước, bưng bê đồ uống cho khách hàng và dọn dẹp bàn ghế sạch sẽ.');
  const [requirements, setRequirements] = useState('Nhanh nhẹn, chăm chỉ, có thái độ làm việc tốt. Ưu tiên có kinh nghiệm.');

  const [salary, setSalary] = useState('35000');
  const [selectedSkills, setSelectedSkills] = useState([1]); // Default 'Giao tiếp'

  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedLat, setSelectedLat] = useState(10.7769);
  const [selectedLng, setSelectedLng] = useState(106.7009);
  const [mapInitLat, setMapInitLat] = useState(10.7769);
  const [mapInitLng, setMapInitLng] = useState(106.7009);

  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
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

  const handleOpenMapPicker = () => {
    const initialLat = parseFloat(latitude) || 10.7769;
    const initialLng = parseFloat(longitude) || 106.7009;
    setSelectedLat(initialLat);
    setSelectedLng(initialLng);
    setMapInitLat(initialLat);
    setMapInitLng(initialLng);
    setMapModalVisible(true);
  };

  const handleConfirmMapLocation = async () => {
    try {
      setLatitude(selectedLat.toString());
      setLongitude(selectedLng.toString());

      // Reverse geocode chosen coordinates to get a human-readable address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${selectedLat}&lon=${selectedLng}&format=json`,
        { headers: { 'User-Agent': 'ProxiJobApp/1.0' } }
      );
      if (response.ok) {
        const data = await response.json();
        let displayAddress = '';
        if (data.display_name) {
          displayAddress = cleanAddress(data.display_name);
        } else {
          const road = data.address?.road || '';
          const suburb = data.address?.suburb || data.address?.quarter || '';
          const city = data.address?.city || data.address?.town || data.address?.state || '';
          displayAddress = [road, suburb, city].filter(Boolean).join(', ');
        }
        setAddress(displayAddress || `Tọa độ: ${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`);
      } else {
        setAddress(`Tọa độ: ${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`);
      }
      showToast('Đã định vị vị trí công việc thành công!', 'success');
    } catch (e) {
      console.log('Reverse geocoding error:', e);
      setAddress(`Tọa độ: ${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`);
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
    if (!address.trim()) {
      showToast('Vui lòng nhập địa chỉ để tìm tọa độ!', 'warning');
      return;
    }
    try {
      setGpsLoading(true);
      const result = await geocodeAddressWithFallback(address);
      if (result && result.data && result.data.length > 0) {
        const lat = parseFloat(result.data[0].lat);
        const lon = parseFloat(result.data[0].lon);
        setLatitude(lat.toString());
        setLongitude(lon.toString());
        setSelectedLat(lat);
        setSelectedLng(lon);

        if (result.data[0].display_name && !result.isFallback) {
          setAddress(cleanAddress(result.data[0].display_name));
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
    setAddress(text);
    if (text.length < 4) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setSuggestionsLoading(true);
      if (GOOGLE_MAPS_API_KEY) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_MAPS_API_KEY}&language=vi`
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
    setAddress(suggestion.display_name);
    setShowSuggestions(false);

    try {
      setGpsLoading(true);
      let lat = 0;
      let lon = 0;
      if (suggestion.isGoogle) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.place_id}&key=${GOOGLE_MAPS_API_KEY}&language=vi`
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
        setLatitude(lat.toString());
        setLongitude(lon.toString());
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
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_MAPS_API_KEY}&language=vi`
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
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.place_id}&key=${GOOGLE_MAPS_API_KEY}&language=vi`
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
        showToast('Không lấy được tọa độ cho địa điểm này.', 'warning');
      }
    } catch (err) {
      console.log('Select map suggestion error:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Date and Time states
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const [date, setDate] = useState(getTodayDateString());
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('22:00');
  const [isEmergency, setIsEmergency] = useState(false);

  // Fetch categories & skills from backend on mount
  useEffect(() => {
    async function loadData() {
      try {
        setDataLoading(true);
        const catRes = await getCategoriesApi();
        const catList = Array.isArray(catRes) ? catRes : (Array.isArray(catRes?.data) ? catRes.data : (catRes?.items || catRes?.data?.items || []));
        if (catList && catList.length > 0) {
          setCategories(catList);
          // Set default category to first item if current is invalid
          const exists = catList.find(c => c.id.toString() === categoryId);
          if (!exists) {
            setCategoryId(catList[0].id.toString());
          }
        }
      } catch (err) {
        console.log('Error loading categories from API:', err);
      }

      try {
        const skillRes = await getSkillsApi();
        const skillList = Array.isArray(skillRes) ? skillRes : (Array.isArray(skillRes?.data) ? skillRes.data : (skillRes?.items || skillRes?.data?.items || []));
        if (skillList && skillList.length > 0) {
          setSkillsList(skillList);
        }
      } catch (err) {
        console.log('Error loading skills from API:', err);
      } finally {
        setDataLoading(false);
      }
    }
    loadData();
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
      setLatitude(lat.toString());
      setLongitude(lng.toString());

      // Reverse geocode để lấy địa chỉ
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'User-Agent': 'ProxiJobApp/1.0' } }
        );
        if (response.ok) {
          const data = await response.json();
          let displayAddress = '';
          if (data.display_name) {
            displayAddress = cleanAddress(data.display_name);
          } else {
            const road = data.address?.road || '';
            const suburb = data.address?.suburb || data.address?.quarter || '';
            const city = data.address?.city || data.address?.town || data.address?.state || '';
            displayAddress = [road, suburb, city].filter(Boolean).join(', ');
          }
          if (displayAddress) {
            setAddress(displayAddress);
          }
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

  // Handle emergency toggle rate adjustments
  const toggleEmergency = (value) => {
    setIsEmergency(value);
    if (value) {
      // Emergency gets +30% pay bonus automatically
      const currentRate = parseFloat(salary) || 0;
      const bonusRate = Math.round(currentRate * 1.3);
      setSalary(bonusRate.toString());
      showToast('Đã kích hoạt chế độ TUYỂN GẤP: Tự động cộng thêm 30% lương đề xuất!', 'info');
    } else {
      // Revert rate
      const currentRate = parseFloat(salary) || 0;
      const baseRate = Math.round(currentRate / 1.3);
      setSalary(baseRate.toString());
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!title.trim()) {
        showToast('Vui lòng nhập tiêu đề công việc!', 'warning');
        return;
      }
      if (!description.trim()) {
        showToast('Vui lòng nhập mô tả công việc!', 'warning');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const parsedSalary = parseFloat(salary);
      if (isNaN(parsedSalary) || parsedSalary <= 0) {
        showToast('Mức lương phải lớn hơn 0!', 'warning');
        return;
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkillToggle = (skillId) => {
    if (selectedSkills.includes(skillId)) {
      setSelectedSkills(selectedSkills.filter(id => id !== skillId));
    } else {
      setSelectedSkills([...selectedSkills, skillId]);
    }
  };

  const handleSubmit = async () => {
    if (!address.trim()) {
      showToast('Vui lòng nhập địa chỉ làm việc hoặc nhấn nút GPS!', 'warning');
      return;
    }
    if (!latitude || !longitude || parseFloat(latitude) === 0 || parseFloat(longitude) === 0) {
      showToast('Vui lòng nhấn nút "Lấy vị trí GPS" để xác định tọa độ địa điểm làm việc!', 'warning');
      return;
    }
    if (!date.trim() || !startTime.trim() || !endTime.trim()) {
      showToast('Vui lòng nhập thời gian ca làm việc!', 'warning');
      return;
    }

    setLoading(true);
    const success = await createJobPostWizard({
      title,
      description,
      requirements,
      categoryId,
      salary,
      skillIds: selectedSkills,
      address,
      latitude,
      longitude,
      date,
      startTime,
      endTime,
      isEmergency
    });
    setLoading(false);

    if (success) {
      navigateTo('employer_approvals');
    }
  };

  const currentCategoryName = categories.find(c => c.id.toString() === categoryId)?.name || 'Khác';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.hBack} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.hTitle}>Đăng tin tuyển dụng mới</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Title & Page Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Đăng tin tuyển dụng mới</Text>
          <Text style={styles.pageSubtitle}>Kết nối với những ứng viên tiềm năng xung quanh bạn ngay lập tức.</Text>
        </View>

        <View style={[styles.mainFormCard, theme.shadows.light]}>
          {/* Progress Indicator */}
          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, step >= 1 ? styles.progressActive : null]} />
              <View style={[styles.progressBar, step >= 2 ? styles.progressActive : null]} />
              <View style={[styles.progressBar, step >= 3 ? styles.progressActive : null]} />
            </View>
            <View style={styles.stepLabels}>
              <Text style={[styles.stepLabel, step >= 1 && styles.stepLabelActive]}>Bước 1</Text>
              <Text style={[styles.stepLabel, step >= 2 && styles.stepLabelActive]}>Bước 2</Text>
              <Text style={[styles.stepLabel, step >= 3 && styles.stepLabelActive]}>Bước 3</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {dataLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loaderText}>Đang tải danh mục dữ liệu...</Text>
            </View>
          ) : (
            <View>
              {/* Step 1: NỘI DUNG CA LÀM */}
              {step === 1 && (
                <View style={styles.bentoCard}>
                  <Text style={styles.sectionHeader}>NỘI DUNG CA LÀM</Text>

                  <Text style={styles.inputLabel}>Tiêu đề công việc</Text>
                  <TextInput
                    style={styles.premiumInput}
                    placeholder="Ví dụ: Cần nhân viên phục vụ khẩn cấp..."
                    placeholderTextColor={theme.colors.textLight}
                    value={title}
                    onChangeText={setTitle}
                  />

                  <Text style={styles.inputLabel}>Danh mục công việc</Text>
                  <View style={styles.categoryGrid}>
                    {categories.map((cat) => {
                      const isSelected = categoryId === cat.id.toString();
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.categoryPill,
                            isSelected && styles.categoryPillActive
                          ]}
                          onPress={() => setCategoryId(cat.id.toString())}
                        >
                          <Text style={[
                            styles.categoryPillText,
                            isSelected && styles.categoryPillTextActive
                          ]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.inputLabel}>Mô tả công việc</Text>
                  <TextInput
                    style={[styles.premiumInput, styles.textArea]}
                    placeholder="Mô tả chi tiết các yêu cầu và quyền lợi..."
                    placeholderTextColor={theme.colors.textLight}
                    multiline
                    numberOfLines={4}
                    value={description}
                    onChangeText={setDescription}
                  />

                  <Text style={styles.inputLabel}>Yêu cầu đối với ứng viên</Text>
                  <TextInput
                    style={[styles.premiumInput, styles.textArea, { height: 80 }]}
                    placeholder="Ví dụ: Chăm chỉ, trung thực, có kinh nghiệm pha chế..."
                    placeholderTextColor={theme.colors.textLight}
                    multiline
                    numberOfLines={3}
                    value={requirements}
                    onChangeText={setRequirements}
                  />
                </View>
              )}

              {/* Step 2: QUYỀN LỢI & KỸ NĂNG */}
              {step === 2 && (
                <View style={styles.bentoCard}>
                  <Text style={styles.sectionHeader}>QUYỀN LỢI & KỸ NĂNG</Text>

                  <Text style={styles.inputLabel}>Mức lương đề xuất (VND/giờ)</Text>
                  <View style={styles.salaryInputContainer}>
                    <TextInput
                      style={[styles.premiumInput, styles.salaryInput]}
                      placeholder="50,000"
                      placeholderTextColor={theme.colors.textLight}
                      keyboardType="numeric"
                      value={salary}
                      onChangeText={setSalary}
                    />
                    <Text style={styles.salaryCurrency}>VND</Text>
                  </View>

                  <Text style={styles.inputLabel}>Kỹ năng cần thiết</Text>
                  <View style={styles.skillsContainer}>
                    {skillsList.map((skill) => {
                      const isSelected = selectedSkills.includes(skill.id);
                      return (
                        <TouchableOpacity
                          key={skill.id}
                          style={[
                            styles.skillPill,
                            isSelected && styles.skillPillActive
                          ]}
                          onPress={() => handleSkillToggle(skill.id)}
                        >
                          <Text style={[
                            styles.skillPillText,
                            isSelected && styles.skillPillTextActive
                          ]}>
                            {isSelected ? '✓ ' : ''}{skill.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.infoBox}>
                    <Text style={styles.infoBoxText}>
                      💡 Gợi ý: Hãy chọn những kỹ năng thực tế nhất để hệ thống Matching gợi ý đúng ứng viên F&B tiềm năng.
                    </Text>
                  </View>
                </View>
              )}

              {/* Step 3: ĐỊA ĐIỂM & THỜI GIAN */}
              {step === 3 && (
                <View style={styles.bentoCard}>
                  <Text style={styles.sectionHeader}>ĐỊA ĐIỂM & THỜI GIAN</Text>

                  {/* Emergency Toggle Switch */}
                  <View style={styles.emergencyCard}>
                    <View style={styles.emergencyTextSection}>
                      <Text style={styles.emergencyCardTitle}>🔥 CHẾ ĐỘ ĐĂNG CA GẤP (EMERGENCY)</Text>
                      <Text style={styles.emergencyCardDesc}>
                        Tự động nhân hệ số cấp bách (+30% lương cơ bản), đẩy tin tức thì qua thông báo tới các ứng viên trong bán kính 3km.
                      </Text>
                    </View>
                    <Switch
                      trackColor={{ false: '#767577', true: theme.colors.danger }}
                      thumbColor={isEmergency ? '#FFFFFF' : '#f4f3f4'}
                      ios_backgroundColor="#3e3e3e"
                      onValueChange={toggleEmergency}
                      value={isEmergency}
                    />
                  </View>

                  <Text style={styles.inputLabel}>Địa điểm làm việc</Text>
                  <View style={{ position: 'relative', marginBottom: 16, zIndex: 10 }}>
                    <TextInput
                      style={[styles.premiumInput, { paddingRight: 105, marginBottom: 0 }]}
                      placeholder="Nhập địa chỉ hoặc nhấn nút GPS bên dưới..."
                      placeholderTextColor={theme.colors.textLight}
                      value={address}
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
                      onPress={geocodeTypedAddress}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }}>Tìm Tọa Độ</Text>
                    </TouchableOpacity>

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
                      style={[styles.gpsButton, { flex: 1, marginRight: 8, marginBottom: 0 }]}
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

                  {/* Coordinates */}
                  {latitude && longitude ? (
                    <View style={styles.coordsRow}>
                      <View style={styles.coordBox}>
                        <Text style={styles.coordLabel}>Lat: {parseFloat(latitude).toFixed(6)}</Text>
                      </View>
                      <View style={styles.coordBox}>
                        <Text style={styles.coordLabel}>Long: {parseFloat(longitude).toFixed(6)}</Text>
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

                  {/* DateTime Inputs */}
                  <Text style={[styles.inputLabel, { marginTop: 12 }]}>Ngày làm việc (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.premiumInput}
                    placeholder="2026-06-09"
                    placeholderTextColor={theme.colors.textLight}
                    value={date}
                    onChangeText={setDate}
                  />

                  <View style={styles.timeRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.inputLabel}>Giờ bắt đầu (HH:MM)</Text>
                      <TextInput
                        style={styles.premiumInput}
                        placeholder="08:00"
                        placeholderTextColor={theme.colors.textLight}
                        value={startTime}
                        onChangeText={setStartTime}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.inputLabel}>Giờ kết thúc (HH:MM)</Text>
                      <TextInput
                        style={styles.premiumInput}
                        placeholder="17:00"
                        placeholderTextColor={theme.colors.textLight}
                        value={endTime}
                        onChangeText={setEndTime}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Wizard Actions */}
          <View style={styles.actionsContainer}>
            {step > 1 ? (
              <TouchableOpacity style={styles.backButton} onPress={handlePrevStep} disabled={loading}>
                <Text style={styles.backButtonText}>⬅ Quay lại</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.backButton} onPress={() => navigateTo('employer_approvals')} disabled={loading}>
                <Text style={styles.backButtonText}>✕ Hủy</Text>
              </TouchableOpacity>
            )}

            {step < 3 ? (
              <TouchableOpacity style={styles.nextButton} onPress={handleNextStep}>
                <Text style={styles.nextButtonText}>Tiếp theo ➔</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Đăng bài tuyển dụng {isEmergency ? '⚡' : '🚀'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.termsText}>
            Bằng cách nhấn đăng tin, bạn đồng ý với các điều khoản dịch vụ của ProxiJob.
          </Text>
        </View>
      </ScrollView>

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
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.textMuted }}>Hủy</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.text }}>📍 Vị trí công việc</Text>
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
              <Text style={{ fontSize: 10, color: theme.colors.textMuted, marginTop: 4 }}>
                Tọa độ đã chọn: {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#FF6B00',
    marginRight: 10,
  },
  headerBrand: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  headerUser: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
  },
  navBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: '#F1F5F9',
  },
  navBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  pageHeader: {
    marginVertical: 12,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 40,
    letterSpacing: -1,
  },
  pageSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 8,
    lineHeight: 20,
  },
  progressSection: {
    marginTop: 8,
    marginBottom: 4,
  },
  progressTrack: {
    flexDirection: 'row',
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 1,
  },
  progressActive: {
    backgroundColor: '#FF6B00',
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepLabelActive: {
    color: '#FF6B00',
  },
  mainFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  bentoCard: {
    paddingVertical: 12,
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.5,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginLeft: 2,
  },
  premiumInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 99,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: '#FF6B001F',
    borderColor: '#FF6B00',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryPillTextActive: {
    color: '#FF6B00',
  },
  salaryInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  salaryInput: {
    flex: 1,
    fontWeight: 'bold',
    fontSize: 16,
    paddingRight: 50,
    marginBottom: 0,
  },
  salaryCurrency: {
    position: 'absolute',
    right: 16,
    fontWeight: '800',
    color: '#94A3B8',
    fontSize: 14,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  skillPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 99,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skillPillActive: {
    backgroundColor: '#FF6B001F',
    borderColor: '#FF6B00',
  },
  skillPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  skillPillTextActive: {
    color: '#FF6B00',
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoBoxText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 16,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EF44440C',
    borderWidth: 1,
    borderColor: '#EF444422',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  emergencyTextSection: {
    flex: 1,
    marginRight: 10,
  },
  emergencyCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
  },
  emergencyCardDesc: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7F1D1D',
    lineHeight: 14,
    marginTop: 4,
  },
  mapContainer: {
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapImage: {
    width: 'full',
    height: '100%',
    objectFit: 'cover',
  },
  mapOverlayPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255, 107, 0, 0.9)',
    borderRadius: 99,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  mapOverlayText: {
    fontSize: 9,
    fontWeight: 'bold',
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
  timeRow: {
    flexDirection: 'row',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  nextButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 99,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 99,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
    minWidth: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  termsText: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 16,
    lineHeight: 14,
  },
  loaderContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loaderText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 10,
    fontWeight: '600',
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
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#F3F4F6'
  },
  hBack: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  hTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
});
