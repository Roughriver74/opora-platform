import { FieldType } from '../../../../types';

/**
 * Конвертирует значение из одного типа поля в другой
 */
export const convertFieldValue = (
  value: any,
  sourceType: FieldType,
  targetType: FieldType
): any => {
  // Если значение пустое, возвращаем его как есть
  if (value === null || value === undefined || value === '') {
    return value;
  }

  // Если типы одинаковые, возвращаем значение как есть
  if (sourceType === targetType) {
    return value;
  }

  try {
    return convertValue(value, sourceType, targetType);
  } catch (error) {
    console.warn(`Ошибка конвертации значения ${value} из ${sourceType} в ${targetType}:`, error);
    return value; // Возвращаем исходное значение в случае ошибки
  }
};

/**
 * Основная логика конвертации значений
 */
const convertValue = (value: any, sourceType: FieldType, targetType: FieldType): any => {
  // Конвертация в текстовые поля
  if (targetType === 'text' || targetType === 'textarea') {
    return convertToText(value, sourceType);
  }

  // Конвертация в числовые поля
  if (targetType === 'number') {
    return convertToNumber(value, sourceType);
  }

  // Конвертация в поля выбора
  if (targetType === 'select' || targetType === 'autocomplete' || targetType === 'radio') {
    return convertToSelection(value, sourceType);
  }

  // Конвертация в дату
  if (targetType === 'date') {
    return convertToDate(value, sourceType);
  }

  // Конвертация в checkbox
  if (targetType === 'checkbox') {
    return convertToBoolean(value, sourceType);
  }

  return value;
};

/**
 * Конвертация в текстовый формат
 */
const convertToText = (value: any, sourceType: FieldType): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'Да' : 'Нет';
  }

  if (sourceType === 'date') {
    return formatDate(value);
  }

  return String(value);
};

/**
 * Конвертация в числовой формат
 */
const convertToNumber = (value: any, sourceType: FieldType): number | string => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    // Извлекаем числа из строки
    const match = value.match(/[\d.,]+/);
    if (match) {
      const numStr = match[0].replace(',', '.');
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        return num;
      }
    }
  }

  return value; // Возвращаем как есть, если не удалось конвертировать
};

/**
 * Конвертация в поля выбора
 */
const convertToSelection = (value: any, sourceType: FieldType): string => {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  if (typeof value === 'boolean') {
    return value ? 'yes' : 'no';
  }

  return String(value);
};

/**
 * Конвертация в дату
 */
const convertToDate = (value: any, sourceType: FieldType): string => {
  if (typeof value === 'string') {
    // Пытаемся распарсить различные форматы даты
    const date = parseDate(value);
    if (date) {
      return formatDateForInput(date);
    }
  }

  if (value instanceof Date) {
    return formatDateForInput(value);
  }

  return value;
};

/**
 * Конвертация в boolean
 */
const convertToBoolean = (value: any, sourceType: FieldType): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    return ['да', 'yes', 'true', '1', 'включено', 'активно'].includes(lowerValue);
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return Boolean(value);
};

/**
 * Форматирует дату для отображения
 */
const formatDate = (value: any): string => {
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleDateString('ru-RU');
  } catch {
    return String(value);
  }
};

/**
 * Форматирует дату для input[type="date"]
 */
const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Парсит дату из строки
 */
const parseDate = (dateStr: string): Date | null => {
  // Попытка парсинга различных форматов
  const patterns = [
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/,  // dd.mm.yyyy
    /(\d{4})-(\d{1,2})-(\d{1,2})/,   // yyyy-mm-dd
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/  // dd/mm/yyyy
  ];

  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      let day, month, year;
      
      if (pattern.source.includes('\\.')) {
        // dd.mm.yyyy format
        [, day, month, year] = match;
      } else if (pattern.source.includes('-')) {
        // yyyy-mm-dd format
        [, year, month, day] = match;
      } else {
        // dd/mm/yyyy format
        [, day, month, year] = match;
      }

      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // Попытка стандартного парсинга
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Проверяет, можно ли конвертировать значение из одного типа в другой
 */
export const canConvertValue = (
  value: any,
  sourceType: FieldType,
  targetType: FieldType
): boolean => {
  if (value === null || value === undefined || value === '') {
    return true;
  }

  if (sourceType === targetType) {
    return true;
  }

  try {
    const converted = convertValue(value, sourceType, targetType);
    return converted !== undefined;
  } catch {
    return false;
  }
}; 