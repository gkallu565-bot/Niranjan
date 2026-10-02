const API_BASE = '/api';

const api = {
  getToken() {
    return localStorage.getItem('xen_token');
  },

  setToken(token) {
    localStorage.setItem('xen_token', token);
  },

  removeToken() {
    localStorage.removeItem('xen_token');
    localStorage.removeItem('xen_user');
  },

  getCurrentUser() {
    try {
      const user = localStorage.getItem('xen_user');
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    localStorage.setItem('xen_user', JSON.stringify(user));
  },

  async request(endpoint, options = {}) {
    const headers = options.headers || {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    return data;
  },

  // Properties
  async getProperties(params = {}) {
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        query.append(key, params[key]);
      }
    });
    return this.request(`/properties?${query.toString()}`);
  },

  async getFeaturedProperties() {
    return this.request('/properties/featured');
  },

  async getPropertyById(id) {
    return this.request(`/properties/${id}`);
  },

  async createProperty(formData) {
    return this.request('/properties', {
      method: 'POST',
      body: formData
    });
  },

  async deleteProperty(id) {
    return this.request(`/properties/${id}`, {
      method: 'DELETE'
    });
  },

  // AI Chat & Matchmaker
  async askAI(message) {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  },

  // Inquiries & Site Visits
  async submitInquiry(data) {
    return this.request('/inquiries', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getInquiries() {
    return this.request('/inquiries');
  },

  // Home Loans
  async applyLoan(data) {
    return this.request('/loans/apply', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getLoans() {
    return this.request('/loans');
  },

  // Design Studio
  async requestDesign(data) {
    return this.request('/design/request', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getDesignRequests() {
    return this.request('/design/requests');
  },

  // Auth
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) {
      this.setToken(data.token);
      this.setCurrentUser(data.user);
    }
    return data;
  },

  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (data.token) {
      this.setToken(data.token);
      this.setCurrentUser(data.user);
    }
    return data;
  },

  async getMe() {
    return this.request('/auth/me');
  },

  // Admin
  async getAdminStats() {
    return this.request('/admin/stats');
  }
};

window.api = api;
