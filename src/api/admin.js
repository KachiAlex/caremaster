import api from './config';

export const adminAPI = {
  // Get dashboard statistics
  getDashboard: async (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await api.get(`/admin/dashboard?${params.toString()}`);
    return response.data;
  },

  // Get detailed reports
  getReports: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    
    const response = await api.get(`/admin/reports?${params.toString()}`);
    return response.data;
  },

  // Export reports to Excel
  exportExcel: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    
    const response = await api.get(`/admin/reports/export/excel?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Export reports to CSV
  exportCSV: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    
    const response = await api.get(`/admin/reports/export/csv?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Generate and download receipt
  generateReceipt: async (transactionId) => {
    const response = await api.get(`/admin/receipt/${transactionId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Get audit logs
  getAuditLogs: async (page = 1, limit = 50, filters = {}) => {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    
    const response = await api.get(`/admin/audit-logs?${params.toString()}`);
    return response.data;
  }
};
