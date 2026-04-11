import { api } from './api';

// Define contact interfaces
export interface Contact {
  id: number;
  name: string;
  contact_type?: string;
  bitrix_id?: number;
  last_synced?: string;
  sync_status?: string;
  sync_error?: string | null;
  dynamic_fields?: Record<string, any>;
  position?: string;
  email?: string;
  phone?: string;
}

export interface ContactCreate {
  name: string;
  contact_type?: string;
  bitrix_id?: number;
  dynamic_fields?: Record<string, any>;
}

export interface ContactUpdate {
  name?: string;
  contact_type?: string;
  dynamic_fields?: Record<string, any>;
}

export interface PaginatedContacts {
  items: Contact[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Сервис для работы с контактами
 */
export const contactService = {
  /**
   * Получить контакты с пагинацией
   */
  async getContacts(page: number = 1, pageSize: number = 20, search?: string): Promise<PaginatedContacts> {
    const response = await api.get('/contacts/', {
      params: { page, page_size: pageSize, ...(search ? { search } : {}) }
    });
    return response.data;
  },

  /**
   * Получить контакт по ID
   * @param id ID контакта
   * @param syncWithBitrix Синхронизировать с Bitrix24
   */
  async getContact(id: number, syncWithBitrix: boolean = false): Promise<Contact> {
    const response = await api.get(`/contacts/${id}`, {
      params: { sync_with_bitrix: syncWithBitrix }
    });
    return response.data;
  },

  /**
   * Создать новый контакт
   * @param contact Данные контакта
   */
  async createContact(contact: ContactCreate): Promise<Contact> {
    const response = await api.post('/contacts/', contact);
    return response.data;
  },

  /**
   * Обновить существующий контакт
   * @param id ID контакта
   * @param contact Данные для обновления
   */
  async updateContact(id: number, contact: ContactUpdate): Promise<Contact> {
    const response = await api.put(`/contacts/${id}`, contact);
    return response.data;
  },

  /**
   * Поиск контактов по имени в Bitrix24
   * @param term Строка поиска
   */
  async searchContactsByName(term: string): Promise<any[]> {
    const response = await api.get('/contacts/search', {
      params: { term }
    });
    return response.data.contacts || [];
  },

  /**
   * Получить контакт из Bitrix24 по ID
   * @param bitrixId ID контакта в Bitrix24
   */
  async getContactFromBitrix(bitrixId: number): Promise<any> {
    const response = await api.get(`/contacts/bitrix/${bitrixId}`);
    return response.data;
  },

  /**
   * Обновить контакт напрямую в Bitrix24
   * @param bitrixId ID контакта в Bitrix24
   * @param fields Поля для обновления
   */
  async updateContactInBitrix(bitrixId: number, fields: any): Promise<boolean> {
    const response = await api.post('/contacts/bitrix/update', {
      id: bitrixId,
      fields
    });
    return response.data.success || false;
  },

  /**
   * Синхронизировать контакты из Bitrix24
   */
  async syncContactsFromBitrix(): Promise<Contact[]> {
    const response = await api.post('/contacts/sync');
    return response.data;
  }
};
