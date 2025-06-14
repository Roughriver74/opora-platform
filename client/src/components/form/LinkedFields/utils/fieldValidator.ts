import { FormField } from '../../../../types';
import { FieldMapping, CopyOperation } from '../types';
import { areFieldTypesCompatible } from './fieldMapper';
import { canConvertValue } from './valueConverter';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FieldValidationResult {
  fieldName: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Валидирует операцию копирования полей
 */
export const validateCopyOperation = (
  operation: CopyOperation,
  sourceFields: FormField[],
  targetFields: FormField[],
  currentValues: Record<string, any>
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Проверяем каждый маппинг
  operation.mappings.forEach(mapping => {
    const sourceField = sourceFields.find(f => f.name === mapping.sourceField);
    const targetField = targetFields.find(f => f.name === mapping.targetField);

    if (!sourceField) {
      errors.push(`Поле "${mapping.sourceField}" не найдено в исходной секции`);
      return;
    }

    if (!targetField) {
      errors.push(`Поле "${mapping.targetField}" не найдено в целевой секции`);
      return;
    }

    // Проверяем совместимость типов
    if (!areFieldTypesCompatible(sourceField.type, targetField.type)) {
      errors.push(
        `Несовместимые типы полей: "${sourceField.label}" (${sourceField.type}) -> "${targetField.label}" (${targetField.type})`
      );
    }

    // Проверяем значение
    const sourceValue = operation.values[mapping.sourceField];
    if (sourceValue !== undefined && sourceValue !== null && sourceValue !== '') {
      if (!canConvertValue(sourceValue, sourceField.type, targetField.type)) {
        warnings.push(
          `Значение "${sourceValue}" может быть некорректно преобразовано из "${sourceField.label}" в "${targetField.label}"`
        );
      }
    }

    // Проверяем обязательные поля
    if (targetField.required && (sourceValue === undefined || sourceValue === null || sourceValue === '')) {
      warnings.push(
        `Поле "${targetField.label}" является обязательным, но значение для копирования отсутствует`
      );
    }

    // Проверяем перезапись существующих значений
    const currentValue = currentValues[mapping.targetField];
    if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
      warnings.push(
        `Поле "${targetField.label}" уже содержит значение "${currentValue}", которое будет перезаписано`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Валидирует отдельное поле для копирования
 */
export const validateFieldCopy = (
  mapping: FieldMapping,
  sourceField: FormField,
  targetField: FormField,
  sourceValue: any,
  currentTargetValue: any
): FieldValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Проверяем совместимость типов
  if (!areFieldTypesCompatible(sourceField.type, targetField.type)) {
    errors.push(`Несовместимые типы полей: ${sourceField.type} -> ${targetField.type}`);
  }

  // Проверяем конвертацию значения
  if (sourceValue !== undefined && sourceValue !== null && sourceValue !== '') {
    if (!canConvertValue(sourceValue, sourceField.type, targetField.type)) {
      warnings.push('Значение может быть некорректно преобразовано');
    }
  }

  // Проверяем обязательные поля
  if (targetField.required && (sourceValue === undefined || sourceValue === null || sourceValue === '')) {
    warnings.push('Целевое поле обязательно, но значение отсутствует');
  }

  // Проверяем перезапись
  if (currentTargetValue !== undefined && currentTargetValue !== null && currentTargetValue !== '') {
    warnings.push('Существующее значение будет перезаписано');
  }

  return {
    fieldName: mapping.targetField,
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Проверяет, можно ли выполнить копирование между секциями
 */
export const canCopyBetweenSections = (
  sourceFields: FormField[],
  targetFields: FormField[]
): boolean => {
  // Должны быть поля в обеих секциях
  if (sourceFields.length === 0 || targetFields.length === 0) {
    return false;
  }

  // Должно быть хотя бы одно совместимое поле
  const hasCompatibleFields = sourceFields.some(sourceField =>
    targetFields.some(targetField =>
      areFieldTypesCompatible(sourceField.type, targetField.type)
    )
  );

  return hasCompatibleFields;
};

/**
 * Получает рекомендации по улучшению маппинга
 */
export const getFieldMappingRecommendations = (
  sourceFields: FormField[],
  targetFields: FormField[]
): string[] => {
  const recommendations: string[] = [];

  // Проверяем поля, которые не имеют маппинга
  const unmappedSourceFields = sourceFields.filter(sourceField =>
    !targetFields.some(targetField =>
      areFieldTypesCompatible(sourceField.type, targetField.type)
    )
  );

  if (unmappedSourceFields.length > 0) {
    recommendations.push(
      `Следующие поля не могут быть скопированы из-за несовместимых типов: ${unmappedSourceFields.map(f => f.label).join(', ')}`
    );
  }

  // Проверяем обязательные поля без источника
  const requiredFieldsWithoutSource = targetFields.filter(targetField =>
    targetField.required &&
    !sourceFields.some(sourceField =>
      areFieldTypesCompatible(sourceField.type, targetField.type)
    )
  );

  if (requiredFieldsWithoutSource.length > 0) {
    recommendations.push(
      `Обязательные поля без источника данных: ${requiredFieldsWithoutSource.map(f => f.label).join(', ')}`
    );
  }

  return recommendations;
};

/**
 * Создает безопасный маппинг полей (исключая проблемные поля)
 */
export const createSafeFieldMapping = (
  sourceFields: FormField[],
  targetFields: FormField[],
  currentValues: Record<string, any>
): FieldMapping[] => {
  const safeMappings: FieldMapping[] = [];

  sourceFields.forEach(sourceField => {
    const compatibleTargetFields = targetFields.filter(targetField =>
      areFieldTypesCompatible(sourceField.type, targetField.type)
    );

    compatibleTargetFields.forEach(targetField => {
      const sourceValue = currentValues[sourceField.name];
      
      // Проверяем, безопасно ли копировать это поле
      if (canConvertValue(sourceValue, sourceField.type, targetField.type)) {
        safeMappings.push({
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

  return safeMappings;
}; 