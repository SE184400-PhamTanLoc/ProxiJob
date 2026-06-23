import { IDENTITY_API_BASE_URL, getAuthHeader } from './apiConfig';

/**
 * Get business profile
 * @returns {Promise<object>}
 */
export async function getBusinessProfileApi() {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${IDENTITY_API_BASE_URL}/business/profile`, {
      method: 'GET',
      headers,
    });
    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(resData.message || `Failed to fetch business profile: ${response.status}`);
    }
    return resData.data || resData;
  } catch (error) {
    console.log('[ProxiJob Business API] getBusinessProfileApi error:', error.message);
    throw error;
  }
}

/**
 * Register business profile (first time)
 * @param {object} profileData 
 * @returns {Promise<object>}
 */
export async function registerBusinessProfileApi(profileData) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${IDENTITY_API_BASE_URL}/business/profile/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profileData),
    });
    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = resData.message || (resData.errors && resData.errors.join(', ')) || `Failed to register business profile: ${response.status}`;
      throw new Error(errorMsg);
    }
    return resData.data || resData;
  } catch (error) {
    console.log('[ProxiJob Business API] registerBusinessProfileApi error:', error.message);
    throw error;
  }
}

/**
 * Update business profile
 * @param {object} profileData 
 * @returns {Promise<object>}
 */
export async function updateBusinessProfileApi(profileData) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${IDENTITY_API_BASE_URL}/business/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(profileData),
    });
    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = resData.message || (resData.errors && resData.errors.join(', ')) || `Failed to update business profile: ${response.status}`;
      throw new Error(errorMsg);
    }
    return resData.data || resData;
  } catch (error) {
    console.log('[ProxiJob Business API] updateBusinessProfileApi error:', error.message);
    throw error;
  }
}

/**
 * Activate business profile
 * @returns {Promise<object>}
 */
export async function activateBusinessProfileApi() {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${IDENTITY_API_BASE_URL}/business/profile/activate`, {
      method: 'POST',
      headers,
    });
    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(resData.message || `Failed to activate business profile: ${response.status}`);
    }
    return resData.data || resData;
  } catch (error) {
    console.log('[ProxiJob Business API] activateBusinessProfileApi error:', error.message);
    throw error;
  }
}
