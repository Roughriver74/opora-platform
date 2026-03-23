export const FIELD_CONSTANTS = {
	DEBOUNCE_DELAY: 50, // Еще быстрее для лучшего отклика
	MIN_SEARCH_LENGTH: 1, // Возвращаем к 1 для удобства
	DEFAULT_TEXTAREA_ROWS: 4,
	COMPACT_TEXTAREA_ROWS: 3,
	MOBILE_TEXTAREA_ROWS: 2, // Новое для мобильных
	FORM_FIELD_MARGIN: '15px',
	COMPACT_FIELD_MARGIN: '8px', // Уменьшенный отступ для compact режима
	MOBILE_FIELD_MARGIN: '6px', // Новое для мобильных
	NUMBER_FIELD_MARGIN: '10px', // Специальный отступ для числовых полей
	MOBILE_NUMBER_FIELD_MARGIN: '6px', // Новое для мобильных
}

export const FIELD_TEXTS = {
	NO_OPTIONS: 'Нет доступных вариантов',
	LOADING: 'Загрузка...',
}

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
	HEADER: 'header',
	PRODUCT_TABLE: 'product_table',
} as const
