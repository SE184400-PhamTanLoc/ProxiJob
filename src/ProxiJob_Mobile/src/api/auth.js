import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import { IDENTITY_API_BASE_URL } from './apiConfig';

const getApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!envUrl || envUrl.includes('localhost:5231') || envUrl.includes('127.0.0.1:5231')) {
    return IDENTITY_API_BASE_URL;
  }

  if (Platform.OS === 'web') {
    return envUrl;
  }

  if (envUrl.includes(':7159')) {
    return envUrl.replace(':7159', ':5231');
  }

  return envUrl;
};

export const API_BASE_URL = getApiBaseUrl();
console.log('[ProxiJob Auth API] Base URL initialized to:', API_BASE_URL);

const AUTH_TOKEN_KEY = '@proxijob_auth_token';
const AUTH_USER_KEY = '@proxijob_auth_user';

// Base64 decoder polyfill for Hermes/React Native compatibility
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function atobPolyfill(input) {
  let str = input.replace(/=+$/, '');
  let output = '';

  if (str.length % 4 === 1) {
    throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  }

  for (
    let bc = 0, bs = 0, rut, idx = 0;
    (rut = str.charAt(idx++));
    ~rut && ((bs = bc % 4 ? bs * 64 + rut : rut), bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
      : 0
  ) {
    rut = chars.indexOf(rut);
  }

  return output;
}

// Simple pure JS JWT decoder
function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return {};
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atobPolyfill(base64);

    let jsonPayload = '';
    for (let i = 0; i < raw.length; i++) {
      jsonPayload += '%' + ('00' + raw.charCodeAt(i).toString(16)).slice(-2);
    }
    return JSON.parse(decodeURIComponent(jsonPayload));
  } catch (error) {
    console.log('[ProxiJob JWT] Decode failed:', error);
    return {};
  }
}

/**
 * Call backend login API
 * @param {string} email 
 * @param {string} password 
 * @param {number} [role] 0 = student, 1 = employer (used for mock fallback)
 * @returns {Promise<{token: string, user: object}>}
 */
export async function loginApi(email, password, role) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const resData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = resData.message || (resData.errors && resData.errors.join(', ')) || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.';
      throw new Error(errorMsg);
    }

    const authData = resData.data || resData;
    const token = authData.accessToken || authData.token;
    const refreshToken = authData.refreshToken;

    if (!token) {
      throw new Error('Không nhận được token từ hệ thống.');
    }

    const decodedUser = decodeJwt(token);
    const rawRole = decodedUser['role'] || decodedUser['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || '';
    const roleStr = (Array.isArray(rawRole) ? rawRole[0] : rawRole).toString();
    const mappedRole = roleStr.toLowerCase() === 'student' ? 'student' : 'employer';
    const userId = parseInt(decodedUser.sub || decodedUser['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || 1, 10);
    const subTier = decodedUser['subscription_tier'] || 'Free';
    const avatarUrl = decodedUser['avatar_url'] || '';

    return {
      token: token,
      refreshToken: refreshToken,
      user: {
        id: userId,
        email: decodedUser.email || email,
        name: decodedUser.name || decodedUser.unique_name || decodedUser['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || (roleStr.toLowerCase() === 'student' ? 'Sinh viên' : 'Chủ quán'),
        role: mappedRole,
        subscriptionTier: subTier,
        avatarUrl: avatarUrl,
      }
    };
  } catch (error) {
    console.log('[ProxiJob API] loginApi failed:', error.message);
    throw error;
  }
}

/**
 * Call backend register API
 * @param {string} fullName 
 * @param {string} email 
 * @param {string} password 
 * @param {string} confirmPassword 
 * @param {number} userType 0 = student, 1 = employer/business
 * @returns {Promise<object>}
 */
export async function registerApi(fullName, email, password, confirmPassword, userType) {
  try {
    console.log('[ProxiJob API] registerApi sending payload:', { fullName, email, password, confirmPassword, userType });
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fullName, email, password, confirmPassword, userType }),
    });

    const resData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = resData.message || (resData.errors && resData.errors.join(', ')) || 'Đăng ký thất bại. Vui lòng kiểm tra lại.';
      throw new Error(errorMsg);
    }

    return resData.data || resData;
  } catch (error) {
    console.log('[ProxiJob API] registerApi failed:', error.message);
    throw error;
  }
}

/**
 * Validate token and get current user profile (checkauth)
 * @param {string} token 
 * @returns {Promise<object>}
 */
export async function checkAuthApi(token) {
  try {
    if (token === 'mock-jwt-token-proxijob-123456') {
      const storedUser = await getStoredUser();
      if (storedUser) return storedUser;
      return {
        id: 1,
        email: 'sinhvien@proxijob.com',
        name: 'Nguyễn Văn A',
        role: 'student',
      };
    }

    // Parse and validate local JWT token expiration to avoid hitting non-existent me API
    const decoded = decodeJwt(token);
    if (!decoded || !decoded.exp) {
      throw new Error('Token không hợp lệ.');
    }

    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      throw new Error('Phiên đăng nhập đã hết hạn.');
    }

    const rawRole = decoded['role'] || decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || '';
    const roleStr = (Array.isArray(rawRole) ? rawRole[0] : rawRole).toString();
    const mappedRole = roleStr.toLowerCase() === 'student' ? 'student' : 'employer';
    const userId = parseInt(decoded.sub || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || 1, 10);
    const subTier = decoded['subscription_tier'] || 'Free';
    const avatarUrl = decoded['avatar_url'] || '';

    return {
      id: userId,
      email: decoded.email || '',
      name: decoded.name || decoded.unique_name || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || (roleStr.toLowerCase() === 'student' ? 'Sinh viên' : 'Chủ quán'),
      role: mappedRole,
      subscriptionTier: subTier,
      avatarUrl: avatarUrl,
    };
  } catch (error) {
    console.log('[ProxiJob API] checkAuthApi failed:', error.message);
    // If the token is expired, do NOT fall back to cached user.
    // Let the error propagate so useAuth can attempt a token refresh.
    const isExpired = error.message && (
      error.message.includes('hết hạn') || 
      error.message.includes('expired') ||
      error.message.includes('không hợp lệ') ||
      error.message.includes('invalid')
    );
    if (isExpired) {
      throw error;
    }
    // For other errors (network, decode issues), fall back to cached user
    console.log('[ProxiJob API] Falling back to local cache for non-expiration error');
    const storedUser = await getStoredUser();
    if (storedUser) {
      return storedUser;
    }
    throw error;
  }
}

