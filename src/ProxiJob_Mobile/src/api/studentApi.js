
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import { IDENTITY_API_BASE_URL } from './apiConfig';
import { getStoredToken, API_BASE_URL } from './auth';

/**
 * Get student profile
 * @returns {Promise<object>}
 */
export async function getStudentProfileApi() {
    try {
        const token = await getStoredToken();
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE_URL}/student/profile`, {
            method: 'GET',
            headers,
        });
        const resData = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(resData.message || `Failed to fetch profile: ${response.status}`);
        }
        return resData.data || resData;
    } catch (error) {
        console.log('[ProxiJob Auth API] getStudentProfileApi error:', error.message);
        throw error;
    }
}

/**
 * Register student profile (first time)
 * @param {object} profileData 
 * @returns {Promise<object>}
 */
export async function registerStudentProfileApi(profileData) {
    try {
        const token = await getStoredToken();
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE_URL}/student/profile/register`, {
            method: 'POST',
            headers,
            body: JSON.stringify(profileData),
        });
        const resData = await response.json().catch(() => ({}));
        if (!response.ok) {
            const errorMsg = resData.message || (resData.errors && resData.errors.join(', ')) || `Failed to register profile: ${response.status}`;
            throw new Error(errorMsg);
        }
        return resData.data || resData;
    } catch (error) {
        console.log('[ProxiJob Auth API] registerStudentProfileApi error:', error.message);
        throw error;
    }
}


/**
 * Update student profile
 * @param {object} profileData 
 * @returns {Promise<object>}
 */
export async function updateStudentProfileApi(profileData) {
    try {
        const token = await getStoredToken();
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE_URL}/student/profile`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(profileData),
        });
        const resData = await response.json().catch(() => ({}));
        if (!response.ok) {
            const errorMsg = resData.message || (resData.errors && resData.errors.join(', ')) || `Failed to update profile: ${response.status}`;
            throw new Error(errorMsg);
        }
        return resData.data || resData;
    } catch (error) {
        console.log('[ProxiJob Auth API] updateStudentProfileApi error:', error.message);
        throw error;
    }
}

/**
 * Fetch all active student profiles (ReadyForWork)
 * @returns {Promise<array>}
 */
export async function getActiveStudentProfilesApi() {
    try {
        const token = await getStoredToken();
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE_URL}/student/profile/active`, {
            method: 'GET',
            headers,
        });
        const resData = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(resData.message || `Failed to fetch active student profiles: ${response.status}`);
        }
        return resData.data || resData;
    } catch (error) {
        console.log('[ProxiJob Auth API] getActiveStudentProfilesApi error:', error.message);
        throw error;
    }
}

/**
 * Activate student profile (set ReadyForWork)
 * @returns {Promise<object>}
 */
export async function activateStudentProfileApi() {
    try {
        const token = await getStoredToken();
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE_URL}/student/profile/activate`, {
            method: 'POST',
            headers,
        });
        const resData = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(resData.message || `Failed to activate student profile: ${response.status}`);
        }
        return resData.data || resData;
    } catch (error) {
        console.log('[ProxiJob Auth API] activateStudentProfileApi error:', error.message);
        throw error;
    }
}

/**
 * Deactivate student profile (set Inactive / not ready for work)
 * @returns {Promise<object>}
 */
export async function deactivateStudentProfileApi() {
    try {
        const token = await getStoredToken();
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE_URL}/student/profile/deactivate`, {
            method: 'POST',
            headers,
        });
        const resData = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(resData.message || `Failed to deactivate student profile: ${response.status}`);
        }
        return resData.data || resData;
    } catch (error) {
        console.log('[ProxiJob Auth API] deactivateStudentProfileApi error:', error.message);
        throw error;
    }
}


