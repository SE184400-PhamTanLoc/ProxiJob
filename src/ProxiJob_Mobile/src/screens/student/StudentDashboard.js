import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Slider, // React Native standard Slider or custom slider container
  Modal,
  SafeAreaView,
  Platform,
  Dimensions
} from 'react-native';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';

export default function StudentDashboard() {
  const { shifts, studentCoords, getDistanceInMeters, navigateTo, loadShifts, user } = useContext(AppContext);
  
  const [radius, setRadius] = useState(5.0); // 5km radius default
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

  React.useEffect(() => {
    loadShifts();
  }, []);

  // Calculate distances and filter shifts
  const processedShifts = (shifts || []).map(shift => {
    const distMeters = getDistanceInMeters(
      studentCoords.latitude,
      studentCoords.longitude,
      shift.latitude,
      shift.longitude
    );
    const distKm = parseFloat((distMeters / 1000).toFixed(1));
    return { ...shift, distanceKm: distKm };
  });

  const filteredShifts = processedShifts.filter(shift => shift.distanceKm <= radius);

  const renderShiftCard = (shift) => {
    const isApplied = shift.status === 'applied';
    const isApproved = shift.status === 'approved' || shift.status === 'checkin_active' || shift.status === 'completed';
    const isEmergency = shift.isEmergency;

    return (
      <TouchableOpacity
        key={shift.id}
        style={[
          styles.card, 
          theme.shadows.light,
          isEmergency && styles.emergencyBorder
        ]}
        activeOpacity={0.9}
        onPress={() => navigateTo('job_detail', { shiftId: shift.id })}
      >
        {isEmergency && (
          <View style={styles.emergencyBadge}>
            <Text style={styles.emergencyBadgeText}>🔥 TUYỂN GẤP (+30% LƯƠNG)</Text>
          </View>
        )}
        
        <View style={styles.cardHeader}>
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{shift.shopName}</Text>
            <Text style={styles.jobTitle}>{shift.title}</Text>
          </View>
          <View style={styles.rateBadge}>
            <Text style={styles.rateText}>{(shift.hourlyRate).toLocaleString('vi-VN')}đ/h</Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <Text style={styles.detailText}>📅 {shift.date}</Text>
          <Text style={styles.detailText}>⏰ {shift.time}</Text>
          <Text style={styles.detailText}>📍 Khoảng cách: <Text style={styles.boldText}>{shift.distanceKm} km</Text></Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingStar}>⭐</Text>
            <Text style={styles.ratingValue}>{shift.rating} ({shift.reviewsCount} đánh giá)</Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.applyBtn,
              isApplied && styles.appliedBtn,
              isApproved && styles.approvedBtn
            ]}
            onPress={() => navigateTo('job_detail', { shiftId: shift.id })}
          >
            <Text style={styles.applyBtnText}>
              {isApproved ? 'Đã duyệt' : isApplied ? 'Đã ứng tuyển' : 'Chi tiết'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Chào buổi chiều,</Text>
          <Text style={styles.userNameText}>{user?.name || 'Nguyễn Văn A'} 👋</Text>
        </View>
        <View style={styles.gpsIndicator}>
          <Text style={styles.gpsSymbol}>📍</Text>
          <Text style={styles.gpsText}>Quận 1, TP.HCM</Text>
        </View>
      </View>

      {/* Radius slider card */}
      <View style={[styles.filterCard, theme.shadows.light]}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderTitle}>Tìm kiếm Hyperlocal (Bán kính)</Text>
          <Text style={styles.sliderValue}>{radius.toFixed(1)} km</Text>
        </View>
        
        {/* React Native Slider Mock for compatibility on web & device */}
        <View style={styles.sliderTrackContainer}>
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
            style={[styles.radiusOption, radius === 8.0 && styles.activeRadius]} 
            onPress={() => setRadius(8.0)}
          >
            <Text style={[styles.radiusOptionText, radius === 8.0 && styles.activeRadiusText]}>8km</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.radiusOption, radius === 10.0 && styles.activeRadius]} 
            onPress={() => setRadius(10.0)}
          >
            <Text style={[styles.radiusOptionText, radius === 10.0 && styles.activeRadiusText]}>10km</Text>
          </TouchableOpacity>
        </View>
        
        {/* Toggle between list and map */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' && styles.activeToggle]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.toggleText, viewMode === 'list' && styles.activeToggleText]}>📋 Xem Danh Sách ({filteredShifts.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'map' && styles.activeToggle]}
            onPress={() => setViewMode('map')}
          >
            <Text style={[styles.toggleText, viewMode === 'map' && styles.activeToggleText]}>🗺️ Xem Bản Đồ</Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'list' ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {filteredShifts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>Không tìm thấy ca làm việc nào trong bán kính {radius}km.</Text>
              <Text style={styles.emptySub}>Hãy tăng phạm vi tìm kiếm lên xem sao nhé!</Text>
            </View>
          ) : (
            filteredShifts.map(renderShiftCard)
          )}
        </ScrollView>
      ) : (
        /* Mock premium map representation with interactive radar style */
        <View style={styles.mapContainer}>
          <View style={styles.radarCircleBig}>
            <View style={styles.radarCircleMedium}>
              <View style={styles.radarCircleSmall}>
                {/* User point */}
                <View style={styles.userDot}>
                  <Text style={styles.userEmoji}>🎓</Text>
                </View>
              </View>
            </View>

            {/* Plot filtered jobs as absolute pins */}
            {filteredShifts.map((shift, index) => {
              // Calculate angles for mock visual mapping distribution
              const angle = (index * (360 / Math.max(filteredShifts.length, 1)) * Math.PI) / 180;
              const maxOffset = 120; // max radius of map
              const offsetRatio = (shift.distanceKm / radius);
              const xOffset = Math.cos(angle) * maxOffset * offsetRatio;
              const yOffset = Math.sin(angle) * maxOffset * offsetRatio;

              return (
                <TouchableOpacity
                  key={shift.id}
                  style={[
                    styles.pin,
                    { transform: [{ translateX: xOffset }, { translateY: yOffset }] },
                    shift.isEmergency && styles.emergencyPin
                  ]}
                  activeOpacity={0.8}
                  onPress={() => navigateTo('job_detail', { shiftId: shift.id })}
                >
                  <Text style={styles.pinIcon}>{shift.isEmergency ? '🔥' : '☕'}</Text>
                  <View style={styles.pinLabel}>
                    <Text style={styles.pinLabelText} numberOfLines={1}>{shift.shopName.split(' - ')[0]}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          
          <Text style={styles.radarTip}>Nhấn vào ghim trên bản đồ radar để xem chi tiết công việc.</Text>
        </View>
      )}
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
  welcomeText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
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
  },
  gpsSymbol: {
    fontSize: 12,
    marginRight: 4,
  },
  gpsText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  filterCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    paddingBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  emergencyBorder: {
    borderColor: theme.colors.danger,
    borderWidth: 1.5,
  },
  emergencyBadge: {
    backgroundColor: theme.colors.danger,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  emergencyBadgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  shopInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  shopName: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 2,
  },
  rateBadge: {
    backgroundColor: theme.colors.success + '1A',
    borderColor: theme.colors.success + '33',
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  rateText: {
    fontSize: 13,
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  cardDetails: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: 8,
  },
  detailText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginVertical: 2,
  },
  boldText: {
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStar: {
    marginRight: 4,
  },
  ratingValue: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  applyBtn: {
    backgroundColor: theme.colors.student,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
    shadowColor: theme.colors.student,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  appliedBtn: {
    backgroundColor: theme.colors.textLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  approvedBtn: {
    backgroundColor: theme.colors.success,
    shadowOpacity: 0,
    elevation: 0,
  },
  applyBtnText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
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
  }
});
