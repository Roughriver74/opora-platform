import { useState, useMemo, useCallback } from 'react';
import { FormField } from '../../../../../types';
import { FieldGroup, GroupConfig, GroupState, GroupingRules } from '../../types';

interface UseGroupManagerProps {
  fields: FormField[];
  config?: Partial<GroupConfig>;
  onGroupToggle?: (groupId: string, isCollapsed: boolean) => void;
}

const DEFAULT_CONFIG: GroupConfig = {
  enableGrouping: true,
  defaultCollapsed: false,
  allowNesting: false,
  maxNestingLevel: 1
};

const DEFAULT_GROUPING_RULES: GroupingRules = {
  groupByType: false,
  groupByDividers: true,
  customRules: []
};

export const useGroupManager = ({
  fields,
  config = {},
  onGroupToggle
}: UseGroupManagerProps) => {
  const groupConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  const [groupState, setGroupState] = useState<GroupState>({});
  
  // Группировка полей
  const { fieldGroups, ungroupedFields } = useMemo(() => {
    if (!groupConfig.enableGrouping) {
      return { fieldGroups: [], ungroupedFields: fields };
    }

    const groups: FieldGroup[] = [];
    const ungrouped: FormField[] = [];
    
    // Группировка по разделителям
    if (DEFAULT_GROUPING_RULES.groupByDividers) {
      let currentGroup: FormField[] = [];
      let currentGroupName = 'Основные поля';
      let groupIndex = 0;

      // Собираем поля до первого разделителя
      let i = 0;
      while (i < fields.length && fields[i].type !== 'divider') {
        currentGroup.push(fields[i]);
        i++;
      }

      // Если есть поля до первого разделителя, создаем группу
      if (currentGroup.length > 0) {
        groups.push({
          id: `group-${groupIndex}`,
          title: currentGroupName,
          description: `Начальные поля формы`,
          fields: currentGroup,
          isCollapsible: true,
          isCollapsed: groupState[`group-${groupIndex}`]?.isCollapsed ?? groupConfig.defaultCollapsed,
          order: groupIndex
        });
        groupIndex++;
      }

      // Обрабатываем разделители и следующие за ними поля
      for (let index = i; index < fields.length; index++) {
        const field = fields[index];
        
        if (field.type === 'divider') {
          currentGroup = [];
          currentGroupName = field.label || `Раздел ${groupIndex + 1}`;
          
          // Собираем все поля после разделителя до следующего разделителя
          let j = index + 1;
          while (j < fields.length && fields[j].type !== 'divider') {
            currentGroup.push(fields[j]);
            j++;
          }
          
          // Создаем группу (даже если она пустая, разделитель должен создать секцию)
          groups.push({
            id: `group-${groupIndex}`,
            title: currentGroupName,
            description: `Сворачиваемая секция: ${currentGroupName}`,
            fields: currentGroup,
            isCollapsible: true,
            isCollapsed: groupState[`group-${groupIndex}`]?.isCollapsed ?? groupConfig.defaultCollapsed,
            order: groupIndex
          });
          groupIndex++;
          
          // Перемещаем индекс к последнему обработанному полю
          index = j - 1;
        }
      }
    } else {
      // Если группировка по разделителям отключена, все поля остаются негруппированными
      ungrouped.push(...fields.filter(field => field.type !== 'divider'));
    }

    return {
      fieldGroups: groups.sort((a, b) => a.order - b.order),
      ungroupedFields: ungrouped
    };
  }, [fields, groupConfig, groupState]);

  // Переключение состояния группы
  const toggleGroup = useCallback((groupId: string, isCollapsed: boolean) => {
    setGroupState(prev => ({
      ...prev,
      [groupId]: {
        isCollapsed,
        lastModified: Date.now()
      }
    }));

    if (onGroupToggle) {
      onGroupToggle(groupId, isCollapsed);
    }
  }, [onGroupToggle]);

  // Сброс всех групп
  const resetGroups = useCallback(() => {
    setGroupState({});
  }, []);

  // Автоматическое создание групп для больших форм
  const autoCreateGroups = useCallback(() => {
    const FIELDS_PER_GROUP = 5;
    const groups: FieldGroup[] = [];
    
    for (let i = 0; i < ungroupedFields.length; i += FIELDS_PER_GROUP) {
      const groupFields = ungroupedFields.slice(i, i + FIELDS_PER_GROUP);
      groups.push({
        id: `auto-group-${i / FIELDS_PER_GROUP}`,
        title: `Группа ${Math.floor(i / FIELDS_PER_GROUP) + 1}`,
        description: `Автоматически созданная группа полей`,
        fields: groupFields,
        isCollapsible: true,
        isCollapsed: groupConfig.defaultCollapsed,
        order: Math.floor(i / FIELDS_PER_GROUP)
      });
    }

    return groups;
  }, [ungroupedFields, groupConfig.defaultCollapsed]);

  return {
    fieldGroups,
    ungroupedFields,
    groupConfig,
    groupState,
    toggleGroup,
    resetGroups,
    autoCreateGroups
  };
}; 