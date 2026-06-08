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

export default function StudentPortfolio() {
  const { reviews, shifts, user } = useContext(AppContext);

  // Compute stats based on completed shifts
  const completedShifts = shifts.filter(s => s.status === 'completed');
  const totalCompletedShifts = completedShifts.length; // remove mock baseline
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  const getInitials = (name) => {
    if (!name) return 'SV';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return 'SV';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const displayName = user?.name || 'Sinh viên';
  const displayEmail = user?.email || '';
  const initials = getInitials(displayName);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Card Header */}
        <View style={[styles.profileHeaderCard, theme.shadows.light]}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓</Text>
            </View>
          </View>
          
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userRole}>{displayEmail || 'Đại học Quốc Gia TP.HCM'}</Text>
          <Text style={styles.userBio}>Đam mê học hỏi ngành pha chế và F&B. Cam kết đi làm đúng giờ, uy tín.</Text>
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
            <Text style={styles.statValue}>100%</Text>
            <Text style={styles.statLabel}>Tỷ lệ hoàn thành</Text>
          </View>
        </View>

        {/* Skills Section */}
        <Text style={styles.sectionHeader}>Kỹ năng nổi bật</Text>
        <View style={styles.skillsContainer}>
          {['Pha chế Latte', 'Chăm sóc khách hàng', 'Thao tác POS', 'Đúng giờ', 'Quản lý quầy bar', 'Tiếng Anh giao tiếp'].map((skill, index) => (
            <View key={index} style={[styles.skillBadge, index === 0 && styles.featuredSkill]}>
              <Text style={[styles.skillText, index === 0 && styles.featuredSkillText]}>
                {index === 0 ? '✨ ' + skill : skill}
              </Text>
            </View>
          ))}
        </View>

        {/* E-Portfolio Feedbacks */}
        <Text style={styles.sectionHeader}>Đánh giá từ chủ quán ({reviews.length})</Text>
        <View style={styles.reviewsList}>
          {reviews.map((review) => (
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
          ))}
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
  }
});
