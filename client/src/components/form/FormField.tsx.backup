import React, { useState, useEffect, useCallback } from 'react';
import { 
  TextField, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Select,
  Autocomplete,
  FormHelperText,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
  FormLabel
} from '@mui/material';
import { FormField as FormFieldType, FormFieldOption } from '../../types';
import { FormFieldService } from '../../services/formFieldService';

// Функция для дебаунсинга
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

interface FormFieldProps {
  field: FormFieldType;
  value: any;
  onChange: (name: string, value: any) => void;
  error?: string;
  compact?: boolean; // Параметр для компактного режима отображения
}

const FormField: React.FC<FormFieldProps> = ({ field, value, onChange, error, compact = false }) => {
  const [options, setOptions] = useState<FormFieldOption[]>(field.options || []);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Кэшируем выбранные опции, чтобы они не терялись при новом поиске
  const [selectedOption, setSelectedOption] = useState<FormFieldOption | null>(null);
  
  // Настройка стилей в зависимости от режима отображения
  // Упрощаем стили, чтобы избежать ошибок типизации
  const textFieldSx = compact ? {
    '& .MuiInputBase-root': {
      fontSize: '0.875rem'
    },
    '& .MuiFormHelperText-root': {
      margin: '2px 0 0',
      fontSize: '0.7rem'
    }
  } : undefined;
  
  // Используем дебаунсинг с задержкой 400мс
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // Загрузка опций для динамических полей (товары, компании, контакты)
  // Используем мемоизированную функцию загрузки, чтобы не создавать её при каждом рендере
  const loadDynamicOptions = useCallback(async (query: string) => {
    if (!field.dynamicSource?.enabled) {
      return;
    }
    
    // Не делаем запрос, если строка поиска пустая или слишком короткая
    if (query.trim().length < 1) { // Минимальная длина 1 символ для лучшего UX
      return;
    }
    
    setLoading(true);
    try {
      let response;
      let dataOptions = [];
      
      // В зависимости от источника данных выбираем соответствующий метод API
      switch (field.dynamicSource.source) {
        case 'catalog':
          response = await FormFieldService.getProducts(query);
          if (response?.result) {
            dataOptions = response.result.map((product: any) => ({
              value: product.ID,
              // Форматируем строку товара, пропуская null значения
              label: `${product.NAME}${product.PRICE ? ` (${product.PRICE}${product.CURRENCY_ID ? ' ' + product.CURRENCY_ID : ''})` : ''}`,
            }));
          }
          break;
          
        case 'companies':
          response = await FormFieldService.getCompanies(query);
          if (response?.result) {
            dataOptions = response.result.map((company: any) => ({
              value: company.ID,
              label: company.TITLE,
              // Добавляем дополнительные данные, которые могут быть полезны
              metadata: {
                phone: company.PHONE,
                email: company.EMAIL,
                type: company.COMPANY_TYPE
              }
            }));
          }
          break;
          
        case 'contacts':
          response = await FormFieldService.getContacts(query);
          if (response?.result) {
            dataOptions = response.result.map((contact: any) => ({
              value: contact.ID,
              // Форматируем имя и фамилию контакта
              label: `${contact.LAST_NAME || ''} ${contact.NAME || ''} ${contact.SECOND_NAME || ''}`
                .trim().replace(/\s+/g, ' '),
              // Добавляем дополнительные данные, которые могут быть полезны
              metadata: {
                phone: contact.PHONE,
                email: contact.EMAIL,
                companyId: contact.COMPANY_ID,
                position: contact.POST
              }
            }));
          }
          break;
          
        default:
          console.warn(`Неизвестный источник данных: ${field.dynamicSource.source}`);
          break;
      }
      
      // Сохраняем выбранную опцию в новом списке, если она есть
      if (selectedOption && !dataOptions.some((opt: { value: string; }) => opt.value === selectedOption.value)) {
        dataOptions.unshift(selectedOption);
      }
      
      setOptions(dataOptions);
    } catch (error) {
      console.error(`Ошибка при загрузке данных из ${field.dynamicSource.source}:`, error);
    } finally {
      setLoading(false);
    }
  }, [field.dynamicSource, selectedOption]);

  // Используем дебаунсированное значение поиска для запросов
  useEffect(() => {
    if (debouncedSearchQuery) {
      loadDynamicOptions(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, loadDynamicOptions]);
  
  // Если изменился тип поля или источник данных, также перезагружаем опции
  useEffect(() => {
    if (field.options && field.options.length > 0) {
      setOptions(field.options);
    } else if (field.dynamicSource?.enabled && searchQuery) {
      loadDynamicOptions(searchQuery);
    }
  }, [field.dynamicSource?.enabled, field.options, field.type]);

  // Рендеринг различных типов полей
  const renderFieldByType = () => {
    switch (field.type) {
      case 'divider':
        return (
          <div className="form-divider" style={{ 
            width: '100%', 
            height: '3px', 
            backgroundColor: '#BBDEFB', // Светло-синий цвет
            margin: '20px 0',
            borderRadius: '2px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }} />
        );
      
      case 'header':
        return (
          <div className="form-header" style={{
            width: '100%',
            margin: '25px 0 15px 0',
            fontWeight: 'bold',
            fontSize: '18px',
            color: '#1565C0', // Более темный синий цвет текста
            backgroundColor: '#E3F2FD', // Чуть более насыщенный голубой фон
            padding: '12px 16px',
            borderLeft: '5px solid #1976d2', // Более широкая синяя полоса слева
            borderRadius: '0 4px 4px 0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
          }}>
            {field.label}
          </div>
        );
      case 'text':
        return (
          <TextField
            fullWidth
            id={field.name}
            name={field.name}
            label={field.label}
            margin={compact ? "dense" : "normal"}
            value={value || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            required={field.required}
            error={!!error}
            helperText={error}
            placeholder={field.placeholder || ''}
            size={compact ? "small" : "medium"}
            sx={textFieldSx}
          />
        );
      
      case 'number':
        return (
          <TextField
            fullWidth
            id={field.name}
            name={field.name}
            label={field.label}
            margin={compact ? "dense" : "normal"}
            value={value || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            required={field.required}
            error={!!error}
            helperText={error}
            placeholder={field.placeholder || ''}
            type="number"
            size={compact ? "small" : "medium"}
            sx={{ 
              ...textFieldSx,
              width: '40%' // Ширина числового поля 40%
            }}
            InputLabelProps={{ shrink: true }}
          />
        );
        
      case 'date':
        return (
          <TextField
            fullWidth
            id={field.name}
            name={field.name}
            label={field.label}
            margin={compact ? "dense" : "normal"}
            value={value || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            required={field.required}
            error={!!error}
            helperText={error}
            placeholder={field.placeholder || ''}
            type="datetime-local" // Поддержка даты и времени
            size={compact ? "small" : "medium"}
            sx={textFieldSx}
            InputLabelProps={{ shrink: true }}
            // Устанавливаем часовой пояс Москвы (UTC+3)
            inputProps={{
              min: new Date().toISOString().slice(0, 16), // Минимальная дата - текущее время
              step: 60 // Шаг в секундах для поля времени
            }}
          />
        );
      
      case 'select':
        return (
          <FormControl 
            fullWidth 
            margin={compact ? "dense" : "normal"} 
            error={!!error}
            size={compact ? "small" : "medium"}
          >
            <InputLabel>{field.label}</InputLabel>
            <Select
              id={field.name}
              name={field.name}
              value={value || ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              label={field.label}
              required={field.required}
            >
              <MenuItem value="">
                <em>Не выбрано</em>
              </MenuItem>
              {options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        );
      
      case 'autocomplete':
        return (
          <FormControl 
            fullWidth 
            margin={compact ? "dense" : "normal"} 
            error={!!error}
          >
            <Autocomplete
              id={field.name}
              value={value ? options.find(opt => opt.value === value) || null : null}
              inputValue={searchQuery}
              onInputChange={(_, newInputValue) => setSearchQuery(newInputValue || '')}
              onChange={(_, selectedOption) => {
                setSelectedOption(selectedOption);
                onChange(field.name, selectedOption ? selectedOption.value : '');
              }}
              options={options}
              getOptionLabel={(option) => option?.label || ''}
              loading={loading}
              size={compact ? "small" : "medium"}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={field.label}
                  placeholder={field.placeholder || ''}
                  error={!!error}
                  helperText={error}
                  required={field.required}
                  size={compact ? "small" : "medium"}
                />
              )}
              noOptionsText="Нет доступных вариантов"
              loadingText="Загрузка..."
              filterOptions={(x) => x} // Отключаем встроенную фильтрацию, так как она уже выполнена на сервере
            />
          </FormControl>
        );
      
      case 'checkbox':
        return (
          <FormControl component="fieldset" margin={compact ? "dense" : "normal"} error={!!error}>
            <FormLabel component="legend">{field.label}</FormLabel>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!value}
                    onChange={(e) => onChange(field.name, e.target.checked)}
                    name={field.name}
                  />
                }
                label={field.label}
              />
            </FormGroup>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        );
      
      case 'radio':
        return (
          <FormControl component="fieldset" margin={compact ? "dense" : "normal"} error={!!error}>
            <FormLabel component="legend">{field.label}</FormLabel>
            <RadioGroup
              name={field.name}
              value={value || ''}
              onChange={(e) => onChange(field.name, e.target.value)}
            >
              {options.map((option) => (
                <FormControlLabel 
                  key={option.value} 
                  value={option.value} 
                  control={<Radio />} 
                  label={option.label} 
                />
              ))}
            </RadioGroup>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        );
      
      case 'textarea':
        return (
          <TextField
            fullWidth
            id={field.name}
            name={field.name}
            label={field.label}
            margin={compact ? "dense" : "normal"}
            value={value || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            required={field.required}
            error={!!error}
            helperText={error}
            placeholder={field.placeholder || ''}
            multiline
            rows={compact ? 3 : 4}
            size={compact ? "small" : "medium"}
            sx={textFieldSx}
          />
        );
      
      default:
        return (
          <TextField
            fullWidth
            id={field.name}
            name={field.name}
            label={field.label}
            margin={compact ? "dense" : "normal"}
            value={value || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            required={field.required}
            error={!!error}
            helperText={error}
            placeholder={field.placeholder || ''}
            size={compact ? "small" : "medium"}
            sx={textFieldSx}
          />
        );
    }
  };

  // Для разделителей и заголовков не добавляем дополнительные отступы
  if (field.type === 'divider' || field.type === 'header') {
    return <div style={compact ? { marginBottom: '8px' } : {}}>{renderFieldByType()}</div>;
  }
  
  return (
    <div className="form-field" style={{ marginBottom: '15px' }}>
      {renderFieldByType()}
    </div>
  );
};

export default FormField;
