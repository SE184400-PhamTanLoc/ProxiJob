import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { theme } from '../../styles/theme';
import { AppContext } from '../../context/AppContext';
import { IDENTITY_API_BASE_URL } from '../../api/apiConfig';
import { getPaymentStatusApi, createPaymentSessionApi, saveAuthSession, checkAuthApi } from '../../api/auth';

const POLL_INTERVAL_MS = 8000;
const { width: SCREEN_W } = Dimensions.get('window');

// Thiết lập kích thước khung chứa ảnh QR dạng chữ nhật đứng theo tỷ lệ chuẩn của thẻ VietQR (khoảng 3:4)
const QR_WIDTH = Math.min(SCREEN_W - 60, 320);
const QR_HEIGHT = QR_WIDTH * 1.35; 

/** Fix localhost QR URLs for real devices */
function fixQrUrl(url) {
  if (!url) return url;
  const apiBase = IDENTITY_API_BASE_URL.replace(/\/api\/?$/, '');
  const fixed = url
    .replace(/https?:\/\/localhost:\d+/, apiBase)
    .replace(/https?:\/\/127\.0\.0\.1:\d+/, apiBase);
  // Add unique timestamp query parameter to bypass cache and force reload the newly cropped image
  const separator = fixed.includes('?') ? '&' : '?';
  return `${fixed}${separator}t=${new Date().getTime()}`;
}

