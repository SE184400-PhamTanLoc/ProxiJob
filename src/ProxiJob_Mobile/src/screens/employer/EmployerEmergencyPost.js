import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';

export default function EmployerEmergencyPost({ onPostSuccess }) {
  const { createEmergencyShift } = useContext(AppContext);
  const [title, setTitle] = useState('Nhân viên Phục vụ gấp tối nay');
  const [shopName, setShopName] = useState('Katinat Coffee - Đồng Khởi');
  const [hourlyRate, setHourlyRate] = useState('52000');
  const [time, setTime] = useState('18:00 - 22:00');
  
  const [successVisible, setSuccessVisible] = useState(false);
  const [postedShiftInfo, setPostedShiftInfo] = useState(null);

  const handlePostEmergency = () => {
    if (title.trim() && shopName.trim() && hourlyRate.trim() && time.trim()) {
      createEmergencyShift(title, shopName, hourlyRate, time);
      setPostedShiftInfo({ title, shopName, hourlyRate, time });
      setSuccessVisible(true);
      
      // Clear inputs
      setTitle('Nhân viên Phục vụ gấp tối nay');
      setHourlyRate('52000');
      
      // Hide success banner after 4 seconds
      setTimeout(() => {
        setSuccessVisible(false);
        if (onPostSuccess) {
          onPostSuccess();
        }
      }, 4000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đăng ca gấp (Emergency Post)</Text>
        <Text style={styles.headerSubtitle}>Shortcut đẩy tin tuyển dụng tức thì lên hệ thống khi quán thiếu người đột xuất</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {successVisible && postedShiftInfo && (
          <View style={styles.successBanner}>
            <Text style={styles.successIcon}>🚀</Text>
            <View style={{flex: 1}}>
              <Text style={styles.successTitle}>ĐÃ PHÁT TÍN TUYỂN DỤNG KHẨN CẤP!</Text>
              <Text style={styles.successText}>
                Đơn hàng "{postedShiftInfo.title}" tại {postedShiftInfo.shopName} đã được đẩy lên bản đồ hyperlocal.
              </Text>
              <Text style={styles.successTextSub}>
                Hệ thống Matching đã gửi thông báo đẩy qua RabbitMQ tới 18 sinh viên F&B trong bán kính 3km.
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.formCard, theme.shadows.light]}>
          <Text style={styles.formTitle}>Chi tiết ca tuyển gấp</Text>
          
          <Text style={styles.inputLabel}>Tên công việc cần tuyển</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Nhân viên phục vụ bàn gấp trưa..."
            placeholderTextColor={theme.colors.textLight}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.inputLabel}>Cửa hàng / Chi nhánh đăng bài</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Katinat Coffee - Đồng Khởi..."
            placeholderTextColor={theme.colors.textLight}
            value={shopName}
            onChangeText={setShopName}
          />

          <View style={styles.inputRow}>
            <View style={{flex: 1, marginRight: 8}}>
              <Text style={styles.inputLabel}>Mức lương đề xuất (đ/h)</Text>
              <TextInput
                style={[styles.input, styles.highlightInput]}
                placeholder="Ví dụ: 45000..."
                placeholderTextColor={theme.colors.textLight}
                keyboardType="numeric"
                value={hourlyRate}
                onChangeText={setHourlyRate}
              />
            </View>
            <View style={{flex: 1, marginLeft: 8}}>
              <Text style={styles.inputLabel}>Khung giờ làm việc</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: 18:00 - 22:00..."
                placeholderTextColor={theme.colors.textLight}
                value={time}
                onChangeText={setTime}
              />
            </View>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ RÀNG BUỘC KỸ THUẬT & NGHIỆP VỤ</Text>
            <Text style={styles.warningText}>
              • Lương ca gấp được tự động nhân hệ số cấp bách (+30% lương cơ bản).
            </Text>
            <Text style={styles.warningText}>
              • Định danh ID ca làm việc được tự động chuẩn hóa sang định dạng Integer khóa chính.
            </Text>
            <Text style={styles.warningText}>
              • Các trường Audit (CreatedBy, UpdatedBy) sẽ tự động được ghi nhận để kiểm tra hệ thống.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.postBtn}
            activeOpacity={0.9}
            onPress={handlePostEmergency}
          >
            <Text style={styles.postBtnText}>🔥 KÍCH HOẠT ĐĂNG CA GẤP NGAY</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.matchingOverviewCard}>
          <Text style={styles.matchingTitle}>📍 Hoạt động của PostGIS & Location Service</Text>
          <Text style={styles.matchingText}>
            Khi nhấn đăng ca gấp, tọa độ GPS của cửa hàng sẽ được PostGIS quét đối chiếu với tọa độ vị trí hiện tại của các sinh viên đang online trong bán kính 3km để hiển thị lên bản đồ hyperlocal của họ tức thì.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  successBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.success + '1A',
    borderColor: theme.colors.success + '33',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'flex-start',
  },
  successIcon: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  successTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  successText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  successTextSub: {
    fontSize: 11,
    color: theme.colors.textLight,
    fontStyle: 'italic',
    lineHeight: 14,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  input: {
    height: 46,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  highlightInput: {
    borderColor: theme.colors.primary + '66',
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  warningBox: {
    backgroundColor: theme.colors.surfaceSecondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  warningTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  warningText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  postBtn: {
    backgroundColor: theme.colors.danger,
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  postBtnText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  matchingOverviewCard: {
    backgroundColor: theme.colors.employer + '0A',
    borderColor: theme.colors.employer + '1A',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  matchingTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.employer,
    marginBottom: 4,
  },
  matchingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  }
});
