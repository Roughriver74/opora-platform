export const FIELD_CONSTANTS = {
  DEBOUNCE_DELAY: 800, // Увеличиваем debounce с 400 до 800мс
  MIN_SEARCH_LENGTH: 3, // Увеличиваем минимальную длину с 1 до 3 символов
  DEFAULT_TEXTAREA_ROWS: 4,
  COMPACT_TEXTAREA_ROWS: 3,
  FORM_FIELD_MARGIN: '15px'
};

export const FIELD_TEXTS = {
  NO_OPTIONS: 'Нет доступных вариантов',
  LOADING: 'Загрузка...'
};

export const FIELD_TYPES = {
  TEXT: 'text',
  SELECT: 'select', 
  AUTOCOMPLETE: 'autocomplete',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  DATE: 'date',
  DIVIDER: 'divider',
  HEADER: 'header'
} as const;
