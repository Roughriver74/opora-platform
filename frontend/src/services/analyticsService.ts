import { api } from './api';

export interface AnalyticsSummary {
  visits_this_month: number;
  visits_prev_month: number;
  visits_growth_pct: number;
  active_users_this_month: number;
  total_companies: number;
  total_users: number;
  visits_by_status: Record<string, number>;
  plan: string;
  plan_limits: Record<string, number>;
}

export interface DayData {
  date: string;
  count: number;
}

export interface TopUser {
  user_id: number;
  email: string;
  visits_count: number;
}

export const analyticsService = {
  getSummary: async (): Promise<AnalyticsSummary> => {
    const { data } = await api.get('/analytics/summary');
    return data;
  },

  getVisitsByDay: async (days: number = 30): Promise<DayData[]> => {
    const { data } = await api.get('/analytics/visits-by-day', { params: { days } });
    return data;
  },

  getTopUsers: async (days: number = 30): Promise<TopUser[]> => {
    const { data } = await api.get('/analytics/top-users', { params: { days } });
    return data;
  },
};
