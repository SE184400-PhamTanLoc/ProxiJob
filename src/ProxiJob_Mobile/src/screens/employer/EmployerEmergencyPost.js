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

export default function EmployerEmergencyPost() {
  const { createJobPostWizard, showToast, navigateTo, user } = useContext(AppContext);

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
        const road = data.address?.road || '';
        const suburb = data.address?.suburb || data.address?.quarter || '';
        const city = data.address?.city || data.address?.town || data.address?.state || '';
        const displayAddress = [road, suburb, city].filter(Boolean).join(', ');
        if (displayAddress) {
          setAddress(displayAddress);
        } else {
          setAddress(data.display_name || `Tọa độ: ${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`);
        }
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
          const road = data.address?.road || '';
          const suburb = data.address?.suburb || data.address?.quarter || '';
          const city = data.address?.city || data.address?.town || data.address?.state || '';
          const displayAddress = [road, suburb, city].filter(Boolean).join(', ');
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

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Title & Page Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Đăng tin{'\n'}tuyển dụng mới</Text>
          <Text style={styles.pageSubtitle}>Kết nối với những ứng viên tiềm năng xung quanh bạn ngay lập tức.</Text>
        </View>

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

        {dataLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loaderText}>Đang tải danh mục dữ liệu...</Text>
          </View>
        ) : (
          <View>
            {/* Step 1: NỘI DUNG CA LÀM */}
            {step === 1 && (
              <View style={[styles.bentoCard, theme.shadows.light]}>
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
              <View style={[styles.bentoCard, theme.shadows.light]}>
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
              <View style={[styles.bentoCard, theme.shadows.light]}>
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
                <TextInput
                  style={styles.premiumInput}
                  placeholder="Nhập địa chỉ hoặc nhấn nút GPS bên dưới..."
                  placeholderTextColor={theme.colors.textLight}
                  value={address}
                  onChangeText={setAddress}
                />

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
              onPress={() => setMapModalVisible(false)}
              style={{ padding: 8 }}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.textMuted }}>Hủy</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.text }}>📍 Vị trí công việc</Text>
            <TouchableOpacity onPress={handleConfirmMapLocation} style={{ padding: 8, backgroundColor: '#FF6B00', borderRadius: 8, paddingHorizontal: 12 }}>
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
    paddingBottom: 40,
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
    marginVertical: 16,
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
  bentoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
});
