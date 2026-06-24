import { MANAGEMENT_API_BASE_URL, getAuthHeader } from './apiConfig';

/**
 * Fetch staff roster (employees) for the business
 * @param {string} [status] 
 * @returns {Promise<object>}
 */
export async function getEmployees(status = '') {
  try {
    const headers = await getAuthHeader();
    let url = `${MANAGEMENT_API_BASE_URL}/employees`;
    if (status) {
      url += `?status=${status}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch employees: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Management API] getEmployees error:', error);
    throw error;
  }
}

/**
 * Add a new employee manually to the HRM roster
 * @param {object} payload 
 * @returns {Promise<object>}
 */
export async function createEmployee(payload) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${MANAGEMENT_API_BASE_URL}/employees`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`Failed to add employee: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Management API] createEmployee error:', error);
    throw error;
  }
}

/**
 * Update an existing employee manually in the HRM roster
 * @param {number} id 
 * @param {object} payload 
 * @returns {Promise<object>}
 */
export async function updateEmployee(id, payload) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${MANAGEMENT_API_BASE_URL}/employees/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`Failed to update employee: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Management API] updateEmployee error:', error);
    throw error;
  }
}

/**
 * Terminate/Delete an employee from the roster
 * @param {number} id 
 * @returns {Promise<object>}
 */
export async function deleteEmployee(id) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${MANAGEMENT_API_BASE_URL}/employees/${id}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) {
      throw new Error(`Failed to delete employee: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Management API] deleteEmployee error:', error);
    throw error;
  }
}

/**
 * Check-in a student using QR code token and GPS
 * @param {object} payload { qrToken, latitude, longitude, checkInPhoto }
 * @returns {Promise<object>} returns { TimekeepingId }
 */
export async function checkInShiftApi(payload) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${MANAGEMENT_API_BASE_URL}/timekeeping/check-in`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = resData.message || 'Check-in thất bại. Vui lòng quét mã và thử lại.';
      throw new Error(errorMsg);
    }
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Management API] checkInShift API error:', error);
    throw error;
  }
}

/**
 * Check-out from a shift
 * @param {object} payload { timekeepingId, latitude, longitude, checkOutPhoto }
 * @returns {Promise<object>}
 */
export async function checkOutShiftApi(payload) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${MANAGEMENT_API_BASE_URL}/timekeeping/check-out`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = resData.message || 'Check-out thất bại. Vui lòng thử lại.';
      throw new Error(errorMsg);
    }
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Management API] checkOutShift API error:', error);
    throw error;
  }
}

/**
 * Fetch the active business QR code settings
 * @returns {Promise<object>}
 */
export async function getQrCode() {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${MANAGEMENT_API_BASE_URL}/qr-code`, { headers });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch QR Code: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Management API] getQrCode error:', error);
    throw error;
  }
}

/**
 * Generate/Regenerate QR code token for checking in
 * @returns {Promise<object>} returns { QrToken }
 */
export async function generateQrCode() {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${MANAGEMENT_API_BASE_URL}/qr-code/generate`, {
      method: 'POST',
      headers
    });
    if (!response.ok) {
      throw new Error(`Failed to generate QR Code: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Management API] generateQrCode error:', error);
    throw error;
  }
}

/**
 * Update the allowed radius for QR code checks
 * @param {number} allowedRadiusMeters 
 * @returns {Promise<object>}
 */
export async function updateQrRadius(allowedRadiusMeters) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${MANAGEMENT_API_BASE_URL}/qr-code/radius`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ allowedRadiusMeters })
    });
    if (!response.ok) {
      throw new Error(`Failed to update QR radius: ${response.status}`);
    }
    const resData = await response.json().catch(() => ({}));
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Management API] updateQrRadius error:', error);
    throw error;
  }
}

/**
 * Fetch work schedules for a given date
 * @param {string} date format YYYY-MM-DD
 * @returns {Promise<object>}
 */
export async function getSchedules(date) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${MANAGEMENT_API_BASE_URL}/schedules?date=${date}`, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch schedules: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Management API] getSchedules error:', error);
    throw error;
  }
}

/**
 * Create a new schedule for an employee
 * @param {number} employeeId 
 * @param {object} payload 
 * @returns {Promise<object>}
 */
export async function createSchedule(employeeId, payload) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${MANAGEMENT_API_BASE_URL}/employees/${employeeId}/schedules`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`Failed to create schedule: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Management API] createSchedule error:', error);
    throw error;
  }
}

/**
 * Get all payroll calculations
 * @param {string} [status] 
 * @returns {Promise<object>}
 */
export async function getPayrolls(status = '') {
  try {
    const headers = await getAuthHeader();
    let url = `${MANAGEMENT_API_BASE_URL}/payrolls`;
    if (status) {
      url += `?status=${status}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch payrolls: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Management API] getPayrolls error:', error);
    throw error;
  }
}

/**
 * Calculate payroll for employees
 * @param {object} command 
 * @returns {Promise<object>}
 */
export async function calculatePayroll(command) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${MANAGEMENT_API_BASE_URL}/payrolls/calculate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(command)
    });
    if (!response.ok) {
      throw new Error(`Failed to calculate payroll: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Management API] calculatePayroll error:', error);
    throw error;
  }
}

/**
 * Approve and paid payroll
 * @param {number} id 
 * @param {object} command 
 * @returns {Promise<object>}
 */
export async function approvePayroll(id, command = {}) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${MANAGEMENT_API_BASE_URL}/payrolls/${id}/approve`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ payrollId: id, ...command })
    });
    if (!response.ok) {
      throw new Error(`Failed to approve payroll: ${response.status}`);
    }
    const resData = await response.json().catch(() => ({}));
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Management API] approvePayroll error:', error);
    throw error;
  }
}

/**
 * Get timekeeping check-in log details for real-time monitoring
 * @param {string} date format YYYY-MM-DD
 * @returns {Promise<object>}
 */
export async function getTimekeepingLogs(date) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${MANAGEMENT_API_BASE_URL}/timekeeping?date=${date}`, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch timekeeping logs: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Management API] getTimekeepingLogs error:', error);
    throw error;
  }
}

/**
 * Delete a work schedule
 * @param {number} id 
 * @returns {Promise<object>}
 */
export async function deleteSchedule(id) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${MANAGEMENT_API_BASE_URL}/schedules/${id}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) {
      throw new Error(`Failed to delete schedule: ${response.status}`);
    }
    const resData = await response.json().catch(() => ({}));
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Management API] deleteSchedule error:', error);
    throw error;
  }
}

/**
 * Fetch employee's own schedules
 * @param {string} fromDate format YYYY-MM-DD
 * @param {string} toDate format YYYY-MM-DD
 * @returns {Promise<object>}
 */
export async function getMySchedules(fromDate, toDate) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${MANAGEMENT_API_BASE_URL}/schedules/my-schedules?fromDate=${fromDate}&toDate=${toDate}`, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch my schedules: ${response.status}`);
    }
    const resData = await response.json();
    return resData.data !== undefined ? resData.data : resData;
  } catch (error) {
    console.log('[ProxiJob Management API] getMySchedules error:', error);
    throw error;
  }
}
