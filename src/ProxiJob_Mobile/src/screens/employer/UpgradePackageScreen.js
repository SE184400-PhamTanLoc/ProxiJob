import React, { useContext, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';
import { getPlansApi, purchasePlanApi } from '../../api/auth';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW } = Dimensions.get('window');

const FONT_REGULAR = Platform.OS === 'web' ? '"Plus Jakarta Sans", sans-serif' : 'PlusJakartaSans-Regular';
const FONT_BOLD = Platform.OS === 'web' ? '"Plus Jakarta Sans", sans-serif' : 'PlusJakartaSans-Bold';
const FONT_EXTRABOLD = Platform.OS === 'web' ? '"Plus Jakarta Sans", sans-serif' : 'PlusJakartaSans-ExtraBold';

const FEATURE_ROWS = [
  { label: 'Đăng tin tuyển dụng', basic: '15 tin', standard: 'Không giới hạn', premium: 'Không giới hạn' },
  { label: 'Thời hạn gói', basic: '30 ngày', standard: '30 ngày', premium: '30 ngày' },
  { label: 'Lọc ứng viên AI', basic: false, standard: true, premium: true },
  { label: 'Ưu tiên hiển thị', basic: false, standard: false, premium: true },
  { label: 'Quản lý nhân sự', basic: false, standard: false, premium: true },
  { label: 'Xếp lịch tự động', basic: false, standard: true, premium: true },
];

