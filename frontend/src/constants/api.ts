// API константы
export const BITRIX_API_ENDPOINT = 'https://crmwest.ru/rest/156/fnonb6nklg81kzy1';

// Функции для работы с API
export const getBitrixApiUrl = (method: string) => `${BITRIX_API_ENDPOINT}/${method}`;
