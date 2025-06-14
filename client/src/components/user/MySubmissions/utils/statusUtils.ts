import { BitrixStage } from '../types';

/**
 * Извлекает чистый статус без префикса категории
 */
export const getCleanStatus = (status: string): string => {
  if (status.includes(':')) {
    return status.split(':')[1];
  }
  return status;
};

/**
 * Получает название статуса из Битрикс24
 */
export const getStatusName = (status: string, bitrixStages: BitrixStage[]): string => {
  const cleanStatus = getCleanStatus(status);
  const stage = bitrixStages.find(stage => stage.id === cleanStatus);
  return stage?.name || status;
};

/**
 * Получает название поля по его имени
 */
export const getFieldLabel = (fieldName: string, formFields: any[]): string => {
  const field = formFields.find(f => f.name === fieldName);
  return field ? field.label : fieldName;
};

/**
 * Определяет цвет чипа статуса синхронизации с Битрикс24
 */
export const getSyncStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
  switch (status) {
    case 'synced':
      return 'success';
    case 'failed':
      return 'error';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
};

/**
 * Получает текст для статуса синхронизации
 */
export const getSyncStatusText = (status: string): string => {
  switch (status) {
    case 'synced':
      return 'Синхр.';
    case 'failed':
      return 'Ошибка';
    case 'pending':
      return 'Ожидает';
    default:
      return 'Не создано';
  }
}; 