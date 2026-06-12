import React, { useContext, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';
import { getPlansApi, purchasePlanApi } from '../../api/auth';

const { width: SW } = Dimensions.get('window');

const FEATURE_ROWS = [
  { label: 'Đăng tin tuyển dụng', basic: '15 tin', standard: '999 tin', premium: '999 tin' },
  { label: 'Thời hạn gói', basic: '30 ngày', standard: '30 ngày', premium: '30 ngày' },
  { label: 'Lọc ứng viên AI', basic: false, standard: true, premium: true },
  { label: 'Ưu tiên hiển thị', basic: false, standard: false, premium: true },
  { label: 'Quản lý nhân sự', basic: false, standard: false, premium: true },
  { label: 'Xếp lịch tự động', basic: false, standard: true, premium: true },
];

export default function UpgradePackageScreen() {
  const { navigateTo, goBack, showToast, user } = useContext(AppContext);
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
    if (plan.price === 0) { showToast('Đây là gói hiện tại.', 'info'); return; }
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
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack}>
          <Text style={s.backArrow}>← Quay lại</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Hero */}
          <View style={s.hero}>
            <Text style={s.heroTitle}>Mở khóa tiềm{'\n'}năng của bạn</Text>
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
                    <Text style={s.cardIcon}>⚡</Text>
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
                    <Feat text="1 tin đăng tuyển dụng" />
                    <Feat text="Hiệu lực trong 1 ngày" />
                    <Feat text="Không ràng buộc hợp đồng" />
                  </View>
                  <PurchaseBtn plan={pershift} loading={loading} onPress={handlePurchase} label="Đăng ngay" color="#6B7280" outline />
                </View>
              )}

              {/* ═══ GÓI CƠ BẢN ═══ */}
              {basic && (
                <View style={s.card}>
                  <View style={s.cardTop}>
                    <Text style={s.cardIcon}>🏪</Text>
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
                    <Feat text={`Đăng tuyển ${basic.jobPostLimit} tin/tháng`} />
                    <Feat text="Mô tả vị trí cơ bản" />
                    <Feat text="Quản lý ứng viên qua CV" />
                  </View>
                  <PurchaseBtn 
                    plan={basic} 
                    loading={loading} 
                    onPress={handlePurchase} 
                    label={isPlanActive('Basic') ? "Đã kích hoạt ✓" : "Nâng cấp ngay"} 
                    color={isPlanActive('Basic') ? "#10B981" : "#FF6B00"} 
                    disabled={isPlanActive('Basic')}
                  />
                </View>
              )}

              {/* ═══ GÓI CHUYÊN NGHIỆP (highlighted) ═══ */}
              {standard && (
                <View style={[s.card, s.cardPro]}>
                  <View style={s.proBadge}>
                    <Text style={s.proBadgeText}>🔥 PHỔ BIẾN NHẤT</Text>
                  </View>
                  <View style={s.cardTop}>
                    <Text style={s.cardIcon}>🚀</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cardName, { color: '#FF6B00' }]}>Chuyên nghiệp</Text>
                      <Text style={s.cardDesc}>Không giới hạn bài đăng</Text>
                    </View>
                  </View>
                  <View style={s.priceRow}>
                    <Text style={[s.price, { color: '#FF6B00' }]}>{fmt(standard.price)}</Text>
                    <Text style={s.pricePer}>/tháng</Text>
                  </View>
                  <View style={s.features}>
                    <Feat text="Mọi tính năng Cơ bản" accent />
                    <Feat text="Không giới hạn bài đăng" accent />
                    <Feat text="Lọc ứng viên thông minh AI" accent />
                    <Feat text="Xếp lịch tự động" accent />
                  </View>
                  <PurchaseBtn 
                    plan={standard} 
                    loading={loading} 
                    onPress={handlePurchase} 
                    label={isPlanActive('Standard') ? "Đã kích hoạt ✓" : "Nâng cấp ngay"} 
                    color={isPlanActive('Standard') ? "#10B981" : "#FF6B00"} 
                    disabled={isPlanActive('Standard')}
                  />
                </View>
              )}

              {/* ═══ GÓI CAO CẤP ═══ */}
              {premium && (
                <View style={[s.card, s.cardPremium]}>
                  <View style={s.premBadge}>
                    <Text style={s.premBadgeText}>👑 BEST VALUE</Text>
                  </View>
                  <View style={s.cardTop}>
                    <Text style={s.cardIcon}>👑</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cardName, { color: '#7C3AED' }]}>Cao cấp</Text>
                      <Text style={s.cardDesc}>Toàn diện nhất cho doanh nghiệp</Text>
                    </View>
                  </View>
                  <View style={s.priceRow}>
                    <Text style={[s.price, { color: '#7C3AED' }]}>{fmt(premium.price)}</Text>
                    <Text style={s.pricePer}>/tháng</Text>
                  </View>
                  <View style={s.features}>
                    <Feat text="Mọi tính năng Chuyên nghiệp" purple />
                    <Feat text="Ưu tiên hiển thị bài đăng" purple />
                    <Feat text="Quản lý nhân sự HRM Lite" purple />
                    <Feat text="Quyền hẹn phỏng vấn 1-1" purple />
                  </View>
                  <PurchaseBtn 
                    plan={premium} 
                    loading={loading} 
                    onPress={handlePurchase} 
                    label={isPlanActive('Premium') ? "Đã kích hoạt ✓" : "Nâng cấp ngay"} 
                    color={isPlanActive('Premium') ? "#10B981" : "#7C3AED"} 
                    disabled={isPlanActive('Premium')}
                  />
                </View>
              )}

              {/* ═══ SO SÁNH ═══ */}
              <View style={s.compareWrap}>
                <Text style={s.compareTitle}>So sánh tính năng</Text>
                <View style={s.tHead}>
                  <View style={s.tFeatCol}><Text style={s.tHText}>Tính năng</Text></View>
                  <View style={s.tValCol}><Text style={s.tHText}>Cơ{'\n'}bản</Text></View>
                  <View style={s.tValCol}><Text style={[s.tHText, { color: '#FF6B00' }]}>Chuyên{'\n'}nghiệp</Text></View>
                  <View style={s.tValCol}><Text style={[s.tHText, { color: '#7C3AED' }]}>Cao{'\n'}cấp</Text></View>
                </View>
                {FEATURE_ROWS.map((r, i) => (
                  <View key={i} style={[s.tRow, i % 2 === 0 && { backgroundColor: '#FAFAFA' }]}>
                    <View style={s.tFeatCol}><Text style={s.tFeatText}>{r.label}</Text></View>
                    <View style={s.tValCol}><Cell v={r.basic} /></View>
                    <View style={s.tValCol}><Cell v={r.standard} c="#FF6B00" /></View>
                    <View style={s.tValCol}><Cell v={r.premium} c="#7C3AED" /></View>
                  </View>
                ))}
              </View>

              {/* ═══ TRUST ═══ */}
              <View style={s.trustHero}>
                <Text style={s.trustTitle}>Hơn 50.000 người đã{'\n'}nâng cấp</Text>
                <Text style={s.trustSub}>Được tin dùng bởi các chủ quán, nhà hàng, quán cà phê trên toàn quốc</Text>
              </View>
              <TrustBadge icon="🔒" title="Thanh toán bảo mật" desc="Chuyển khoản an toàn qua ngân hàng" />
              <TrustBadge icon="💯" title="Hoàn tiền 100%" desc="Chưa hài lòng? Hoàn tiền trong 7 ngày" />

              <View style={{ height: 24 }} />
            </>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Small Components ── */
