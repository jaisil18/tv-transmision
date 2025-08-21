import { logger } from './logger';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  code?: string;
}

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      logger.debug(`API Request: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers
        }
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error(`API Error: ${response.status}`, data);
        return {
          error: data.error || 'Error en la solicitud',
          code: data.code
        };
      }

      logger.debug(`API Response: ${response.status}`, data);
      return { data };
    } catch (error) {
      logger.error('Network error', error);
      return {
        error: 'Error de conexión',
        code: 'NETWORK_ERROR'
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type for FormData
    });
  }
}

export const api = new ApiClient();

// Specific API methods
export const screenApi = {
  getAll: () => api.get('/screens'),
  getById: (id: string) => api.get(`/screens/${id}`),
  create: (data: any) => api.post('/screens', data),
  update: (id: string, data: any) => api.put(`/screens/${id}`, data),
  delete: (id: string) => api.delete(`/screens/${id}`)
};

export const playlistApi = {
  getAll: () => api.get('/playlists'),
  getById: (id: string) => api.get(`/playlists/${id}`),
  create: (data: any) => api.post('/playlists', data),
  update: (id: string, data: any) => api.put(`/playlists/${id}`, data),
  delete: (id: string) => api.delete(`/playlists/${id}`)
};

export const fileApi = {
  getAll: (folder?: string) => api.get(`/files${folder ? `?folder=${folder}` : ''}`),
  upload: (formData: FormData) => api.upload('/files', formData),
  delete: (path: string) => api.delete(`/files?path=${encodeURIComponent(path)}`),
  createFolder: (name: string, parent?: string) => api.post('/files/folder', { name, parent })
};