export default function UpgradePackageScreen() {
  const { navigateTo, showToast, user, goBack } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(null);
  const [plans, setPlans] = useState([]);
  const [fetchingPlans, setFetchingPlans] = useState(true);

  const isPlanActive = (planName) => {
    if (!user || !user.subscriptionTier) return false;
    // Standard matches both 'Standard' and 'Enterprise' (for demo purposes)
    if (planName.toLowerCase() === 'standard' && user.subscriptionTier.toLowerCase() === 'enterprise') {
      return true;
    }
    if (planName.toLowerCase() === 'premium' && user.subscriptionTier.toLowerCase() === 'enterprise') {
      return true;
    }
    return user.subscriptionTier.toLowerCase() === planName.toLowerCase();
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => { loadPlans(); }, []);

  async function loadPlans() {
    try {
      const data = await getPlansApi();
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('Error loading plans:', err);
      setPlans([
        { id: 1, planName: 'PerShift', price: 15000, jobPostLimit: 1, description: 'Đăng 1 ca làm việc', durationDays: 1, hasPriorityDisplay: false, hasHrManagement: false },
        { id: 2, planName: 'Basic', price: 99000, jobPostLimit: 15, description: 'Gói tháng cơ bản', durationDays: 30, hasPriorityDisplay: false, hasHrManagement: false },
        { id: 3, planName: 'Standard', price: 199000, jobPostLimit: 999, description: 'Đăng tuyển không giới hạn', durationDays: 30, hasPriorityDisplay: false, hasHrManagement: false },
        { id: 4, planName: 'Premium', price: 299000, jobPostLimit: 999, description: 'Ưu tiên hiển thị + quản lý nhân sự', durationDays: 30, hasPriorityDisplay: true, hasHrManagement: true },
      ]);
    } finally { setFetchingPlans(false); }
  }

  const handlePurchase = async (plan) => {
    if (isPlanActive(plan.planName)) {
      showToast('Đây là gói hiện tại của bạn.', 'info');
      return;
    }
    setLoading(plan.id);
    try {
      const res = await purchasePlanApi(plan.id);
      showToast(`Đơn gói ${plan.planName} đã được tạo!`, 'success');
      navigateTo('payment_qr', {
        orderId: res.orderId, orderCode: res.orderCode,
        amount: res.amount, expiresAt: res.expiresAt,
        planName: plan.planName, bankTransfer: res.bankTransfer,
      });
    } catch (err) {
      showToast('Tạo đơn thất bại: ' + (err.message || 'Thử lại.'), 'error');
    } finally { setLoading(null); }
  };

  const fmt = (p) => (!p || p === 0) ? '0đ' : p.toLocaleString('vi-VN') + 'đ';

  const pershift = plans.find(p => p.planName === 'PerShift');
  const basic = plans.find(p => p.planName === 'Basic');
  const standard = plans.find(p => p.planName === 'Standard');
  const premium = plans.find(p => p.planName === 'Premium');

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
        <TouchableOpacity style={s.hBack} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={s.hTitle}>Các gói dịch vụ</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Hero Section */}
          <View style={s.hero}>
            <Text style={s.heroTitle}>Mở khóa tiềm năng của bạn</Text>
            <Text style={s.heroSub}>
              Chọn gói dịch vụ phù hợp để tối ưu quy trình tuyển dụng và kết nối với mạng lưới việc làm bán thời gian ngay hôm nay.
            </Text>
          </View>

          {fetchingPlans ? (
            <ActivityIndicator size="large" color="#FF6B00" style={{ marginVertical: 60 }} />
          ) : (
            <>
              {/* ═══ GÓI ĐĂNG CA LẺ ═══ */}
              {pershift && (
                <View style={s.card}>
                  {/* Glowing grey ambient orb */}
                  <View style={s.orbGrey} />

                  <View style={s.cardTop}>
                    <View style={[s.cardIconCircle, { backgroundColor: '#F3F4F6' }]}>
                      <Text style={s.cardIcon}>⚡</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardName}>Gói đăng ca lẻ</Text>
                      <Text style={s.cardDesc}>Đăng 1 ca làm việc</Text>
                    </View>
                  </View>
                  <View style={s.priceRow}>
                    <Text style={s.price}>{fmt(pershift.price)}</Text>
                    <Text style={s.pricePer}>/ca</Text>
                  </View>
                  <View style={s.features}>
                    <Feat text="1 tin đăng tuyển dụng" color="#6B7280" />
                    <Feat text="Hiệu lực trong 1 ngày" color="#6B7280" />
                    <Feat text="Không ràng buộc hợp đồng" color="#6B7280" />
                  </View>
                  <PurchaseBtn
                    plan={pershift}
                    loading={loading}
                    onPress={handlePurchase}
                    label="Nâng cấp ngay"
                    color="#475569"
                    outline
                  />
                </View>
              )}

              {/* ═══ GÓI CƠ BẢN ═══ */}
              {basic && (
                <View style={s.card}>
                  {/* Glowing green ambient orb */}
                  <View style={s.orbGreen} />

                  <View style={s.cardTop}>
                    <View style={[s.cardIconCircle, { backgroundColor: '#E8F5E9' }]}>
                      <Text style={s.cardIcon}>🏪</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardName}>Cơ bản</Text>
                      <Text style={s.cardDesc}>Dành cho cửa hàng nhỏ</Text>
                    </View>
                  </View>
                  <View style={s.priceRow}>
                    <Text style={s.price}>{fmt(basic.price)}</Text>
                    <Text style={s.pricePer}>/tháng</Text>
                  </View>
                  <View style={s.features}>
                    <Feat text={`Đăng tuyển ${basic.jobPostLimit} tin/tháng`} color="#10B981" />
                    <Feat text="Mô tả vị trí cơ bản" color="#10B981" />
                    <Feat text="Quản lý ứng viên qua CV" color="#10B981" />
                  </View>
                  <PurchaseBtn
                    plan={basic}
                    loading={loading}
                    onPress={handlePurchase}
                    label={isPlanActive('Basic') ? "Gói hiện tại ✓" : "Nâng cấp ngay"}
                    color={isPlanActive('Basic') ? "#10B981" : "#10B981"}
                    disabled={isPlanActive('Basic')}
                  />
                </View>
              )}

              {/* ═══ GÓI CHUYÊN NGHIỆP (standard - purple theme in screenshot) ═══ */}
              {standard && (
                <View style={[s.card, s.cardPro]}>
                  {/* Glowing purple ambient orb with pulse animation */}
                  <Animated.View style={[s.orbPurple, { transform: [{ scale: pulseAnim }] }]} />

                  <Animated.View style={[s.proBadge, { transform: [{ scale: pulseAnim }] }]}>
                    <Text style={s.proBadgeText}>🔥 PHỔ BIẾN NHẤT</Text>
                  </Animated.View>
                  <View style={s.cardTop}>
                    <View style={[s.cardIconCircle, { backgroundColor: '#F3E8FF' }]}>
                      <Text style={[s.cardIcon, { color: '#7C3AED' }]}>🚀</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cardName, { color: '#7C3AED' }]}>Chuyên nghiệp</Text>
                      <Text style={s.cardDesc}>Không giới hạn bài đăng</Text>
                    </View>
                  </View>
                  <View style={s.priceRow}>
                    <Text style={[s.price, { color: '#7C3AED' }]}>{fmt(standard.price)}</Text>
                    <Text style={s.pricePer}>/tháng</Text>
                  </View>
                  <View style={s.features}>
                    <Feat text="Mọi tính năng Cơ bản" color="#7C3AED" />
                    <Feat text="Không giới hạn bài đăng" color="#7C3AED" />
                    <Feat text="Lọc ứng viên thông minh AI" color="#7C3AED" />
                    <Feat text="Xếp lịch tự động" color="#7C3AED" />
                  </View>
                  <PurchaseBtn
                    plan={standard}
                    loading={loading}
                    onPress={handlePurchase}
                    label={isPlanActive('Standard') ? "Gói hiện tại ✓" : "Nâng cấp Chuyên nghiệp ⚡"}
                    color={isPlanActive('Standard') ? "#10B981" : "#7C3AED"}
                    disabled={isPlanActive('Standard')}
                  />
                </View>
              )}

              {/* ═══ GÓI CAO CẤP (premium - orange theme in screenshot) ═══ */}
              {premium && (
                <View style={[s.card, s.cardPremium]}>
                  {/* Glowing orange ambient orb with pulse animation */}
                  <Animated.View style={[s.orbOrange, { transform: [{ scale: pulseAnim }] }]} />

                  {/* Decorative corner accents for CAO CẤP package */}
                  <View style={s.bracketTL} />
                  <View style={s.bracketTR} />
                  <View style={s.bracketBL} />
                  <View style={s.bracketBR} />

                  <Animated.View style={[s.premBadge, { transform: [{ scale: pulseAnim }] }]}>
                    <Text style={s.premBadgeText}>👑 CAO CẤP - TOÀN DIỆN</Text>
                  </Animated.View>
                  <View style={s.cardTop}>
                    <View style={[s.cardIconCircle, { backgroundColor: '#FFEBE0' }]}>
                      <Text style={[s.cardIcon, { color: '#FF6B00' }]}>👑</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cardName, { color: '#FF6B00' }]}>Cao cấp</Text>
                      <Text style={s.cardDesc}>Toàn diện nhất cho doanh nghiệp</Text>
                    </View>
                  </View>
                  <View style={s.priceRow}>
                    <Text style={[s.price, { color: '#FF6B00' }]}>{fmt(premium.price)}</Text>
                    <Text style={s.pricePer}>/tháng</Text>
                  </View>
                  <View style={s.features}>
                    <Feat text="Mọi tính năng Chuyên nghiệp" color="#FF6B00" />
                    <Feat text="Ưu tiên hiển thị bài đăng" color="#FF6B00" />
                    <Feat text="Quản lý nhân sự HRM Lite" color="#FF6B00" />
                    <Feat text="Quyền hẹn phỏng vấn 1-1" color="#FF6B00" />
                  </View>
                  <PurchaseBtn
                    plan={premium}
                    loading={loading}
                    onPress={handlePurchase}
                    label={isPlanActive('Premium') ? "Gói hiện tại ✓" : "Sở hữu Premium ngay 👑"}
                    color={isPlanActive('Premium') ? "#10B981" : "#FF6B00"}
                    disabled={isPlanActive('Premium')}
                  />
                </View>
              )}

              {/* ═══ SO SÁNH TÍNH NĂNG ═══ */}
              <View style={s.compareWrap}>
                <Text style={s.compareTitle}>So sánh tính năng</Text>
                <View style={s.tHead}>
                  <View style={s.tFeatCol}><Text style={s.tHText}>Tính năng</Text></View>
                  <View style={s.tValCol}><Text style={s.tHText}>Cơ{'\n'}bản</Text></View>
                  <View style={s.tValCol}><Text style={[s.tHText, { color: '#7C3AED' }]}>Chuyên{'\n'}nghiệp</Text></View>
                  <View style={s.tValCol}><Text style={[s.tHText, { color: '#FF6B00' }]}>Cao{'\n'}cấp</Text></View>
                </View>
                {FEATURE_ROWS.map((r, i) => (
                  <View key={i} style={[s.tRow, i % 2 === 0 && { backgroundColor: '#FAFAFA' }]}>
                    <View style={s.tFeatCol}><Text style={s.tFeatText}>{r.label}</Text></View>
                    <View style={s.tValCol}><Cell v={r.basic} /></View>
                    <View style={s.tValCol}><Cell v={r.standard} c="#7C3AED" /></View>
                    <View style={s.tValCol}><Cell v={r.premium} c="#FF6B00" /></View>
                  </View>
                ))}
              </View>

              {/* ═══ TRUST SECTION ═══ */}
              <View style={s.trustHero}>
                <Text style={s.trustTitle}>Hơn 50.000 người đã{'\n'}nâng cấp</Text>
                <Text style={s.trustSub}>Được tin dùng bởi các chủ quán, nhà hàng, quán cà phê trên toàn quốc</Text>
              </View>
              <TrustBadge icon="🔒" title="Thanh toán bảo mật" desc="Chuyển khoản an toàn qua ngân hàng 24/7" />
              <TrustBadge icon="💯" title="Hoàn tiền 100%" desc="Hỗ trợ hoàn phí dịch vụ trong 7 ngày nếu không hài lòng" />

              <View style={{ height: 24 }} />
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ── Small Components ── */
function Feat({ text, color }) {
  return (
    <View style={s.featRow}>
      <Ionicons name="checkmark-circle" size={16} color={color} style={{ marginRight: 8, marginTop: 1 }} />
      <Text style={s.featText}>{text}</Text>
    </View>
  );
}

