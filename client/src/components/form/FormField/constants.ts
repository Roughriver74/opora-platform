export const FIELD_CONSTANTS = {
	DEBOUNCE_DELAY: 100, // Еще быстрее для текстовых полей - как у автокомплита
	MIN_SEARCH_LENGTH: 1, // Возвращаем к 1 для удобства
	DEFAULT_TEXTAREA_ROWS: 4,
	COMPACT_TEXTAREA_ROWS: 3,
	FORM_FIELD_MARGIN: '15px',
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
} as const
