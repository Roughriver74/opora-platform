import api from './api';
import { FormSubmission, FormSubmissionResponse } from '../types';

// Сервис для отправки форм заявок
export const SubmissionService = {
  // Отправка формы заявки
  submitForm: async (submission: FormSubmission): Promise<FormSubmissionResponse> => {
    const response = await api.post('/submissions/submit', submission);
    return response.data;
  }
};
