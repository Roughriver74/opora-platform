import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { AuthTokens } from '../contexts/auth/types';

export class ApiService {
  private api: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
  }> = [];

  constructor() {
    this.api = axios.create({
      baseURL: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - добавляем токен к каждому запросу
    this.api.interceptors.request.use(
      (config) => {
        const tokens = this.getTokens();
        if (tokens?.accessToken) {
          config.headers['Authorization'] = `Bearer ${tokens.accessToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - обрабатываем ошибки авторизации
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Если уже обновляем токен, добавляем запрос в очередь
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(() => {
              return this.api(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshed = await this.refreshToken();
            
            if (refreshed) {
              // Обрабатываем все запросы из очереди
              this.processQueue(null);
              return this.api(originalRequest);
            } else {
              // Если не удалось обновить токен, очищаем токены и перенаправляем на логин
              this.clearTokens();
              this.processQueue(new Error('Не удалось обновить токен'), null);
              window.location.reload();
              return Promise.reject(error);
            }
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            this.clearTokens();
            window.location.reload();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token: string | null = null): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  private getTokens(): AuthTokens | null {
    try {
      const accessToken = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      if (accessToken) {
        return {
          accessToken,
          refreshToken: refreshToken || '',
          expiresIn: '0' // Not used in this context
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private setTokens(tokens: AuthTokens): void {
    localStorage.setItem('token', tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
  }

  private clearTokens(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }

  private async refreshToken(): Promise<boolean> {
    const tokens = this.getTokens();
    
    if (!tokens?.refreshToken) {
      return false;
    }

    try {
      const response = await axios.post('/api/auth/refresh', {
        refreshToken: tokens.refreshToken
      });

      const data = response.data;

      if (response.status === 200 && data.success) {
        const newTokens: AuthTokens = {
          ...tokens,
          accessToken: data.accessToken,
          expiresIn: data.expiresIn
        };
        
        this.setTokens(newTokens);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Ошибка обновления токена:', error);
      return false;
    }
  }

  // Публичные методы для использования в компонентах
  public get(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.api.get(url, config);
  }

  public post(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.api.post(url, data, config);
  }

  public put(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.api.put(url, data, config);
  }

  public delete(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.api.delete(url, config);
  }

  public patch(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.api.patch(url, data, config);
  }
}

// Экспортируем экземпляр сервиса
export const apiService = new ApiService(); 