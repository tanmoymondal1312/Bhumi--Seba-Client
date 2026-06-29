const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('authToken');
}

async function request<T = any>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/login')) {
      localStorage.removeItem('authToken');
      window.location.reload();
      throw new Error('সেশন মেয়াদ শেষ। পুনরায় লগইন করুন।');
    }
    const error = await res.json().catch(() => ({ message: 'অনুরোধ ব্যর্থ হয়েছে।' }));
    throw new Error(error.message || 'অনুরোধ ব্যর্থ হয়েছে।');
  }

  return res.json();
}

export const api = {
  auth: {
    usersList: () =>
      request<any[]>('/auth/users-list'),
    login: (userId: string, pin: string) =>
      request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ userId, pin }),
      }),
    logout: () =>
      request('/auth/logout', { method: 'POST' }),
    me: () =>
      request<{ user: any }>('/auth/me'),
    updateAvatar: (avatar: string) =>
      request<{ avatar: string }>('/auth/avatar', {
        method: 'PUT',
        body: JSON.stringify({ avatar }),
      }),
  },

  users: {
    getAll: () => request<any[]>('/users'),
    create: (data: { name: string; role: string; pin: string; phone?: string; avatar?: string }) =>
      request('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { name?: string; role?: string; pin?: string; phone?: string; avatar?: string }) =>
      request(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/users/${id}`, { method: 'DELETE' }),
  },

  income: {
    getAll: () => request<any[]>('/income'),
    create: (data: any) =>
      request<{ income: any; bkash: any | null }>('/income', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request(`/income/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/income/${id}`, { method: 'DELETE' }),
  },

  expenses: {
    getAll: () => request<any[]>('/expenses'),
    create: (data: any) =>
      request('/expenses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/expenses/${id}`, { method: 'DELETE' }),
  },

  bkash: {
    getAll: () => request<any[]>('/bkash'),
    create: (data: any) =>
      request('/bkash', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request(`/bkash/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/bkash/${id}`, { method: 'DELETE' }),
  },

  reminders: {
    getAll: () => request<any[]>('/reminders'),
    create: (data: { title: string; date: string }) =>
      request('/reminders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    toggle: (id: string) =>
      request(`/reminders/${id}/toggle`, { method: 'PATCH' }),
    delete: (id: string) =>
      request(`/reminders/${id}`, { method: 'DELETE' }),
  },

  settings: {
    get: () => request<any>('/settings'),
    update: (data: any) =>
      request('/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  services: {
    getAll: () => request<any[]>('/services'),
    create: (data: any) =>
      request('/services', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (key: string, data: any) =>
      request(`/services/${key}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (key: string) =>
      request(`/services/${key}`, { method: 'DELETE' }),
    toggle: (key: string, isActive: boolean) =>
      request(`/services/${key}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ isActive }),
      }),
  },

  memos: {
    getAll: () => request<any[]>('/memos'),
    create: (data: any) =>
      request('/memos', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/memos/${id}`, { method: 'DELETE' }),
  },

  backup: {
    export: () => request<any>('/backup/export'),
    reset: () => request('/backup/reset', { method: 'POST' }),
  },
};
