import { useState, useEffect, useCallback } from 'react';
import { Form } from '../../../../types';
import { FormService } from '../../../../services/formService';
import { FormEditorState } from '../types';
import { AUTOSAVE_DELAY, NOTIFICATION_DURATION } from '../constants';

export const useAutoSave = (
  state: FormEditorState,
  setState: React.Dispatch<React.SetStateAction<FormEditorState>>
) => {
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Автосохранение
  const autoSave = useCallback(async () => {
    if (state.hasChanges && !state.saving && !state.autoSaving) {
      setState(prev => ({ ...prev, autoSaving: true }));
      
      try {
        const fieldIds = state.fields.map(field => field._id).filter(id => id);
        const formToSave: Partial<Form> = { ...state.formData, fields: fieldIds as string[] };

        let savedForm: Form;
        if (state.formData._id) {
          savedForm = await FormService.updateForm(state.formData._id, formToSave);
        } else {
          savedForm = await FormService.createForm(formToSave as Omit<Form, '_id'>);
          setState(prev => ({ 
            ...prev, 
            formData: { ...prev.formData, _id: savedForm._id }
          }));
        }

        setState(prev => ({
          ...prev,
          hasChanges: false,
          lastSaved: new Date(),
          showSuccess: true,
          autoSaving: false
        }));
        
        setTimeout(() => {
          setState(prev => ({ ...prev, showSuccess: false }));
        }, NOTIFICATION_DURATION.AUTO_SAVE);
      } catch (err: any) {
        setState(prev => ({
          ...prev,
          error: 'Ошибка автосохранения: ' + err.message,
          autoSaving: false
        }));
      }
    }
  }, [state.hasChanges, state.saving, state.autoSaving, state.formData, state.fields, setState]);

  // Эффект автосохранения
  useEffect(() => {
    if (state.hasChanges) {
      if (saveTimeout) clearTimeout(saveTimeout);
      const timeout = setTimeout(autoSave, AUTOSAVE_DELAY);
      setSaveTimeout(timeout);
    }
    return () => {
      if (saveTimeout) clearTimeout(saveTimeout);
    };
  }, [state.hasChanges, autoSave, saveTimeout]);

  return { autoSave };
}; 