function PurchaseBtn({ plan, loading, onPress, label, color, outline, disabled }) {
  const isLoading = loading === plan.id;
  return (
    <TouchableOpacity
      style={[
        s.purchaseBtn,
        outline
          ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: color }
          : { backgroundColor: disabled ? '#E2E8F0' : color },
      ]}
      onPress={() => !disabled && onPress(plan)}
      disabled={isLoading || disabled}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color={outline ? color : '#FFF'} size="small" />
      ) : (
        <Text style={[s.purchaseBtnText, outline && { color }, disabled && { color: '#94A3B8' }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

function Cell({ v, c }) {
  if (typeof v === 'string') return <Text style={[s.cellTxt, c && { color: c, fontWeight: '700' }]}>{v}</Text>;
  if (v === true) {
    return <Ionicons name="checkmark-circle" size={16} color={c || '#10B981'} />;
  }
  return <Text style={s.cellX}>—</Text>;
}

function TrustBadge({ icon, title, desc }) {
  return (
    <View style={s.trustBadge}>
      <View style={s.tbIconWrapper}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.tbTitle}>{title}</Text>
        <Text style={s.tbDesc}>{desc}</Text>
      </View>
    </View>
  );
}

/* ── Styles ── */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, // Light neutral backdrop
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 },

  hero: { marginTop: 8, marginBottom: 28 },
  heroTitle: { fontSize: 30, fontWeight: '900', color: '#0F172A', lineHeight: 36, fontFamily: FONT_EXTRABOLD },
  heroSub: { fontSize: 13, color: '#475569', lineHeight: 20, marginTop: 10, fontWeight: '500', fontFamily: FONT_REGULAR },

  // Cards
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1.5, borderColor: '#E2E8F0',
    padding: 24, marginBottom: 28, position: 'relative', overflow: 'visible', // Visible to allow floating badge
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 3,
  },
  cardPro: { 
    borderColor: '#7C3AED', 
    borderWidth: 2, 
    paddingTop: 32,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  cardPremium: { 
    borderColor: '#FF6B00', 
    borderWidth: 2, 
    paddingTop: 32, 
    backgroundColor: '#FFFDFB',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },

  proBadge: {
    position: 'absolute', 
    top: -14, 
    alignSelf: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 6, 
    paddingHorizontal: 16,
    borderRadius: 9999,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  proBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, fontFamily: FONT_EXTRABOLD },
  premBadge: {
    position: 'absolute', 
    top: -14, 
    alignSelf: 'center',
    backgroundColor: '#FF6B00',
    paddingVertical: 6, 
    paddingHorizontal: 16,
    borderRadius: 9999,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  premBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, fontFamily: FONT_EXTRABOLD },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: { fontSize: 22 },
  cardName: { fontSize: 20, fontWeight: '800', color: '#0F172A', fontFamily: FONT_EXTRABOLD },
  cardDesc: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500', fontFamily: FONT_REGULAR },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  price: { fontSize: 32, fontWeight: '900', color: '#0F172A', fontFamily: FONT_EXTRABOLD },
  pricePer: { fontSize: 14, color: '#64748B', marginLeft: 4, fontWeight: '700', fontFamily: FONT_BOLD },

  features: { marginBottom: 20 },
  featRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  featText: { fontSize: 13, color: '#334155', fontWeight: '500', flex: 1, fontFamily: FONT_REGULAR },

  purchaseBtn: { height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  purchaseBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', fontFamily: FONT_EXTRABOLD },

  // Compare Table
  compareWrap: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    borderWidth: 1.5, 
    borderColor: '#E2E8F0', 
    overflow: 'hidden', 
    marginTop: 16, 
    marginBottom: 32,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
  },
  compareTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', padding: 20, paddingBottom: 12, fontFamily: FONT_EXTRABOLD },
  tHead: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1.5, borderBottomColor: '#E2E8F0' },
  tFeatCol: { flex: 2, justifyContent: 'center' },
  tValCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tHText: { fontSize: 10, fontWeight: '800', color: '#475569', textAlign: 'center', lineHeight: 14, fontFamily: FONT_EXTRABOLD },
  tRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tFeatText: { fontSize: 12, color: '#334155', fontWeight: '600', fontFamily: FONT_BOLD },
  cellTxt: { fontSize: 11, color: '#1E293B', fontWeight: '700', textAlign: 'center', fontFamily: FONT_BOLD },
  cellX: { fontSize: 14, color: '#94A3B8', fontWeight: 'bold' },

  // Trust
  trustHero: { backgroundColor: '#FFF7ED', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: '#FFE2D1' },
  trustTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center', lineHeight: 26, fontFamily: FONT_EXTRABOLD },
  trustSub: { fontSize: 12, color: '#7C2D12', textAlign: 'center', marginTop: 8, lineHeight: 18, fontWeight: '500', fontFamily: FONT_REGULAR },
  trustBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 14, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 16, 
    borderWidth: 1.5, 
    borderColor: '#E2E8F0', 
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  tbIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tbTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', fontFamily: FONT_EXTRABOLD },
  tbDesc: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '500', fontFamily: FONT_REGULAR },

  // Ambient Glow Orbs
  orbGrey: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#64748B',
    opacity: 0.04,
    top: -40,
    right: -40,
    zIndex: -1,
  },
  orbGreen: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#10B981',
    opacity: 0.05,
    top: -40,
    right: -40,
    zIndex: -1,
  },
  orbPurple: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#7C3AED',
    opacity: 0.05,
    top: -50,
    right: -50,
    zIndex: -1,
  },
  orbOrange: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#FF6B00',
    opacity: 0.07,
    top: -50,
    right: -50,
    zIndex: -1,
  },

  // Accents for Premium
  bracketTL: { position: 'absolute', top: 10, left: 10, width: 16, height: 16, borderTopWidth: 3.5, borderLeftWidth: 3.5, borderColor: '#FF6B00', borderTopLeftRadius: 6 },
  bracketTR: { position: 'absolute', top: 10, right: 10, width: 16, height: 16, borderTopWidth: 3.5, borderRightWidth: 3.5, borderColor: '#FF6B00', borderTopRightRadius: 6 },
  bracketBL: { position: 'absolute', bottom: 10, left: 10, width: 16, height: 16, borderBottomWidth: 3.5, borderLeftWidth: 3.5, borderColor: '#FF6B00', borderBottomLeftRadius: 6 },
  bracketBR: { position: 'absolute', bottom: 10, right: 10, width: 16, height: 16, borderBottomWidth: 3.5, borderRightWidth: 3.5, borderColor: '#FF6B00', borderBottomRightRadius: 6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  hBack: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  hTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', fontFamily: FONT_EXTRABOLD },
});
