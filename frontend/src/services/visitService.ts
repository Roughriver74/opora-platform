import axios from 'axios';
import { api } from './api';

// Перечисление статусов визита
export enum VisitStatus {
  planned = "planned",
  in_progress = "in_progress",
  completed = "completed",
  failed = "failed",
  cancelled = "cancelled"
}

// Отображаемые названия статусов
export const visitStatusDisplayNames: Record<VisitStatus, string> = {
  [VisitStatus.planned]: "Запланирован",
  [VisitStatus.in_progress]: "В работе",
  [VisitStatus.completed]: "Состоялся",
  [VisitStatus.failed]: "Провалился",
  [VisitStatus.cancelled]: "Отменен"
};

// Цвета для статусов
export const visitStatusColors: Record<VisitStatus, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
  [VisitStatus.planned]: "info",
  [VisitStatus.in_progress]: "warning",
  [VisitStatus.completed]: "success",
  [VisitStatus.failed]: "error",
  [VisitStatus.cancelled]: "default"
};

// Типы для визитов
export interface Visit {
  id: number;
  bitrix_id?: number;
  company_id: number;
  visit_type: string;
  date: string;
  status: VisitStatus;
  status_display?: string; // Отображаемое название статуса
  comment: string;
  with_distributor: boolean;
  sansus: boolean;
  sync_status: string;
  last_synced?: string;
  dynamic_fields?: Record<string, any>;
  checkin_at?: string | null;
  checkin_lat?: number | null;
  checkin_lon?: number | null;
  checkout_at?: string | null;
  checkout_lat?: number | null;
  checkout_lon?: number | null;
  company?: {
    id: number;
    name: string;
    address?: string;
    city?: string;
    inn?: string; // Добавляем ИНН клиники
    dynamic_fields?: Record<string, any>;
  };
}

export interface VisitInput {
  company_id: number;
  date: string;
  doctor_ids: number[];
  visit_type?: string;
  status?: VisitStatus;
  comment?: string;
  with_distributor?: boolean;
  sansus?: boolean;
  dynamic_fields?: Record<string, any>;
}

export interface VisitDetails extends Visit {
  company: {
    id: number;
    name: string;
    address: string;
    city: string;
    dynamic_fields?: Record<string, any>;
    contacts?: {
      id: number;
      name: string;
      position?: string;
      phone?: string;
      email?: string;
      bitrix_id?: number;
    }[];
    phone?: string[];
    email?: string[];
    inn?: string;
    bitrix_id?: number;
    [key: string]: any;
  };
  doctors: {
    id: number;
    name: string;
    specialization: string;
    contact: string;
    dynamic_fields?: Record<string, any>;
  }[];
  dynamic_fields?: Record<string, any>;
}

// Сервис для работы с визитами
export const visitService = {
  // Получить все визиты
  getVisits: async (): Promise<Visit[]> => {
    const response = await api.get('/visits/');
    return response.data;
  },

  // Получить детали визита по ID
  getVisit: async (id: number): Promise<VisitDetails> => {
    const response = await api.get(`/visits/${id}`);
    return response.data;
  },

  // Создать новый визит
  createVisit: async (visitData: VisitInput): Promise<Visit> => {
    const response = await api.post('/visits/', visitData);
    return response.data;
  },

  // Обновить существующий визит
  updateVisit: async (id: number, visitData: VisitInput): Promise<Visit> => {
    const response = await api.post(`/visits/${id}`, visitData);
    return response.data;
  },

  // Удалить визит
  deleteVisit: async (
    params: { visit_id: number } | { visit_bitrix_id: number }
  ): Promise<void> => {
    await api.delete('/visits', { data: params });
  },

  // Синхронизировать визиты с Bitrix24
  syncVisits: async (): Promise<void> => {
    await api.post('/visits/sync');
  },

  // Обновить статус визита в Bitrix24
  updateVisitStatus: async (id: number, status: 'success' | 'fail'): Promise<Visit> => {
    const stageId = status === 'success' ? 'DT1054_21:SUCCESS' : 'DT1054_21:FAIL';
    const response = await api.put(`/visits/${id}/status`, { stageId });
    return response.data;
  },

  // Получить визиты по ID компании
  getVisitsByCompanyId: async (companyId: number): Promise<Visit[]> => {
    const response = await api.get(`/visits/company/${companyId}`);
    return response.data;
  }
};
