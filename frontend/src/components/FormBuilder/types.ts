// frontend/src/components/FormBuilder/types.ts

export type EntityType = 'visit' | 'clinic' | 'doctor' | 'contact' | 'network_clinic';

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  visit: 'Визиты',
  clinic: 'Компании',
  doctor: 'Врачи',
  contact: 'Контакты',
  network_clinic: 'Филиалы',
};

export const FIELD_TYPES = [
  { value: 'text', label: 'Текст' },
  { value: 'textarea', label: 'Многострочный текст' },
  { value: 'select', label: 'Выпадающий список' },
  { value: 'checkbox', label: 'Чекбокс' },
  { value: 'date', label: 'Дата' },
  { value: 'number', label: 'Число' },
] as const;

export type FieldType = typeof FIELD_TYPES[number]['value'];

export interface BitrixValueMapping {
  app_value: string;
  bitrix_value: string;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  bitrix_field_id?: string | null;
  bitrix_field_type?: string | null;
  bitrix_value_mapping?: BitrixValueMapping[];
}

export interface FormTemplate {
  id?: number;
  organization_id?: number;
  entity_type: EntityType;
  fields: FieldDefinition[];
}

export interface BitrixField {
  field_id: string;
  title: string;
  type: string;           // "list", "string", "datetime", "double", "boolean"
  is_required: boolean;
  items?: Array<{ id: string; value: string }>;
}

/** Generate a Latin key from a Cyrillic label */
export function generateKey(label: string): string {
  const cyrToLat: Record<string, string> = {
    а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'yo', ж:'zh', з:'z',
    и:'i', й:'j', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r',
    с:'s', т:'t', у:'u', ф:'f', х:'h', ц:'ts', ч:'ch', ш:'sh', щ:'sch',
    ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya',
  };
  const result = label
    .toLowerCase()
    .split('')
    .map(c => cyrToLat[c] ?? (c.match(/[a-z0-9]/) ? c : '_'))
    .join('')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return result || `field_${Date.now()}`;
}
