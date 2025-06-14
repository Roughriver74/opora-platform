export const AUTOSAVE_DELAY = 3000; // 3 секунды

export const DEFAULT_FORM_DATA = {
  name: '',
  title: '',
  description: '',
  isActive: true,
  fields: [],
  successMessage: 'Спасибо! Ваша заявка успешно отправлена.',
};

export const DEFAULT_FIELD_DATA = {
  type: 'text' as const,
  required: false,
  bitrixFieldId: '',
  bitrixFieldType: '',
};

export const NOTIFICATION_DURATION = {
  SUCCESS: 3000,
  AUTO_SAVE: 2000,
} as const;

// Константы для порядка полей
export const FIELD_ORDER = {
  SECTION_STEP: 100, // Интервал между разделами (100, 200, 300)
  MAX_FIELDS_PER_SECTION: 99, // Максимум полей в одном разделе
} as const;

/**
 * Вычисляет следующий порядок для раздела (header/divider)
 */
export const getNextSectionOrder = (existingFields: any[]): number => {
  const existingHeaders = existingFields.filter(field => 
    field.type === 'header' || field.type === 'divider'
  );
  
  return (existingHeaders.length + 1) * FIELD_ORDER.SECTION_STEP;
};

/**
 * Вычисляет следующий порядок для обычного поля в разделе
 */
export const getNextFieldOrderInSection = (existingFields: any[], sectionOrder: number): number => {
  const baseSectionOrder = Math.floor(sectionOrder / FIELD_ORDER.SECTION_STEP) * FIELD_ORDER.SECTION_STEP;
  const fieldsInSection = existingFields.filter(field => {
    if (field.type === 'header' || field.type === 'divider') return false;
    const fieldSectionNumber = Math.floor((field.order || 0) / FIELD_ORDER.SECTION_STEP);
    const targetSectionNumber = Math.floor(sectionOrder / FIELD_ORDER.SECTION_STEP);
    return fieldSectionNumber === targetSectionNumber;
  });
  
  if (fieldsInSection.length === 0) {
    return baseSectionOrder + 1;
  }
  
  const maxOrder = Math.max(...fieldsInSection.map(f => f.order || 0));
  const nextOrder = maxOrder + 1;
  
  // Проверяем, что не выходим за границы раздела
  if (Math.floor(nextOrder / FIELD_ORDER.SECTION_STEP) > Math.floor(sectionOrder / FIELD_ORDER.SECTION_STEP)) {
    return baseSectionOrder + FIELD_ORDER.MAX_FIELDS_PER_SECTION; // Максимальное значение в разделе
  }
  
  return nextOrder;
}; 