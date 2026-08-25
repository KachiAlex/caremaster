/**
 * functions.js - Express API compatibility layer for Firebase Cloud Functions.
 *
 * Maps httpsCallable(functions, 'functionName') to the corresponding
 * Express REST endpoint. Each callable returns a function that POSTs to
 * the mapped route and returns { data: result } to match the Firebase
 * callable convention.
 */

const API_BASE = () =>
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('authToken') || '';
}

async function apiCall(method, path, body) {
  const url = `${API_BASE()}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error(data.message || `API error ${res.status}`);
    err.code = data.code || res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Map Cloud Function names to Express routes
const FUNCTION_ROUTES = {
  // Email / SMS
  sendEmail: { method: 'POST', path: '/email/generic' },
  sendSMS: { method: 'POST', path: '/email/generic' },

  // Institutions
  createInstitutionFunction: { method: 'POST', path: '/superadmin/institutions' },
  getInstitutionsFunction: { method: 'GET', path: '/superadmin/institutions' },
  updateInstitutionFunction: { method: 'PUT', path: '/superadmin/institutions' },
  deleteInstitutionFunction: { method: 'DELETE', path: '/superadmin/institutions' },

  // Licenses
  createLicenseFunction: { method: 'POST', path: '/superadmin/licenses' },
  getLicensesFunction: { method: 'GET', path: '/superadmin/licenses' },
  updateLicenseFunction: { method: 'PUT', path: '/superadmin/licenses' },
  suspendLicenseFunction: { method: 'POST', path: '/superadmin/licenses' },
  activateLicenseFunction: { method: 'POST', path: '/superadmin/licenses' },

  // Institution admins
  assignInstitutionAdminFunction: { method: 'POST', path: '/superadmin/institutions' },
  getInstitutionAdminsFunction: { method: 'GET', path: '/superadmin/institutions' },
  removeInstitutionAdminFunction: { method: 'DELETE', path: '/superadmin/institutions' },
  migrateInstitutionLinksFunction: { method: 'PUT', path: '/superadmin/institutions' },

  // User management
  createCaregiverWithAuthFunction: { method: 'POST', path: '/admin/users' },
  createInstitutionUserFunction: { method: 'POST', path: '/admin/users' },
  resetCaregiverPasswordFunction: { method: 'PUT', path: '/admin/users' },
  resetSuperAdminPassword: { method: 'PUT', path: '/superadmin/users' },
  deleteSuperAdmin: { method: 'DELETE', path: '/superadmin/users' },
  setSuperAdminClaim: { method: 'PUT', path: '/superadmin/users' },

  // Payments
  sendPaymentLinkEmailFunction: { method: 'POST', path: '/email/generic' },

  // Medications
  createMedicationReminder: { method: 'POST', path: '/data/medications' },
  logMedicationDose: { method: 'POST', path: '/data/medication_logs' },
  getMedicationAnalytics: { method: 'GET', path: '/data/medications' },

  // Emergency
  processEmergencyAlert: { method: 'POST', path: '/data/emergency_alerts' },
  coordinateEmergencyResponse: { method: 'POST', path: '/data/emergency_alerts' },
  updateEmergencyStatus: { method: 'PUT', path: '/data/emergency_alerts' },
};

export const getFunctions = (_app) => ({ __type: 'functions' });
export const connectFunctionsEmulator = () => {};

/**
 * httpsCallable(functions, name) → callable(data) → Promise<{ data }>
 *
 * Looks up the function name in FUNCTION_ROUTES. If found, calls the mapped
 * Express endpoint. If not found, attempts a generic POST to /data/:name
 * as a fallback.
 */
export function httpsCallable(_functions, name) {
  return async (data) => {
    const route = FUNCTION_ROUTES[name];

    if (route) {
      // Build path — if data contains an id, interpolate it
      let path = route.path;
      const id = data?.id || data?.userId || data?.institutionId || data?.licenseId;
      if (id && path.includes(':id')) {
        path = path.replace(':id', id);
      } else if (id && (route.method === 'PUT' || route.method === 'DELETE')) {
        path = `${path}/${id}`;
      }

      const result = await apiCall(route.method, path, data);
      return { data: result.data || result };
    }

    // Fallback: try POST /data/:name (treating function name as table)
    try {
      const result = await apiCall('POST', `/data/${name}`, data);
      return { data: result.data || result };
    } catch (err) {
      console.warn(`[functions] No route mapping for "${name}" and fallback failed:`, err.message);
      throw err;
    }
  };
}
