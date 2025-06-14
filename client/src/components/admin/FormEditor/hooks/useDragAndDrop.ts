import { useCallback } from 'react';
import { FormField } from '../../../../types';
import { FormFieldService } from '../../../../services/formFieldService';
import { DragHandlers, FormEditorState } from '../types';

export const useDragAndDrop = (
  state: FormEditorState,
  setState: React.Dispatch<React.SetStateAction<FormEditorState>>
): DragHandlers => {
  
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, field: FormField, index: number) => {
    setState(prev => ({ ...prev, draggedField: field }));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    
    // Визуальная обратная связь
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.6';
      e.currentTarget.style.transform = 'scale(0.98)';
    }
  }, [setState]);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setState(prev => ({ ...prev, dragOverIndex: index }));
  }, [setState]);

  const handleDragLeave = useCallback(() => {
    setState(prev => ({ ...prev, dragOverIndex: null }));
  }, [setState]);
  
  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = Number(e.dataTransfer.getData('text/plain'));
    
    if (sourceIndex === targetIndex) {
      setState(prev => ({ ...prev, dragOverIndex: null }));
      return;
    }
    
    // Работаем с отсортированным массивом
    const sortedFields = [...state.fields].sort((a, b) => (a.order || 0) - (b.order || 0));
    const reorderedFields = [...sortedFields];
    const [removed] = reorderedFields.splice(sourceIndex, 1);
    reorderedFields.splice(targetIndex, 0, removed);
    
    // Обновляем порядок полей
    const updatedFields = reorderedFields.map((field, index) => ({
      ...field,
      order: index + 1
    }));
    
    // Обновляем оригинальный массив полей с новым порядком
    const newFieldsArray = state.fields.map(originalField => {
      const updatedField = updatedFields.find(f => {
        if (f._id && originalField._id) {
          return f._id === originalField._id;
        }
        return f.name === originalField.name && f.label === originalField.label;
      });
      return updatedField || originalField;
    });
    
    setState(prev => ({
      ...prev,
      fields: newFieldsArray,
      draggedField: null,
      dragOverIndex: null,
      hasChanges: true
    }));
    
    // Автоматическое сохранение порядка только для существующих полей
    try {
      const savePromises = updatedFields
        .filter(field => field._id)
        .map(field => FormFieldService.updateField(field._id as string, { 
          ...field,
          order: field.order 
        }));
      
      if (savePromises.length > 0) {
        await Promise.all(savePromises);
        console.log('Порядок полей успешно сохранен');
      }
    } catch (err: any) {
      console.error('Ошибка при сохранении порядка полей:', err);
      
      // Специальная обработка ошибок авторизации
      if (err.isAuthError || (err.response && err.response.status === 401)) {
        setState(prev => ({ 
          ...prev, 
          error: 'Ошибка авторизации. Пожалуйста, войдите в систему заново.'
        }));
        return; // Не продолжаем обработку
      }
      
      setState(prev => ({ 
        ...prev, 
        error: 'Ошибка при сохранении порядка полей: ' + (err.message || 'Неизвестная ошибка')
      }));
    }
  }, [state.fields, setState]);
  
  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1';
      e.currentTarget.style.transform = 'scale(1)';
    }
    setState(prev => ({
      ...prev,
      draggedField: null,
      dragOverIndex: null
    }));
  }, [setState]);

  return {
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  };
}; 