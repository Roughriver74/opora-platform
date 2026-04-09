import { api } from './api';

export interface Doctor {
  id: number;
  name: string;
  specialization: string;
  contact: string;
  position?: string;
  phone?: string;
  email?: string;
  bitrix_id?: number;
  sync_status: string;
  last_synced?: string;
  dynamic_fields?: Record<string, any>;
}

export interface DoctorInput {
  name: string;
  specialization: string;
  contact: string;
}

export const doctorService = {
  // Получить всех докторов
  getDoctors: async (): Promise<Doctor[]> => {
    const response = await api.get('/doctors/');
    return response.data;
  },

  // Получить доктора по ID
  getDoctor: async (id: number): Promise<Doctor> => {
    const response = await api.get(`/doctors/${id}`);
    return response.data;
  },

  // Создать нового доктора
  createDoctor: async (doctor: DoctorInput): Promise<Doctor> => {
    const response = await api.post('/doctors/', doctor);
    return response.data;
  },

  // Обновить существующего доктора
  updateDoctor: async (id: number, doctor: DoctorInput): Promise<Doctor> => {
    const response = await api.put(`/doctors/${id}`, doctor);
    return response.data;
  },

  // Удалить доктора
  deleteDoctor: async (id: number): Promise<void> => {
    await api.delete(`/doctors/${id}`);
  },

  // Синхронизировать докторов с Bitrix24
  syncDoctors: async (): Promise<void> => {
    await api.post('/doctors/sync');
  }
};
