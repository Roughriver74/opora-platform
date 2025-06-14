import { useEffect } from 'react';
import { Form, FormField } from '../../../../types';
import { FormService } from '../../../../services/formService';
import { FormFieldService } from '../../../../services/formFieldService';
import { FormEditorState } from '../types';

export const useFormData = (
  form: Form | undefined,
  setState: React.Dispatch<React.SetStateAction<FormEditorState>>
) => {
  // Загрузка данных из Битрикс24
  useEffect(() => {
    const loadBitrixData = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        const [fieldsResponse, categoriesResponse] = await Promise.all([
          FormFieldService.getBitrixFields(),
          FormService.getDealCategories()
        ]);

        setState(prev => ({
          ...prev,
          bitrixFields: fieldsResponse?.result || {},
          dealCategories: categoriesResponse?.result || [],
          loading: false
        }));
      } catch (err: any) {
        setState(prev => ({
          ...prev,
          error: 'Ошибка при загрузке данных из Битрикс24: ' + err.message,
          loading: false
        }));
      }
    };

    loadBitrixData();
  }, [setState]);

  // Загрузка полей формы
  useEffect(() => {
    if (form && form._id && form.fields) {
      if (typeof form.fields[0] === 'string') {
        const loadFields = async () => {
          setState(prev => ({ ...prev, loading: true }));
          
          try {
            const allFields = await FormFieldService.getAllFields();
            const formFields = allFields.filter((field: FormField) => 
              (form.fields as string[]).includes(field._id!)
            );
            setState(prev => ({ ...prev, fields: formFields, loading: false }));
          } catch (err: any) {
            setState(prev => ({
              ...prev,
              error: 'Ошибка при загрузке полей формы: ' + err.message,
              loading: false
            }));
          }
        };
        loadFields();
      } else {
        setState(prev => ({ ...prev, fields: form.fields as FormField[] }));
      }
    }
  }, [form, setState]);
}; 