function Feat({ text, accent, purple }) {
  const color = purple ? '#7C3AED' : accent ? '#FF6B00' : '#10B981';
  return (
    <View style={s.featRow}>
      <Text style={[s.featCheck, { color }]}>✓</Text>
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
          : { backgroundColor: disabled ? '#10B981' : color },
      ]}
      onPress={() => !disabled && onPress(plan)}
      disabled={isLoading || disabled}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color={outline ? color : '#FFF'} size="small" />
      ) : (
        <Text style={[s.purchaseBtnText, outline && { color }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

function Cell({ v, c }) {
  if (typeof v === 'string') return <Text style={[s.cellTxt, c && { color: c, fontWeight: '700' }]}>{v}</Text>;
  return <Text style={v ? [s.cellChk, c && { color: c }] : s.cellX}>{v ? '✓' : '—'}</Text>;
}

function TrustBadge({ icon, title, desc }) {
  return (
    <View style={s.trustBadge}>
      <Text style={{ fontSize: 24 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.tbTitle}>{title}</Text>
        <Text style={s.tbDesc}>{desc}</Text>
      </View>
    </View>
  );
}

/* ── Styles ── */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  backBtn: { paddingVertical: 8 },
  backArrow: { fontSize: 14, color: '#4B5563', fontWeight: 'bold' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  hero: { marginTop: 4, marginBottom: 24 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#1F2937', lineHeight: 36 },
  heroSub: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginTop: 10 },

  // Cards
  card: {
    backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1.5, borderColor: '#E5E7EB',
    padding: 20, marginBottom: 16, position: 'relative', overflow: 'hidden',
  },
  cardPro: { borderColor: '#FF6B00', borderWidth: 2, borderStyle: 'dashed', paddingTop: 36 },
  cardPremium: { borderColor: '#7C3AED', borderWidth: 2, paddingTop: 36, backgroundColor: '#FAF5FF' },

  proBadge: {
    position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#FF6B00',
    paddingVertical: 5, alignItems: 'center',
  },
  proBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  premBadge: {
    position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#7C3AED',
    paddingVertical: 5, alignItems: 'center',
  },
  premBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardIcon: { fontSize: 28 },
  cardName: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  cardDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  price: { fontSize: 30, fontWeight: '800', color: '#1F2937' },
  pricePer: { fontSize: 13, color: '#9CA3AF', marginLeft: 3 },

  features: { marginBottom: 16 },
  featRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  featCheck: { fontSize: 15, fontWeight: 'bold', width: 22 },
  featText: { fontSize: 13, color: '#4B5563' },

  purchaseBtn: { height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  purchaseBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  // Compare
  compareWrap: { borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginTop: 8, marginBottom: 20 },
  compareTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', padding: 16, paddingBottom: 10 },
  tHead: { flexDirection: 'row', backgroundColor: '#F3F4F6', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tFeatCol: { flex: 2, justifyContent: 'center' },
  tValCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tHText: { fontSize: 10, fontWeight: '800', color: '#6B7280', textAlign: 'center' },
  tRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6' },
  tFeatText: { fontSize: 11, color: '#4B5563' },
  cellTxt: { fontSize: 11, color: '#374151', textAlign: 'center' },
  cellChk: { fontSize: 15, color: '#10B981', fontWeight: 'bold' },
  cellX: { fontSize: 14, color: '#D1D5DB' },

  // Trust
  trustHero: { backgroundColor: '#FFF7ED', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 12 },
  trustTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', textAlign: 'center', lineHeight: 24 },
  trustSub: { fontSize: 11, color: '#78716C', textAlign: 'center', marginTop: 6, lineHeight: 16 },
  trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10 },
  tbTitle: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  tbDesc: { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
});
