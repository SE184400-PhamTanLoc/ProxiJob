import { Linking, Alert } from 'react-native';

/**
 * Kicks off native mobile phone call handler pointing directly to user's phone number.
 * @param {string} phoneNumber - Target phone number fetched from API payload.
 */
export const handleCallUser = (phoneNumber) => {
  if (!phoneNumber) {
    Alert.alert("Thông báo", "Người dùng này chưa cập nhật số điện thoại!");
    return;
  }
  
  // Clean phone number formatting (keep numbers and +)
  const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
  const url = `tel:${cleanNumber}`;
  
  Linking.canOpenURL(url)
    .then((supported) => {
      if (!supported) {
        Alert.alert("Lỗi", "Thiết bị của bạn không hỗ trợ tính năng cuộc gọi này.");
      } else {
        return Linking.openURL(url);
      }
    })
    .catch((err) => {
      console.error('An error occurred during linking invocation:', err);
      Alert.alert("Lỗi", "Có lỗi xảy ra trong quá trình kết nối cuộc gọi.");
    });
};
