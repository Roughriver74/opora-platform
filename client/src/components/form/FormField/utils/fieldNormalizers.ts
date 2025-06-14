import { FormFieldOption } from '../../../../types';

export const normalizeOptions = (options: any[]): FormFieldOption[] => {
  if (!Array.isArray(options)) {
    return [];
  }
  
  return options.map(option => {
    if (typeof option === 'string') {
      return { value: option, label: option };
    }
    
    if (typeof option === 'object' && option !== null) {
      return {
        value: option.value || option.id || option.ID || '',
        label: option.label || option.title || option.TITLE || option.name || option.NAME || option.value || '',
        metadata: option.metadata || {}
      };
    }
    
    return { value: '', label: '' };
  });
};

export const normalizeValue = (value: any, fieldType: string): any => {
  switch (fieldType) {
    case 'number':
      return value === '' || value === null || value === undefined ? '' : Number(value);
    case 'checkbox':
      return Boolean(value);
    case 'date':
      if (value instanceof Date) {
        return value.toISOString().split('T')[0];
      }
      return value || '';
    default:
      return value || '';
  }
};

export const formatProductLabel = (product: any): string => {
  const name = product.NAME || '';
  const price = product.PRICE;
  const currency = product.CURRENCY_ID;
  
  if (price) {
    return `${name} (${price}${currency ? ' ' + currency : ''})`;
  }
  
  return name;
};

export const formatContactLabel = (contact: any): string => {
  const firstName = contact.NAME || '';
  const lastName = contact.LAST_NAME || '';
  return `${firstName} ${lastName}`.trim();
};
