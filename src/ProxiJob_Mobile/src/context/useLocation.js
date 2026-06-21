import { useState, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STUDENT_MOCK_GPS = {
  latitude: 10.7769,
  longitude: 106.7009
};

export const useLocation = () => {
  const [studentCoords, setStudentCoords] = useState(STUDENT_MOCK_GPS);
  const [simulatedDistanceToActive, setSimulatedDistanceToActive] = useState(3200);
  const [gpsStatus, setGpsStatus] = useState('pending'); // 'pending' | 'granted' | 'denied' | 'error'

  // Trên mount: thử load GPS đã lưu trước, rồi xin GPS thật
  useEffect(() => {
    const initLocation = async () => {
      // 1. Thử load tọa độ từ AsyncStorage (đã chọn qua bản đồ trước đó)
      try {
        const saved = await AsyncStorage.getItem('@student_custom_gps');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.latitude && parsed.longitude) {
            setStudentCoords(parsed);
            setGpsStatus('granted');
            return; // Đã có tọa độ tùy chọn, không cần GPS
          }
        }
      } catch (e) {
        console.log('[useLocation] Error reading saved GPS:', e);
      }

      // 2. Xin quyền GPS thiết bị
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setGpsStatus('granted');
          
          // Thử lấy vị trí cuối cùng được ghi nhận trước (chạy cực nhanh trên emulator)
          const lastKnown = await Location.getLastKnownPositionAsync({});
          if (lastKnown) {
            setStudentCoords({
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
            });
            return;
          }

          // Nếu không có, lấy vị trí hiện tại với độ chính xác vừa phải để tránh timeout
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
          });
          setStudentCoords({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        } else {
          setGpsStatus('denied');
          // Giữ mock GPS nếu bị từ chối
        }
      } catch (err) {
        console.log('[useLocation] GPS error, using mock:', err.message || err);
        setGpsStatus('error');
        // Giữ mock GPS nếu lỗi
      }
    };

    initLocation();
  }, []);

  const getDistanceInMeters = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  }, []);

  return {
    STUDENT_MOCK_GPS,
    studentCoords,
    setStudentCoords,
    simulatedDistanceToActive,
    setSimulatedDistanceToActive,
    getDistanceInMeters,
    gpsStatus
  };
};
