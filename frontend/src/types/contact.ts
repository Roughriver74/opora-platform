/**
 * Базовый интерфейс для контакта (ЛПР)
 */
export interface ContactBase {
  name: string;
  contact_type?: string;
  dynamic_fields?: Record<string, any>;
}

/**
 * Интерфейс для создания нового контакта
 */
export interface ContactCreate extends ContactBase {
  bitrix_id?: number;
}

/**
 * Интерфейс для обновления существующего контакта
 */
export interface ContactUpdate {
  name?: string;
  contact_type?: string;
  dynamic_fields?: Record<string, any>;
}

/**
 * Полный интерфейс контакта
 */
export interface Contact extends ContactBase {
  id: number;
  bitrix_id?: number;
  last_synced?: string;
  sync_status?: string;
}

/**
 * Тип для связи контакта с компанией
 */
export interface ContactCompanyRelation {
  contact_id: number;
  company_id: number;
}

/**
 * Тип для связи контакта с визитом
 */
export interface ContactVisitRelation {
  contact_id: number;
  visit_id: number;
}
