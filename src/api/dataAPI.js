import api from './config';

// Generic CRUD API for backend PostgreSQL tables
// Replaces direct Database access

export const dataAPI = {
  // List records with optional filters
  async list(table, filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, v);
    });
    const response = await api.get(`/data/${table}?${params.toString()}`);
    return response.data.data || [];
  },

  // Get single record by ID
  async get(table, id) {
    const response = await api.get(`/data/${table}/${id}`);
    return response.data.data;
  },

  // Create record
  async create(table, data) {
    const response = await api.post(`/data/${table}`, data);
    return response.data.data;
  },

  // Update record
  async update(table, id, data) {
    const response = await api.put(`/data/${table}/${id}`, data);
    return response.data.data;
  },

  // Delete record
  async delete(table, id) {
    await api.delete(`/data/${table}/${id}`);
    return true;
  },

  // Bulk create
  async bulkCreate(table, records) {
    const response = await api.post(`/data/${table}/bulk`, { records });
    return response.data;
  }
};

export default dataAPI;
