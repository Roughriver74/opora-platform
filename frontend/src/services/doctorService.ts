import { api } from './api';

export interface Doctor {
  id: number;
  name: string;
  bitrix_id?: number;
  sync_status?: string;
  sync_error?: string;
  last_synced?: string;
  dynamic_fields?: Record<string, any>;
  organization_id?: number;
}

export interface DoctorCreate {
  name: string;
  bitrix_id?: number;
  dynamic_fields?: Record<string, any>;
}

export interface DoctorUpdate {
  name?: string;
  dynamic_fields?: Record<string, any>;
}

export interface PaginatedDoctors {
  items: Doctor[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const doctorService = {
  // Получить специалистов с пагинацией
  getDoctors: async (page: number = 1, pageSize: number = 20, search?: string): Promise<PaginatedDoctors> => {
    const response = await api.get('/doctors/', {
      params: { page, page_size: pageSize, ...(search ? { search } : {}) }
    });
    return response.data;
  },

  // Получить специалиста по ID
  getDoctor: async (id: number): Promise<Doctor> => {
    const response = await api.get(`/doctors/${id}`);
    return response.data;
  },

  // Создать нового специалиста
  createDoctor: async (doctor: DoctorCreate): Promise<Doctor> => {
    const response = await api.post('/doctors/', doctor);
    return response.data;
  },

  // Обновить существующего специалиста
  updateDoctor: async (id: number, doctor: DoctorUpdate): Promise<Doctor> => {
    const response = await api.put(`/doctors/${id}`, doctor);
    return response.data;
  },

  // Удалить специалиста
  deleteDoctor: async (id: number): Promise<void> => {
    await api.delete(`/doctors/${id}`);
  },

  // Синхронизировать специалистов
  syncDoctors: async (): Promise<void> => {
    await api.post('/doctors/sync');
  }
};
