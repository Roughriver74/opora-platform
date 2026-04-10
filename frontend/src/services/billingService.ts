import { api } from './api';

// --- Types ---

export interface PlanLimits {
  max_users: number;
  max_visits_per_month: number;
}

export interface BillingUsage {
  users_count: number;
  visits_this_month: number;
}

export interface BillingPlan {
  plan: 'FREE' | 'PRO';
  plan_limits: PlanLimits;
  billing_email?: string;
  billing_inn?: string;
  usage: BillingUsage;
}

export interface UpgradeRequest {
  users_count: number;
  payment_method: 'invoice' | 'yukassa';
}

export interface UpgradeResponse {
  success: boolean;
  message: string;
  payment_url?: string;
  invoice_number?: string;
  amount?: number;
}

export interface Payment {
  id: number;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'cancelled';
  method: 'invoice' | 'yukassa';
  description: string;
}

export interface CheckPaymentResponse {
  payment_id: string;
  local_status: string;
  yukassa_status: string;
  paid: boolean;
  amount: number;
}

// --- API calls ---

export const getBillingPlan = async (): Promise<BillingPlan> => {
  const response = await api.get('/billing/plan');
  return response.data;
};

export const requestUpgrade = async (data: UpgradeRequest): Promise<UpgradeResponse> => {
  const response = await api.post('/billing/request-upgrade', data);
  return response.data;
};

export const getPayments = async (): Promise<Payment[]> => {
  const response = await api.get('/billing/payments');
  return response.data;
};

export const checkPaymentStatus = async (paymentId: number): Promise<CheckPaymentResponse> => {
  const response = await api.get(`/billing/check-payment/${paymentId}`);
  return response.data;
};