const REFRESH_TOKEN_KEY = '@proxijob_refresh_token';

/**
 * Save auth token, refresh token and user object to AsyncStorage
 */
export async function saveAuthSession(token, refreshToken, user) {
  try {
    await AsyncStorage.multiSet([
      [AUTH_TOKEN_KEY, token],
      [REFRESH_TOKEN_KEY, refreshToken || ''],
      [AUTH_USER_KEY, JSON.stringify(user)],
    ]);
  } catch (error) {
    console.log('[ProxiJob Storage] Error saving auth session:', error.message);
  }
}

/**
 * Clear auth session from AsyncStorage (Logout)
 */
export async function clearAuthSession() {
  try {
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, AUTH_USER_KEY]);
  } catch (error) {
    console.log('[ProxiJob Storage] Error clearing auth session:', error.message);
  }
}

/**
 * Retrieve saved token
 */
export async function getStoredToken() {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.log('[ProxiJob Storage] Error getting stored token:', error.message);
    return null;
  }
}

/**
 * Retrieve saved refresh token
 */
export async function getStoredRefreshToken() {
  try {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.log('[ProxiJob Storage] Error getting stored refresh token:', error.message);
    return null;
  }
}

/**
 * Retrieve saved user details
 */
export async function getStoredUser() {
  try {
    const userJson = await AsyncStorage.getItem(AUTH_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.log('[ProxiJob Storage] Error getting stored user:', error.message);
    return null;
  }
}

/**
 * Refresh Access Token using Refresh Token
 * @param {string} refreshToken 
 * @returns {Promise<{accessToken: string, refreshToken: string, expiration: string}>}
 */
export async function refreshTokensApi(refreshToken) {
  try {
    // Add timeout to prevent hanging when backend is unreachable
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Yêu cầu cấp lại Access Token thất bại.');
    }

    const resData = await response.json();
    const authData = resData.data || resData;

    if (!authData.accessToken || !authData.refreshToken) {
      throw new Error('Phản hồi token không hợp lệ.');
    }

    return {
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      expiration: authData.expiration,
    };
  } catch (error) {
    console.log('[ProxiJob API] refreshTokensApi failed:', error.message);
    throw error;
  }
}

/**
 * Fetch subscription plans
 * @returns {Promise<object>}
 */
export async function getPlansApi() {
  try {
    const response = await fetch(`${API_BASE_URL}/plans`);
    if (!response.ok) {
      throw new Error(`Failed to fetch plans: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data || resData;
  } catch (error) {
    console.log('[ProxiJob Auth API] getPlansApi error:', error.message);
    throw error;
  }
}

/**
 * Initiate a plan purchase
 * @param {number} planId 
 * @returns {Promise<object>}
 */
export async function purchasePlanApi(planId) {
  try {
    const token = await getStoredToken();
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const payload = { planId };
    console.log('[ProxiJob Auth API] purchasePlanApi request:', { url: `${API_BASE_URL}/plans/purchase`, planId, hasToken: !!token });
    const response = await fetch(`${API_BASE_URL}/plans/purchase`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const resData = await response.json().catch(() => ({}));
    console.log('[ProxiJob Auth API] purchasePlanApi response:', { status: response.status, resData });
    if (!response.ok) {
      // Backend uses ApiResponse with message and errors[] fields
      const errMessages = resData.errors && Array.isArray(resData.errors) ? resData.errors.join(', ') : '';
      const errorMsg = resData.message || errMessages || `Failed to purchase plan: ${response.status}`;
      throw new Error(errorMsg);
    }
    return resData.data || resData;
  } catch (error) {
    console.log('[ProxiJob Auth API] purchasePlanApi error:', error.message);
    throw error;
  }
}

/**
 * Get payment order status (includes bank transfer instructions + QR URL when Pending)
 * GET /api/payments/{orderId}
 * @param {number} orderId
 * @returns {Promise<object>} PaymentOrderStatusDto
 */
export async function getPaymentStatusApi(orderId) {
  try {
    const token = await getStoredToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/payments/${orderId}`, {
      method: 'GET',
      headers,
    });
    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(resData.message || `Failed to get payment status: ${response.status}`);
    }
    return resData.data || resData;
  } catch (error) {
    console.log('[ProxiJob Auth API] getPaymentStatusApi error:', error.message);
    throw error;
  }
}

/**
 * Issue new session tokens after payment is confirmed (Paid status)
 * POST /api/payments/{orderId}/session
 * @param {number} orderId
 * @returns {Promise<object|null>} AuthTokensDto or null if not yet paid
 */
export async function createPaymentSessionApi(orderId) {
  try {
    const token = await getStoredToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/payments/${orderId}/session`, {
      method: 'POST',
      headers,
    });
    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(resData.message || `Failed to create payment session: ${response.status}`);
    }
    return resData.data || resData;
  } catch (error) {
    console.log('[ProxiJob Auth API] createPaymentSessionApi error:', error.message);
    throw error;
  }
}
