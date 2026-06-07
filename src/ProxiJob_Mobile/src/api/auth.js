import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

// Configurable API base URL with dynamic IP resolution for mobile devices in development
const getApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:7159/api';

  if (Platform.OS === 'web') {
    return envUrl;
  }

  // If on mobile (iOS/Android emulator or real device) in DEV mode and URL points to localhost,
  // dynamically replace 'localhost' with the IP of the host machine hosting the Metro bundler.
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  if (isDev && envUrl.includes('localhost')) {
    if (NativeModules.SourceCode && NativeModules.SourceCode.scriptURL) {
      const scriptURL = NativeModules.SourceCode.scriptURL;
      const hostIp = scriptURL.split('://')[1]?.split('/')[0]?.split(':')[0];
      if (hostIp) {
        console.log(`[ProxiJob API] Dynamically mapped localhost API to host: http://${hostIp}:7159/api`);
        return envUrl.replace('localhost', hostIp);
      }
    }

    // Fallback for Android emulator when dynamic scriptURL parsing is unavailable
    if (Platform.OS === 'android') {
      console.log('[ProxiJob API] Fallback: mapping localhost to 10.0.2.2 for Android Emulator.');
      return envUrl.replace('localhost', '10.0.2.2');
    }
  }

  return envUrl;
};

const API_BASE_URL = getApiBaseUrl();

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
    const mappedRole = rawRole.toLowerCase() === 'student' ? 'student' : 'employer';
    const userId = parseInt(decodedUser.sub || decodedUser['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || 1, 10);

    return {
      token: token,
      refreshToken: refreshToken,
      user: {
        id: userId,
        email: decodedUser.email || email,
        name: rawRole === 'Student' ? 'Sinh viên' : 'Chủ quán',
        role: mappedRole,
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
    const mappedRole = rawRole.toLowerCase() === 'student' ? 'student' : 'employer';
    const userId = parseInt(decoded.sub || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || 1, 10);

    return {
      id: userId,
      email: decoded.email || '',
      name: rawRole === 'Student' ? 'Sinh viên' : 'Chủ quán',
      role: mappedRole,
    };
  } catch (error) {
    console.log('[ProxiJob API] checkAuthApi failed. Falling back to local cache:', error.message);
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
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

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
