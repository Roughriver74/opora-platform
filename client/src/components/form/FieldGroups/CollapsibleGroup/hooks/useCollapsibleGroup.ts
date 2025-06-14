import { useState, useCallback, useMemo, useEffect } from 'react';
import { FieldGroup } from '../../types';

interface UseCollapsibleGroupProps {
  group: FieldGroup;
  onToggle?: (groupId: string, isCollapsed: boolean) => void;
}

// Функции для получения иконок перенесены в компонент, где они используются

export const useCollapsibleGroup = ({ group, onToggle }: UseCollapsibleGroupProps) => {
  const [localCollapsed, setLocalCollapsed] = useState(group.isCollapsed);

  // Синхронизация с внешним состоянием
  useEffect(() => {
    setLocalCollapsed(group.isCollapsed);
  }, [group.isCollapsed]);

  const isCollapsed = useMemo(() => {
    return group.isCollapsible ? localCollapsed : false;
  }, [group.isCollapsible, localCollapsed]);

  const toggleCollapsed = useCallback(() => {
    if (!group.isCollapsible) return;

    const newCollapsed = !isCollapsed;
    setLocalCollapsed(newCollapsed);
    
    if (onToggle) {
      onToggle(group.id, newCollapsed);
    }
  }, [group.id, group.isCollapsible, isCollapsed, onToggle]);

  const getGroupIcon = useCallback(() => {
    // Если у группы есть своя иконка
    if (group.icon) {
      return group.icon;
    }

    // Возвращаем null, иконку будет определять компонент
    return null;
  }, [group.icon]);

  const getGroupStats = useCallback(() => {
    const fieldCount = group.fields.length;
    const fieldTypes = Array.from(new Set(group.fields.map(field => field.type)));
    const requiredFields = group.fields.filter(field => field.required).length;

    return {
      fieldCount,
      fieldTypes,
      requiredFields,
      hasRequiredFields: requiredFields > 0
    };
  }, [group.fields]);

  return {
    isCollapsed,
    toggleCollapsed,
    getGroupIcon,
    getGroupStats
  };
}; 