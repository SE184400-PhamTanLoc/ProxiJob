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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
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
                  <View style={s.proBadge}>
                    <Text style={s.proBadgeText}>🔥 PHỔ BIẾN NHẤT</Text>
                  </View>
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
                    label={isPlanActive('Standard') ? "Gói hiện tại ✓" : "Nâng cấp ngay"}
                    color={isPlanActive('Standard') ? "#10B981" : "#7C3AED"}
                    disabled={isPlanActive('Standard')}
                  />
                </View>
              )}

              {/* ═══ GÓI CAO CẤP (premium - orange theme in screenshot) ═══ */}
              {premium && (
                <View style={[s.card, s.cardPremium]}>
                  {/* Decorative corner accents for CAO CẤP package */}
                  <View style={s.bracketTL} />
                  <View style={s.bracketTR} />
                  <View style={s.bracketBL} />
                  <View style={s.bracketBR} />

                  <View style={s.premBadge}>
                    <Text style={s.premBadgeText}>👑 CAO CẤP - TOÀN DIỆN</Text>
                  </View>
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
                    label={isPlanActive('Premium') ? "Gói hiện tại ✓" : "Nâng cấp ngay"}
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 },

  hero: { marginTop: 8, marginBottom: 24 },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#1E293B', lineHeight: 38 },
  heroSub: { fontSize: 13, color: '#64748B', lineHeight: 20, marginTop: 10, fontWeight: '500' },

  // Cards
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1.5, borderColor: '#F1F5F9',
    padding: 24, marginBottom: 20, position: 'relative', overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
  },
  cardPro: { borderColor: '#7C3AED', borderWidth: 2, paddingTop: 40 },
  cardPremium: { borderColor: '#FF6B00', borderWidth: 2, paddingTop: 40, backgroundColor: '#FFFDFB' },

  proBadge: {
    position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#7C3AED',
    paddingVertical: 6, alignItems: 'center',
  },
  proBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  premBadge: {
    position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#FF6B00',
    paddingVertical: 6, alignItems: 'center',
  },
  premBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: { fontSize: 22 },
  cardName: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  cardDesc: { fontSize: 12, color: '#94A3B8', marginTop: 1, fontWeight: '500' },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  price: { fontSize: 32, fontWeight: '900', color: '#1E293B' },
  pricePer: { fontSize: 14, color: '#94A3B8', marginLeft: 4, fontWeight: '700' },

  features: { marginBottom: 20 },
  featRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  featText: { fontSize: 13, color: '#475569', fontWeight: '500', flex: 1 },

  purchaseBtn: { height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  purchaseBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  // Compare Table
  compareWrap: { borderRadius: 24, borderWidth: 1.5, borderColor: '#F1F5F9', overflow: 'hidden', marginTop: 12, marginBottom: 24 },
  compareTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', padding: 20, paddingBottom: 12 },
  tHead: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1.5, borderBottomColor: '#F1F5F9' },
  tFeatCol: { flex: 2, justifyContent: 'center' },
  tValCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tHText: { fontSize: 10, fontWeight: '800', color: '#64748B', textAlign: 'center', lineHeight: 14 },
  tRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  tFeatText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  cellTxt: { fontSize: 11, color: '#334155', fontWeight: '700', textAlign: 'center' },
  cellX: { fontSize: 14, color: '#CBD5E1', fontWeight: 'bold' },

  // Trust
  trustHero: { backgroundColor: '#FFF7ED', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#FFE4E6' },
  trustTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', textAlign: 'center', lineHeight: 26 },
  trustSub: { fontSize: 12, color: '#7C2D12', textAlign: 'center', marginTop: 8, lineHeight: 18, fontWeight: '500' },
  trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: '#F1F5F9', marginBottom: 12 },
  tbIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tbTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  tbDesc: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '500' },

  // Accents for Premium
  bracketTL: { position: 'absolute', top: 12, left: 12, width: 14, height: 14, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderColor: '#FF6B00', borderTopLeftRadius: 4 },
  bracketTR: { position: 'absolute', top: 12, right: 12, width: 14, height: 14, borderTopWidth: 2.5, borderRightWidth: 2.5, borderColor: '#FF6B00', borderTopRightRadius: 4 },
  bracketBL: { position: 'absolute', bottom: 12, left: 12, width: 14, height: 14, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderColor: '#FF6B00', borderBottomLeftRadius: 4 },
  bracketBR: { position: 'absolute', bottom: 12, right: 12, width: 14, height: 14, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderColor: '#FF6B00', borderBottomRightRadius: 4 },
  header: {
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
