import { FormField } from '../../../../types';
import { FieldGroup, GroupingRules } from '../types';

/**
 * Создает группы полей на основе разделителей
 */
export const createGroupsByDividers = (
  fields: FormField[],
  defaultCollapsed: boolean = false
): FieldGroup[] => {
  const groups: FieldGroup[] = [];
  let currentGroup: FormField[] = [];
  let currentGroupName = 'Основные поля';
  let groupIndex = 0;

  for (const field of fields) {
    if (field.type === 'divider') {
      // Сохраняем предыдущую группу, если есть поля
      if (currentGroup.length > 0) {
        groups.push({
          id: `divider-group-${groupIndex}`,
          title: currentGroupName,
          description: `Группа полей разделенная "${currentGroupName}"`,
          fields: [...currentGroup],
          isCollapsible: true,
          isCollapsed: defaultCollapsed,
          order: groupIndex,
          color: getGroupColor(currentGroupName)
        });
        groupIndex++;
      }

      // Начинаем новую группу
      currentGroup = [];
      currentGroupName = field.label || `Группа ${groupIndex + 1}`;
    } else {
      currentGroup.push(field);
    }
  }

  // Добавляем последнюю группу
  if (currentGroup.length > 0) {
    groups.push({
      id: `divider-group-${groupIndex}`,
      title: currentGroupName,
      description: `Группа полей: ${currentGroupName}`,
      fields: currentGroup,
      isCollapsible: true,
      isCollapsed: defaultCollapsed,
      order: groupIndex,
      color: getGroupColor(currentGroupName)
    });
  }

  return groups;
};

/**
 * Создает группы полей по типам
 */
export const createGroupsByFieldType = (
  fields: FormField[],
  defaultCollapsed: boolean = false
): FieldGroup[] => {
  const typeGroups: { [type: string]: FormField[] } = {};
  
  // Группируем поля по типам
  fields
    .filter(field => field.type !== 'divider')
    .forEach(field => {
      if (!typeGroups[field.type]) {
        typeGroups[field.type] = [];
      }
      typeGroups[field.type].push(field);
    });

  const groups: FieldGroup[] = [];
  let groupIndex = 0;

  Object.entries(typeGroups).forEach(([type, typeFields]) => {
    if (typeFields.length > 1) { // Группируем только если больше одного поля
      groups.push({
        id: `type-group-${type}`,
        title: getTypeGroupName(type),
        description: `Поля типа "${type}"`,
        fields: typeFields,
        isCollapsible: true,
        isCollapsed: defaultCollapsed,
        order: groupIndex,
        color: getTypeColor(type)
      });
      groupIndex++;
    }
  });

  return groups;
};

/**
 * Создает группы полей по пользовательским правилам
 */
export const createGroupsByCustomRules = (
  fields: FormField[],
  rules: GroupingRules,
  defaultCollapsed: boolean = false
): FieldGroup[] => {
  const groups: FieldGroup[] = [];
  const processedFields: Set<string> = new Set();

  rules.customRules.forEach((rule, index) => {
    const matchingFields = fields.filter(field => 
      !processedFields.has(field.name) && rule.condition(field)
    );

    if (matchingFields.length > 0) {
      groups.push({
        id: `custom-group-${index}`,
        title: rule.groupName,
        description: `Пользовательская группа: ${rule.groupName}`,
        fields: matchingFields,
        isCollapsible: true,
        isCollapsed: defaultCollapsed,
        order: index,
        icon: rule.groupIcon
      });

      // Отмечаем поля как обработанные
      matchingFields.forEach(field => processedFields.add(field.name));
    }
  });

  return groups;
};

/**
 * Объединяет и сортирует группы полей
 */
export const mergeAndSortGroups = (
  ...groupArrays: FieldGroup[][]
): FieldGroup[] => {
  const allGroups = groupArrays.flat();
  return allGroups.sort((a, b) => a.order - b.order);
};

/**
 * Находит негруппированные поля
 */
export const getUngroupedFields = (
  allFields: FormField[],
  groupedFields: FormField[]
): FormField[] => {
  const groupedFieldNames = new Set(groupedFields.map(field => field.name));
  return allFields.filter(field => 
    !groupedFieldNames.has(field.name) && field.type !== 'divider'
  );
};

/**
 * Получает цвет для группы по названию
 */
const getGroupColor = (groupName: string): string => {
  const colors = [
    '#2196f3', // blue
    '#4caf50', // green  
    '#ff9800', // orange
    '#9c27b0', // purple
    '#f44336', // red
    '#00bcd4', // cyan
    '#795548', // brown
    '#607d8b'  // blue-grey
  ];

  const hash = groupName.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  return colors[Math.abs(hash) % colors.length];
};

/**
 * Получает цвет для типа поля
 */
const getTypeColor = (type: string): string => {
  const typeColors: { [key: string]: string } = {
    text: '#2196f3',
    number: '#4caf50',
    email: '#ff9800',
    phone: '#9c27b0',
    select: '#f44336',
    checkbox: '#00bcd4',
    date: '#795548',
    textarea: '#607d8b'
  };

  return typeColors[type] || '#9e9e9e';
};

/**
 * Получает название группы для типа поля
 */
const getTypeGroupName = (type: string): string => {
  const typeNames: { [key: string]: string } = {
    text: 'Текстовые поля',
    number: 'Числовые поля',
    email: 'Email поля',
    phone: 'Телефонные поля',
    select: 'Поля выбора',
    checkbox: 'Флажки',
    date: 'Поля даты',
    textarea: 'Многострочные поля'
  };

  return typeNames[type] || `Поля типа ${type}`;
}; 