import { api } from './api';

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface SetupRequest {
  template_id: string;
  company_name: string;
  team_size: string;
}

export interface SetupResponse {
  template_applied: string;
  template_name: string;
  form_fields_count: number;
  checklist_items_count: number;
  statuses: string[];
  message: string;
}

export const onboardingService = {
  getTemplates: () =>
    api.get<TemplateInfo[]>('/onboarding/templates').then((r) => r.data),

  setup: (data: SetupRequest) =>
    api.post<SetupResponse>('/onboarding/setup', data).then((r) => r.data),
};