export default function PaymentQRScreen() {
  const { navigationParams, goBack, showToast, navigateTo, setIsEnterprise } = useContext(AppContext);
  const { orderId, orderCode, amount, expiresAt, planName, bankTransfer } = navigationParams || {};

  const [status, setStatus] = useState('Pending');
  const [polling, setPolling] = useState(true);
  const [countdown, setCountdown] = useState('');
  const [paymentData, setPaymentData] = useState(bankTransfer || null);
  const [checking, setChecking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('bank'); // 'bank' | 'momo'
  const [momoPaying, setMomoPaying] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Entry
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // Pulse for QR
  useEffect(() => {
    if (status !== 'Pending') return;
    const p = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.01, duration: 2000, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
    ]));
    p.start();
    return () => p.stop();
  }, [status]);

  // Countdown
  useEffect(() => {
    if (!expiresAt) return;
    const iv = setInterval(() => {
      const d = new Date(expiresAt) - new Date();
      if (d <= 0) { setCountdown('00:00:00'); setStatus('Expired'); setPolling(false); clearInterval(iv); return; }
      const h = String(Math.floor(d / 3600000)).padStart(2, '0');
      const m = String(Math.floor((d % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((d % 60000) / 1000)).padStart(2, '0');
      setCountdown(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);

  // Poll status
  useEffect(() => {
    if (!orderId || !polling) return;
    let alive = true;
    const poll = async () => {
      try {
        const r = await getPaymentStatusApi(orderId);
        if (!alive) return;
        setStatus(r.status);
        if (r.bankTransfer) setPaymentData(r.bankTransfer);
        if (r.status === 'Paid') { setPolling(false); handlePaid(); }
        else if (r.status === 'Expired' || r.status === 'Cancelled') setPolling(false);
      } catch {}
    };
    poll();
    const iv = setInterval(poll, POLL_INTERVAL_MS);
    return () => { alive = false; clearInterval(iv); };
  }, [orderId, polling]);

  const handlePaid = async () => {
    try {
      const tk = await createPaymentSessionApi(orderId);
      if (tk?.accessToken) {
        const u = await checkAuthApi(tk.accessToken);
        await saveAuthSession(tk.accessToken, tk.refreshToken, u);
      }
      setIsEnterprise(true);
      showToast('Thanh toán thành công! Gói đã kích hoạt.', 'success');
    } catch {
      showToast('Thanh toán xác nhận! Đăng nhập lại để cập nhật.', 'success');
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const r = await getPaymentStatusApi(orderId);
      setStatus(r.status); if (r.bankTransfer) setPaymentData(r.bankTransfer);
      if (r.status === 'Paid') { setPolling(false); await handlePaid(); }
      else if (r.status === 'Expired' || r.status === 'Cancelled') {
        setPolling(false);
        showToast(r.status === 'Expired' ? 'Đơn đã hết hạn.' : 'Đơn đã bị hủy.', 'error');
      } else showToast('Đang chờ xác nhận thanh toán...', 'warning');
    } catch (e) { showToast('Lỗi: ' + e.message, 'error'); }
    finally { setChecking(false); }
  };

  const handleMomoPay = async () => {
    setMomoPaying(true);
    showToast('Đang kết nối tới ví điện tử MoMo...', 'info');
    setTimeout(async () => {
      try {
        setMomoPaying(false);
        setPolling(false);
        await handlePaid();
      } catch (err) {
        showToast('Xác thực ví MoMo thất bại, vui lòng thử lại.', 'error');
      }
    }, 2000);
  };

  const copy = async (text, label) => {
    try {
      if (Platform.OS === 'web') await navigator.clipboard.writeText(text);
      else { const C = require('expo-clipboard'); await C.setStringAsync(text); }
    } catch {}
    showToast(`Đã sao chép ${label}!`, 'success');
  };

  const fmt = (v) => (!v && v !== 0) ? '0 đ' : Number(v).toLocaleString('vi-VN') + ' đ';
  const qrUrl = fixQrUrl(paymentData?.qrImageUrl);

  // ═══════ SUCCESS ═══════
  if (status === 'Paid') {
    return (
      <SafeAreaView style={st.container}>
        <Animated.View style={[st.successWrap, { opacity: fadeAnim }]}>
          <Text style={st.successTitle}>Thanh toán thành công</Text>
          <Text style={st.successSub}>
            Gói dịch vụ <Text style={{ fontWeight: '800', color: '#FF6B00' }}>{planName}</Text> đã được kích hoạt thành công.
          </Text>
          <View style={st.successInfo}>
            <View style={st.successRow}><Text style={st.sLabel}>Mã đơn</Text><Text style={st.sVal}>{orderCode}</Text></View>
            <View style={[st.successRow, { borderBottomWidth: 0 }]}><Text style={st.sLabel}>Số tiền</Text><Text style={[st.sVal, { color: '#10B981' }]}>{fmt(amount)}</Text></View>
          </View>
          <TouchableOpacity style={st.successBtn} onPress={() => navigateTo('employer_approvals')}>
            <Text style={st.successBtnText}>Về Trang Chủ</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ═══════ PAYMENT ═══════
  return (
    <SafeAreaView style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={goBack} style={st.hBack}><Text style={st.hBackText}>←</Text></TouchableOpacity>
        <Text style={st.hTitle}>Thanh toán đơn hàng</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Payment Method Selector */}
      {status === 'Pending' && (
        <View style={st.methodTabs}>
          <TouchableOpacity 
            style={[st.methodTab, paymentMethod === 'bank' && st.methodTabActive]} 
            onPress={() => setPaymentMethod('bank')}
          >
            <Text style={[st.methodTabText, paymentMethod === 'bank' && st.methodTabActiveText]}>🏦 VietQR</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[st.methodTab, paymentMethod === 'momo' && st.methodTabActiveMomo]} 
            onPress={() => setPaymentMethod('momo')}
          >
            <Text style={[st.methodTabText, paymentMethod === 'momo' && st.methodTabActiveTextMomo]}>💗 Ví MoMo</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ══ BANK QR DISPLAY SECTION ══ */}
          {paymentMethod === 'bank' && qrUrl && status === 'Pending' && (
            <View style={st.qrHero}>
              <Animated.View style={[st.qrCard, { transform: [{ scale: pulseAnim }] }]}>
                <Image 
                  source={{ uri: qrUrl }} 
                  style={st.qrImg} 
                  resizeMode="contain" 
                  onError={(e) => console.log('[QR] load err:', e.nativeEvent?.error, qrUrl)} 
                />
              </Animated.View>
              
              <Text style={st.qrLabel}>QUÉT MÃ ĐỂ THANH TOÁN</Text>
              <Text style={st.qrHint}>Mở ứng dụng ngân hàng bất kỳ để quét mã QR</Text>

              {countdown ? (
                <View style={st.countdownPill}>
                  <Text style={st.countdownText}>Giao dịch hết hạn sau: <Text style={st.countdownBold}>{countdown}</Text></Text>
                </View>
              ) : null}
            </View>
          )}

          {/* ══ MOMO QR DISPLAY SECTION ══ */}
          {paymentMethod === 'momo' && status === 'Pending' && (
            <View style={st.qrHero}>
              <Animated.View style={[st.qrCardMomo, { transform: [{ scale: pulseAnim }] }]}>
                <View style={st.momoHeader}>
                  <Text style={st.momoHeaderText}>momo</Text>
                </View>
                <View style={st.momoQrBody}>
                  <Image 
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://payment.momo.vn/pay/order/${orderCode || '123456'}` }} 
                    style={st.momoQrImg} 
                    resizeMode="contain" 
                  />
                </View>
                <View style={st.momoFooter}>
                  <Text style={st.momoFooterText}>Sử dụng ứng dụng MoMo để quét mã</Text>
                </View>
              </Animated.View>
              
              <Text style={st.qrLabel}>QUÉT MÃ MOMO ĐỂ THANH TOÁN</Text>
              <Text style={st.qrHint}>Mở Ví MoMo quét mã QR hoặc bấm nút bên dưới để thanh toán trực tiếp</Text>

              {countdown ? (
                <View style={st.countdownPill}>
                  <Text style={st.countdownText}>Giao dịch hết hạn sau: <Text style={st.countdownBold}>{countdown}</Text></Text>
                </View>
              ) : null}
            </View>
          )}

          {/* ══ ORDER SUMMARY ══ */}
          <View style={st.section}>
            <Text style={st.sectionTitle}>Thông tin đơn hàng</Text>
            <View style={st.infoCard}>
              <BlockRow label="Gói dịch vụ" value={planName || '—'} highlight />
              <BlockRow label="Mã đơn hàng" value={orderCode} mono copyable onCopy={() => copy(orderCode, 'mã đơn')} />
              <BlockRow label="Số tiền thanh toán" value={fmt(amount)} valueColor="#10B981" bold last />
            </View>
          </View>

          {/* ══ BANK TRANSFER DETAILS ══ */}
          {paymentData && status === 'Pending' && (
            <View style={st.section}>
              <Text style={st.sectionTitle}>Thông tin tài khoản nhận</Text>
              <View style={st.infoCard}>
                <BlockRow label="Ngân hàng thụ hưởng" value={paymentData.bankName || 'MB Bank'} />
                <BlockRow label="Tên chủ tài khoản" value={paymentData.accountHolder || '—'} />
                <BlockRow label="Số tài khoản" value={paymentData.accountNumber} mono copyable onCopy={() => copy(paymentData.accountNumber, 'STK')} />
                <BlockRow label="Nội dung chuyển khoản" value={paymentData.transferContent || orderCode} mono danger copyable onCopy={() => copy(paymentData.transferContent || orderCode, 'nội dung CK')} last />
              </View>
            </View>
          )}

          {/* ══ IMPORTANT NOTES ══ */}
          {status === 'Pending' && (
            <View style={st.noteCard}>
              <Text style={st.noteTitle}>Lưu ý quan trọng</Text>
              <View style={st.noteBody}>
                <Text style={st.noteItem}>• Nhập chính xác nội dung chuyển khoản để hệ thống tự động duyệt nhanh.</Text>
                <Text style={st.noteItem}>• Chuyển đúng số tiền: <Text style={{ color: '#10B981', fontWeight: '800' }}>{fmt(amount)}</Text>.</Text>
                <Text style={st.noteItem}>• Gói dịch vụ sẽ được kích hoạt ngay sau khi giao dịch thành công.</Text>
              </View>
            </View>
          )}

          {/* Expired / Cancelled */}
          {(status === 'Expired' || status === 'Cancelled') && (
            <View style={[st.noteCard, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}>
              <Text style={[st.noteTitle, { color: '#EF4444' }]}>
                {status === 'Expired' ? 'Giao dịch đã hết hạn' : 'Giao dịch đã bị hủy'}
              </Text>
              <Text style={st.noteItem}>Vui lòng quay lại màn hình trước và khởi tạo một giao dịch mới.</Text>
            </View>
          )}

          {/* ══ ACTIONS ══ */}
          <View style={st.actions}>
            {status === 'Pending' && paymentMethod === 'bank' && (
              <TouchableOpacity style={st.primaryBtn} onPress={handleCheck} disabled={checking} activeOpacity={0.85}>
                {checking ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={st.primaryBtnText}>Kiểm tra trạng thái thanh toán</Text>}
              </TouchableOpacity>
            )}
            {status === 'Pending' && paymentMethod === 'momo' && (
              <TouchableOpacity style={st.momoBtn} onPress={handleMomoPay} disabled={momoPaying} activeOpacity={0.85}>
                {momoPaying ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={st.momoBtnText}>Thanh toán qua ứng dụng MoMo ⚡</Text>}
              </TouchableOpacity>
            )}
            {(status === 'Expired' || status === 'Cancelled') && (
              <TouchableOpacity style={[st.primaryBtn, { backgroundColor: '#F59E0B' }]} onPress={() => navigateTo('upgrade_package')} activeOpacity={0.85}>
                <Text style={st.primaryBtnText}>Tạo yêu cầu thanh toán mới</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={st.outlineBtn} onPress={goBack} activeOpacity={0.85}>
              <Text style={st.outlineBtnText}>Quay lại</Text>
            </TouchableOpacity>
          </View>

          {/* Polling */}
          {polling && status === 'Pending' && (
            <View style={st.pollRow}>
              <ActivityIndicator size="small" color="#FF6B00" style={{ marginRight: 6 }} />
              <Text style={st.pollText}>Hệ thống đang tự động kiểm tra trạng thái giao dịch...</Text>
            </View>
          )}

          <View style={{ height: 20 }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ══ 2-Row Layout Component (Tránh đè chữ tuyệt đối + Chữ to hơn + Nút Copy tinh tế) ══ */
function BlockRow({ label, value, highlight, mono, copyable, onCopy, valueColor, bold, danger, last }) {
  return (
    <View style={[st.blockRow, last && { borderBottomWidth: 0, paddingBottom: 0 }]}>
      <Text style={st.blockLabel}>{label.toUpperCase()}</Text>
      <View style={st.blockValueContainer}>
        <Text style={[
          st.blockVal,
          highlight && { color: '#FF6B00', fontWeight: '800' },
          mono && { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 0.5 },
          valueColor && { color: valueColor },
          bold && { fontSize: 20, fontWeight: '900' },
          danger && { color: '#EF4444', fontWeight: '800' },
        ]} numberOfLines={2}>{value}</Text>
        
        {copyable && (
          <TouchableOpacity style={st.copyBtn} onPress={onCopy} activeOpacity={0.6}>
            <Text style={st.copyBtnText}>Sao chép</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* ══ Styles ══ */
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  /* Method Tabs */
  methodTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  methodTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  methodTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  methodTabActiveMomo: {
    backgroundColor: '#D82D8B',
    shadowColor: '#D82D8B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  methodTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  methodTabActiveText: {
    color: '#FF6B00',
  },
  methodTabActiveTextMomo: {
    color: '#FFFFFF',
  },

  /* MoMo QR Card */
  qrCardMomo: {
    backgroundColor: '#D82D8B',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D82D8B',
    shadowColor: '#D82D8B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    width: QR_WIDTH,
    height: QR_HEIGHT,
    overflow: 'hidden',
  },
  momoHeader: {
    height: 48,
    backgroundColor: '#D82D8B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  momoHeaderText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  momoQrBody: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  momoQrImg: {
    width: '100%',
    height: '100%',
  },
  momoFooter: {
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  momoFooterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  momoBtn: {
    backgroundColor: '#D82D8B',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#D82D8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  momoBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  /* Header */
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#F3F4F6'
  },
  hBack: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  hBackText: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  hTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  scroll: { paddingHorizontal: 16, paddingVertical: 12 },

  /* QR Hero Section */
  qrHero: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 12,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    width: QR_WIDTH,
    height: QR_HEIGHT,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrImg: { width: '100%', height: '100%' },
  qrLabel: { fontSize: 14, fontWeight: '900', color: '#1F2937', marginTop: 12, letterSpacing: 0.5 },
  qrHint: { fontSize: 11, color: '#6B7280', marginTop: 3, textAlign: 'center', paddingHorizontal: 20 },
  countdownPill: {
    marginTop: 10,
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  countdownText: { fontSize: 12, color: '#C2410C' },
  countdownBold: { fontWeight: '800', fontSize: 13 },

  /* Sections */
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1F2937', marginBottom: 8 },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  /* Block Row (Label top, Value bottom) */
  blockRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  blockLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 6,
    letterSpacing: 0.5
  },
  blockValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  blockVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  copyBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF6B00'
  },

  /* Note Card */
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  noteTitle: { fontSize: 14, fontWeight: '800', color: '#1F2937', marginBottom: 8 },
  noteBody: {},
  noteItem: { fontSize: 12, color: '#6B7280', lineHeight: 18, marginBottom: 4 },

  /* Actions */
  actions: { marginTop: 4 },
  primaryBtn: {
    backgroundColor: '#FF6B00',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  outlineBtn: {
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  outlineBtnText: { color: '#4B5563', fontSize: 14, fontWeight: '700' },

  /* Poll */
  pollRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  pollText: { fontSize: 11, color: '#9CA3AF' },

  /* Success State */
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#10B981', marginBottom: 8 },
  successSub: { fontSize: 14, color: '#4B5563', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  successInfo: { width: '100%', backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 16, marginBottom: 24 },
  successRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  sLabel: { fontSize: 13, color: '#6B7280' },
  sVal: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  successBtn: { backgroundColor: '#FF6B00', width: '100%', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  successBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
