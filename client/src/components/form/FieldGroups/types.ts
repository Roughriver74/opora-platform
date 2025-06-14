import { FormField } from '../../../types';

export interface FieldGroup {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  isCollapsible: boolean;
  isCollapsed: boolean;
  icon?: string;
  color?: string;
  order: number;
}

export interface GroupDivider {
  id: string;
  title: string;
  type: 'divider';
  order: number;
}

export interface GroupConfig {
  enableGrouping: boolean;
  defaultCollapsed: boolean;
  allowNesting: boolean;
  maxNestingLevel: number;
}

export interface GroupState {
  [groupId: string]: {
    isCollapsed: boolean;
    lastModified: number;
  };
}

export interface GroupingRules {
  // Автоматическая группировка по типам полей
  groupByType: boolean;
  // Группировка по разделителям
  groupByDividers: boolean;
  // Пользовательские правила группировки
  customRules: Array<{
    condition: (field: FormField) => boolean;
    groupName: string;
    groupIcon?: string;
  }>;
} 