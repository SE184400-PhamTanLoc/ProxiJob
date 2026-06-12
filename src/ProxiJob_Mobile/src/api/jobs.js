import { JOB_API_BASE_URL, getAuthHeader } from './apiConfig';

/**
 * Fetch published job posts
 * @param {number} [categoryId] 
 * @param {number} [pageNumber=1] 
 * @param {number} [pageSize=10] 
 * @returns {Promise<object>}
 */
export async function getPublishedJobs(categoryId, pageNumber = 1, pageSize = 20) {
  try {
    const headers = await getAuthHeader();
    let url = `${JOB_API_BASE_URL}/job-posts/published?pageNumber=${pageNumber}&pageSize=${pageSize}`;
    if (categoryId) {
      url += `&categoryId=${categoryId}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch published jobs: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Jobs API] getPublishedJobs error:', error);
    throw error;
  }
}

/**
 * Fetch detailed job post by ID
 * @param {number} id 
 * @returns {Promise<object>}
 */
export async function getJobPostById(id) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${JOB_API_BASE_URL}/job-posts/${id}`, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch job details: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Jobs API] getJobPostById error:', error);
    throw error;
  }
}

/**
 * Create a new job post (Emergency or standard)
 * @param {object} payload 
 * @returns {Promise<object>}
 */
export async function createJobPost(payload) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${JOB_API_BASE_URL}/job-posts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to create job post: ${response.status} - ${errText}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Jobs API] createJobPost error:', error);
    throw error;
  }
}

/**
 * Apply to a specific shift
 * @param {number} shiftId 
 * @param {number} studentId 
 * @param {string} introduction 
 * @param {string} createdBy 
 * @returns {Promise<object>}
 */
export async function applyToShiftApi(shiftId, studentId, introduction, createdBy = 'Student') {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${JOB_API_BASE_URL}/shifts/${shiftId}/apply`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ shiftId, studentId, introduction, createdBy })
    });

    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = resData.message || 'Không thể ứng tuyển vào ca làm. Vui lòng thử lại.';
      throw new Error(errorMsg);
    }
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Jobs API] applyToShift error:', error);
    throw error;
  }
}

/**
 * Get student's application history/calendar
 * @param {number} studentId 
 * @param {string} [status] 
 * @param {number} [pageNumber=1] 
 * @param {number} [pageSize=20] 
 * @returns {Promise<object>}
 */
export async function getMyApplications(studentId, status = '', pageNumber = 1, pageSize = 20) {
  try {
    const headers = await getAuthHeader();
    let url = `${JOB_API_BASE_URL}/applications/my?studentId=${studentId}&pageNumber=${pageNumber}&pageSize=${pageSize}`;
    if (status) {
      url += `&status=${status}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch my applications: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Jobs API] getMyApplications error:', error);
    throw error;
  }
}

/**
 * Get applications for a specific shift (Employer view)
 * @param {number} shiftId 
 * @param {number} businessId 
 * @param {string} [status] 
 * @returns {Promise<object>}
 */
export async function getApplicationsByShift(shiftId, businessId, status = '') {
  try {
    const headers = await getAuthHeader();
    let url = `${JOB_API_BASE_URL}/shifts/${shiftId}/applications?businessId=${businessId}`;
    if (status) {
      url += `&status=${status}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch applications by shift: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Jobs API] getApplicationsByShift error:', error);
    throw error;
  }
}

/**
 * Approve a shift application
 * @param {number} id 
 * @param {number} businessId 
 * @param {string} updatedBy 
 * @returns {Promise<object>}
 */
export async function approveApplication(id, businessId, updatedBy = 'Employer') {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${JOB_API_BASE_URL}/applications/${id}/approve`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ applicationId: id, businessId, updatedBy })
    });

    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = resData.message || 'Không thể duyệt đơn ứng tuyển này.';
      throw new Error(errorMsg);
    }
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Jobs API] approveApplication error:', error);
    throw error;
  }
}

/**
 * Reject a shift application
 * @param {number} id 
 * @param {number} businessId 
 * @param {string} updatedBy 
 * @returns {Promise<object>}
 */
export async function rejectApplication(id, businessId, updatedBy = 'Employer') {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${JOB_API_BASE_URL}/applications/${id}/reject`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ applicationId: id, businessId, updatedBy })
    });

    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = resData.message || 'Không thể từ chối đơn ứng tuyển này.';
      throw new Error(errorMsg);
    }
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Jobs API] rejectApplication error:', error);
    throw error;
  }
}

/**
 * Fetch job posts by business
 * @param {number} businessId 
 * @param {number} [pageNumber=1] 
 * @param {number} [pageSize=20] 
 * @returns {Promise<object>}
 */
export async function getJobPostsByBusiness(businessId, pageNumber = 1, pageSize = 20) {
  try {
    const headers = await getAuthHeader();
    const url = `${JOB_API_BASE_URL}/job-posts/business/${businessId}?pageNumber=${pageNumber}&pageSize=${pageSize}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch business jobs: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Jobs API] getJobPostsByBusiness error:', error);
    throw error;
  }
}

/**
 * Fetch shifts associated with a job post
 * @param {number} jobPostId 
 * @returns {Promise<array>}
 */
export async function getJobPostShifts(jobPostId) {
  try {
    const headers = await getAuthHeader();
    const url = `${JOB_API_BASE_URL}/job-posts/${jobPostId}/shifts`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch job shifts: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Jobs API] getJobPostShifts error:', error);
    throw error;
  }
}

/**
 * Attach a shift to a job post
 * @param {number} jobPostId 
 * @param {object} payload 
 * @returns {Promise<object>}
 */
export async function createJobShift(jobPostId, payload) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${JOB_API_BASE_URL}/job-posts/${jobPostId}/shifts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jobPostId, ...payload })
    });
    if (!response.ok) {
      throw new Error(`Failed to create job shift: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Jobs API] createJobShift error:', error);
    throw error;
  }
}

/**
 * Publish a job post
 * @param {number} id 
 * @param {number} businessId 
 * @returns {Promise<object>}
 */
export async function publishJobPost(id, businessId, updatedBy = 'System') {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${JOB_API_BASE_URL}/job-posts/${id}/publish`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ id, businessId, updatedBy })
    });
    if (!response.ok) {
      throw new Error(`Failed to publish job post: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Jobs API] publishJobPost error:', error);
    throw error;
  }
}

/**
 * Fetch all job categories
 * @returns {Promise<array>}
 */
export async function getCategoriesApi() {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${JOB_API_BASE_URL}/categories`, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Jobs API] getCategoriesApi error:', error);
    throw error;
  }
}

/**
 * Fetch all skills
 * @returns {Promise<array>}
 */
export async function getSkillsApi() {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${JOB_API_BASE_URL}/skills`, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch skills: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Jobs API] getSkillsApi error:', error);
    throw error;
  }
}




