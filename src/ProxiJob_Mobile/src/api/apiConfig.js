import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getHostIp = () => {
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  if (isDev && Platform.OS !== 'web') {
    if (NativeModules.SourceCode && NativeModules.SourceCode.scriptURL) {
      const scriptURL = NativeModules.SourceCode.scriptURL;
      const hostIp = scriptURL.split('://')[1]?.split('/')[0]?.split(':')[0];
      if (hostIp) return hostIp;
    }
    if (Platform.OS === 'android') {
      return '10.0.2.2';
    }
  }
  return 'localhost';
};

const hostIp = getHostIp();

export const IDENTITY_API_BASE_URL = Platform.OS === 'web' ? 'http://localhost:5231/api' : `http://${hostIp}:5231/api`;
export const JOB_API_BASE_URL = Platform.OS === 'web' ? 'http://localhost:5021/api' : `http://${hostIp}:5021/api`;
export const MANAGEMENT_API_BASE_URL = Platform.OS === 'web' ? 'http://localhost:5057/api' : `http://${hostIp}:5057/api`;

const AUTH_TOKEN_KEY = '@proxijob_auth_token';

/**
 * Get HTTP headers for request, including Bearer Authorization token if present
 * @returns {Promise<object>}
 */
export async function getAuthHeader() {
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  } catch (error) {
    console.log('[ProxiJob API Config] Error getting stored token:', error);
    return { 'Content-Type': 'application/json' };
  }
}
