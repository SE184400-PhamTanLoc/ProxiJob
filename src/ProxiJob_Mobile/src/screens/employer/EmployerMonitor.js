import React, { useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';

export default function EmployerMonitor() {
  const { shifts, staffList, loadStaffList, loadEmployerJobs, loadAttendanceLogs } = useContext(AppContext);

  React.useEffect(() => {
    loadStaffList();
    loadEmployerJobs();
    loadAttendanceLogs();
  }, []);

  // Find shifts that are active (checked-in)
  const activeStudentShifts = (shifts || []).filter(s => s.status === 'checkin_active');
  
  // Find internal staff who are marked as working
  const workingInternalStaff = (staffList || []).filter(s => s.status === 'working' && s.name !== 'Nguyễn Văn A');

  // Combine into active working personnel list
  const activePersonnel = [
    ...activeStudentShifts.map(s => ({
      id: `student-${s.id}`,
      name: 'Nguyễn Văn A (Sinh viên)',
      role: s.title.replace(' (KHẨN CẤP)', ''),
      checkInTime: s.checkInTime || '18:02',
      distance: '45m',
      isStudent: true,
      shop: s.shopName
    })),
    ...workingInternalStaff.map(s => ({
      id: `internal-${s.id}`,
      name: s.name,
      role: s.role,
      checkInTime: '17:30',
      distance: '12m',
      isStudent: false,
      shop: 'Katinat Coffee'
    }))
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* GPS Geo-fence Radar Header */}
      <View style={styles.radarHeader}>
        <Text style={styles.headerTitle}>Giám sát GPS thời gian thực</Text>
        <Text style={styles.headerSubtitle}>Theo dõi nhân sự có mặt trong bán kính cho phép của cửa hàng</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Mock Map / Radar Circle for checking locations */}
        <View style={[styles.mapCard, theme.shadows.light]}>
          <Text style={styles.mapTitle}>🗺️ Bản đồ khu vực cửa hàng (Bán kính 100m)</Text>
          <View style={styles.radarCircle}>
            <View style={styles.centerShopDot}>
              <Text style={styles.shopEmoji}>☕</Text>
            </View>
            
            {/* Plot staff on radar */}
            {activePersonnel.map((person, index) => {
              // Distribute staff visually
              const offsetAngle = index * 120;
              const radiusOffset = 50 + index * 15;
              const x = Math.cos((offsetAngle * Math.PI) / 180) * radiusOffset;
              const y = Math.sin((offsetAngle * Math.PI) / 180) * radiusOffset;

              return (
                <View
                  key={person.id}
                  style={[
                    styles.staffRadarPin,
                    { transform: [{ translateX: x }, { translateY: y }] }
                  ]}
                >
                  <View style={styles.pinDot} />
                  <View style={styles.pinLabel}>
                    <Text style={styles.pinLabelText} numberOfLines={1}>{person.name.split(' ')[0]}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          <Text style={styles.mapFooterText}>🟢 Chấm xanh biểu thị nhân sự đã check-in thành công và đang ở trong vùng an toàn.</Text>
        </View>

        {/* Live List */}
        <Text style={styles.sectionHeader}>Nhân viên đang làm việc ({activePersonnel.length})</Text>
        
        {activePersonnel.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💤</Text>
            <Text style={styles.emptyText}>Hiện tại chưa có ai check-in ca làm việc.</Text>
            <Text style={styles.emptySub}>Sinh viên check-in bằng GPS sẽ xuất hiện tại đây.</Text>
          </View>
        ) : (
          activePersonnel.map((person) => (
            <View key={person.id} style={[styles.personCard, theme.shadows.light]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.personName}>{person.name}</Text>
                  <Text style={styles.personRole}>{person.role} • {person.shop.split(' - ')[0]}</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>🟢 Verified GPS</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.cardDetails}>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Thời gian vào ca</Text>
                  <Text style={styles.detailValue}>{person.checkInTime}</Text>
                </View>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Khoảng cách thực tế</Text>
                  <Text style={styles.detailValue}>{person.distance}</Text>
                </View>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Trạng thái hiện diện</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.success }]}>AN TOÀN</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  radarHeader: {
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
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  mapCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  mapTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  radarCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: theme.colors.employer + '33',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    position: 'relative',
    marginVertical: theme.spacing.sm,
  },
  centerShopDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.employer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
    zIndex: 10,
  },
  shopEmoji: {
    fontSize: 14,
  },
  staffRadarPin: {
    position: 'absolute',
    alignItems: 'center',
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.success,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  pinLabel: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 2,
  },
  pinLabelText: {
    fontSize: 8,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  mapFooterText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 14,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  personCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  personName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  personRole: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: theme.colors.success + '1A',
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  verifiedText: {
    fontSize: 10,
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailBox: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  }
});
