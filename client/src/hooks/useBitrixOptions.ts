import { useState, useEffect, useCallback } from 'react';
import { FormFieldOption } from '../types';

export interface BitrixDataSource {
  type: 'products' | 'companies' | 'contacts' | 'fields';
  fieldCode?: string; // Для полей с enumeration
}

export interface UseBitrixOptionsResult {
  options: FormFieldOption[];
  loading: boolean;
  error: string | null;
  loadOptions: (source: BitrixDataSource) => Promise<void>;
  clearOptions: () => void;
}

const useBitrixOptions = (): UseBitrixOptionsResult => {
  const [options, setOptions] = useState<FormFieldOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOptions = useCallback(async (source: BitrixDataSource) => {
    setLoading(true);
    setError(null);

    try {
      let response;
      
      switch (source.type) {
        case 'products':
          response = await fetch('/api/form-fields/bitrix/products');
          break;
        case 'companies':
          response = await fetch('/api/form-fields/bitrix/companies');
          break;
        case 'contacts':
          response = await fetch('/api/form-fields/bitrix/contacts');
          break;
        case 'fields':
          if (!source.fieldCode) {
            throw new Error('Не указан код поля для загрузки значений');
          }
          response = await fetch('/api/form-fields/bitrix/fields');
          break;
        default:
          throw new Error('Неизвестный тип источника данных');
      }

      if (!response.ok) {
        throw new Error(`Ошибка загрузки данных: ${response.statusText}`);
      }

      const data = await response.json();
      const formattedOptions = formatBitrixData(data, source);
      setOptions(formattedOptions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      console.error('Ошибка загрузки опций из Битрикс24:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearOptions = useCallback(() => {
    setOptions([]);
    setError(null);
  }, []);

  return {
    options,
    loading,
    error,
    loadOptions,
    clearOptions,
  };
};

// Утилита для форматирования данных из Битрикс24 в опции формы
const formatBitrixData = (data: any, source: BitrixDataSource): FormFieldOption[] => {
  if (!data || !data.result) {
    return [];
  }

  switch (source.type) {
    case 'products':
      return data.result.map((product: any) => ({
        value: product.ID,
        label: product.NAME,
      }));

    case 'companies':
      return data.result.map((company: any) => ({
        value: company.ID,
        label: company.TITLE,
      }));

    case 'contacts':
      return data.result.map((contact: any) => ({
        value: contact.ID,
        label: `${contact.LAST_NAME} ${contact.NAME}`.trim(),
      }));

    case 'fields':
      if (source.fieldCode && data.result[source.fieldCode]?.items) {
        return Object.entries(data.result[source.fieldCode].items).map(([key, item]: [string, any]) => ({
          value: key,
          label: item.VALUE || item.NAME || key,
        }));
      }
      return [];

    default:
      return [];
  }
};

export default useBitrixOptions;
