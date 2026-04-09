// API константы — Bitrix24 webhook настраивается через админ-панель
export const BITRIX_API_ENDPOINT = '';

// Функции для работы с API
export const getBitrixApiUrl = (method: string) => `${BITRIX_API_ENDPOINT}/${method}`;
