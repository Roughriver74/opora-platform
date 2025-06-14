import { FormField, FieldType } from '../../../../types';
import { FieldMapping, SectionMapping } from '../types';

/**
 * Проверяет совместимость типов полей для копирования
 */
export const areFieldTypesCompatible = (sourceType: FieldType, targetType: FieldType): boolean => {
  // Точное совпадение
  if (sourceType === targetType) {
    return true;
  }

  // Текстовые поля совместимы между собой
  const textFields: FieldType[] = ['text', 'textarea'];
  if (textFields.includes(sourceType) && textFields.includes(targetType)) {
    return true;
  }

  // Поля выбора совместимы между собой
  const selectionFields: FieldType[] = ['select', 'autocomplete', 'radio'];
  if (selectionFields.includes(sourceType) && selectionFields.includes(targetType)) {
    return true;
  }

  // Числовые поля могут копироваться в текстовые
  if (sourceType === 'number' && textFields.includes(targetType)) {
    return true;
  }

  return false;
};

/**
 * Создает маппинг полей между двумя секциями
 */
export const createFieldMapping = (
  sourceFields: FormField[],
  targetFields: FormField[],
  sourceSection: string,
  targetSection: string
): SectionMapping => {
  const mappings: FieldMapping[] = [];

  sourceFields.forEach(sourceField => {
    // Ищем поля с похожими именами или типами
    const compatibleTargetFields = targetFields.filter(targetField => 
      areFieldTypesCompatible(sourceField.type, targetField.type)
    );

    compatibleTargetFields.forEach(targetField => {
      // Предпочитаем поля с похожими именами
      const nameSimilarity = calculateNameSimilarity(sourceField.name, targetField.name);
      const labelSimilarity = calculateNameSimilarity(sourceField.label, targetField.label);
      
      if (nameSimilarity > 0.5 || labelSimilarity > 0.5) {
        mappings.push({
          sourceField: sourceField.name,
          targetField: targetField.name,
          sourceLabel: sourceField.label,
          targetLabel: targetField.label,
          fieldType: sourceField.type,
          compatible: true
        });
      }
    });
  });

  return {
    sourceSection,
    targetSection,
    mappings
  };
};

/**
 * Вычисляет схожесть между двумя строками (простой алгоритм)
 */
const calculateNameSimilarity = (str1: string, str2: string): number => {
  const normalize = (str: string) => str.toLowerCase().trim();
  const s1 = normalize(str1);
  const s2 = normalize(str2);

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Простая проверка на общие слова
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(word => words2.includes(word));
  
  if (commonWords.length > 0) {
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  return 0;
};

/**
 * Создает предустановленные маппинги для типичных полей
 */
export const getDefaultFieldMappings = (): Record<string, string[]> => {
  return {
    // Поля покупателя могут копироваться в поля завода
    'buyer_company': ['factory_company', 'supplier_company'],
    'buyer_contact': ['factory_contact', 'supplier_contact'],
    'buyer_phone': ['factory_phone', 'supplier_phone'],
    'buyer_email': ['factory_email', 'supplier_email'],
    'buyer_address': ['factory_address', 'supplier_address'],
    
    // Основная информация
    'product_type': ['factory_product_type'],
    'volume': ['factory_volume'],
    'delivery_date': ['factory_delivery_date'],
    
    // Контактная информация
    'contact_person': ['factory_contact_person', 'supplier_contact_person'],
    'manager': ['factory_manager', 'supplier_manager']
  };
};

/**
 * Получает список секций, которые могут быть источником для копирования
 */
export const getSourceSections = (): string[] => {
  return ['buyer', 'product', 'delivery'];
};

/**
 * Получает список секций, которые могут быть целью для копирования
 */
export const getTargetSections = (): string[] => {
  return ['factory', 'supplier', 'additional'];
}; 