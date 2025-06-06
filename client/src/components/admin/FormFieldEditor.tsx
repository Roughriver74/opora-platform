import React, { useState } from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Button,
  Typography,
  Box,
  Stack,
  IconButton,
  FormHelperText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Paper,
  Autocomplete,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { FormField, FieldType, FormFieldOption } from '../../types';

// Типы для группирования полей
interface FieldTypeItem {
  value: FieldType;
  label: string;
}

interface FieldTypeGroup {
  group: string;
  items: FieldTypeItem[];
}

interface FormFieldEditorProps {
  field: Partial<FormField>;
  onSave: (field: Partial<FormField>) => void;
  onDelete?: () => void;
  availableBitrixFields: Record<string, any>;
  isDraggable?: boolean; // Флаг для включения перетаскивания
}

const FormFieldEditor: React.FC<FormFieldEditorProps> = ({
  field,
  onSave,
  onDelete,
  availableBitrixFields,
  isDraggable,
}) => {
  const [formField, setFormField] = useState<Partial<FormField>>(field);
  const [options, setOptions] = useState<FormFieldOption[]>(field.options || []);
  const [newOption, setNewOption] = useState<FormFieldOption>({ value: '', label: '' });
  
  // Состояния для управления раскрытием секций и поиском
  const [expanded, setExpanded] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  
  // Обработчик изменения состояния панели
  const handleExpandChange = (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded);
  };

  const [fieldTypes] = useState<FieldTypeGroup[]>([
    // Разделительное группирование типов полей
    { group: 'Элементы оформления', items: [
      { value: 'header', label: 'Заголовок раздела' },
      { value: 'divider', label: 'Разделитель' },
    ]},
    { group: 'Поля ввода', items: [
      { value: 'text', label: 'Текстовое поле' },
      { value: 'number', label: 'Числовое поле' },
      { value: 'textarea', label: 'Многострочное поле' },
    ]},
    { group: 'Выбор значений', items: [
      { value: 'select', label: 'Выпадающий список' },
      { value: 'autocomplete', label: 'Автозаполнение' },
      { value: 'checkbox', label: 'Флажок' },
      { value: 'radio', label: 'Переключатель' },
    ]},
  ]);

  // Обработчик изменения полей
  const handleFieldChange = (name: string, value: any) => {
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  // Обработчик изменения динамического источника данных
  const handleDynamicSourceChange = (enabled: boolean) => {
    const dynamicSource = formField.dynamicSource || { enabled: false, source: 'catalog' };
    setFormField((prev) => ({
      ...prev,
      dynamicSource: {
        ...dynamicSource,
        enabled,
      },
    }));
  };

  // Добавление новой опции
  const addOption = () => {
    if (newOption.value && newOption.label) {
      const updatedOptions = [...options, newOption];
      setOptions(updatedOptions);
      setFormField((prev) => ({ ...prev, options: updatedOptions }));
      setNewOption({ value: '', label: '' });
    }
  };

  // Удаление опции
  const removeOption = (index: number) => {
    const updatedOptions = options.filter((_, i) => i !== index);
    setOptions(updatedOptions);
    setFormField((prev) => ({ ...prev, options: updatedOptions }));
  };

  // Сохранение поля формы
  const handleSave = () => {
    onSave({ ...formField, options });
  };

  // Отображение полей Битрикс24 в зависимости от выбранного типа
  const renderBitrixFields = () => {
    // Преобразуем объект в массив объектов для Autocomplete
    const bitrixFieldsArray = Object.entries(availableBitrixFields).map(([fieldId, field]: [string, any]) => ({
      id: fieldId,
      name: field.name || field.title || fieldId,
      field
    }));

    return (
      <>
        <FormControl fullWidth margin="normal">
          <Autocomplete
            id="bitrix-field-autocomplete"
            options={bitrixFieldsArray}
            getOptionLabel={(option) => option.name}
            value={formField.bitrixFieldId ? bitrixFieldsArray.find(item => item.id === formField.bitrixFieldId) || null : null}
            onChange={(event, newValue) => {
              const selectedFieldId = newValue?.id || '';
              handleFieldChange('bitrixFieldId', selectedFieldId);
              
              // Автозаполнение названия для пользователя
              // Теперь копируем название в любом случае, не только когда поле пустое
              if (selectedFieldId && newValue) {
                handleFieldChange('label', newValue.name);
              }
            }}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="Поле Битрикс24" 
                placeholder="Начните вводить для поиска..."
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="body1">{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">ID: {option.id}</Typography>
                </Box>
              </li>
            )}
            filterOptions={(options, state) => {
              const inputValue = state.inputValue.toLowerCase().trim();
              if (!inputValue) return options;
              
              return options.filter(option => 
                option.name.toLowerCase().includes(inputValue) || 
                option.id.toLowerCase().includes(inputValue)
              );
            }}
            fullWidth
          />
        </FormControl>
      </>
    );
  };

  // Отображение настроек динамического источника данных для автозаполнения
  const renderDynamicSourceSettings = () => {
    if (formField.type === 'autocomplete' || formField.type === 'select') {
      return (
        <Box sx={{ mt: 2, mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={formField.dynamicSource?.enabled || false}
                onChange={(e) => handleDynamicSourceChange(e.target.checked)}
              />
            }
            label="Использовать динамический источник данных"
          />

          {formField.dynamicSource?.enabled && (
            <FormControl fullWidth margin="normal">
              <InputLabel id="dynamic-source-label">Источник данных</InputLabel>
              <Select
                labelId="dynamic-source-label"
                id="dynamic-source"
                value={formField.dynamicSource?.source || 'catalog'}
                onChange={(e) => handleFieldChange('dynamicSource', { ...formField.dynamicSource, source: e.target.value })}
                label="Источник данных"
              >
                <MenuItem value="catalog">Каталог товаров</MenuItem>
                <MenuItem value="companies">Компании</MenuItem>
                <MenuItem value="contacts">Контакты</MenuItem>
              </Select>
              <FormHelperText>
                Данные будут загружаться из Битрикс24 при вводе
              </FormHelperText>
            </FormControl>
          )}
        </Box>
      );
    }
    return null;
  };

  // Отображение настроек для опций выпадающего списка или радиокнопок
  const renderOptionsEditor = () => {
    if (
      (formField.type === 'select' || formField.type === 'radio') &&
      (!formField.dynamicSource || !formField.dynamicSource.enabled)
    ) {
      return (
        <Box sx={{ mt: 3, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Опции
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {options.map((option, index) => (
            <Stack direction="row" spacing={2} key={index} sx={{ mb: 1 }}>
              <Stack sx={{ width: '41.66%' }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Значение"
                  value={option.value}
                  disabled
                />
              </Stack>
              <Stack sx={{ width: '41.66%' }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Текст"
                  value={option.label}
                  disabled
                />
              </Stack>
              <Stack sx={{ width: '16.66%' }}>
                <IconButton
                  color="error"
                  onClick={() => removeOption(index)}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>
            </Stack>
          ))}

          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <Stack sx={{ width: '41.66%' }}>
              <TextField
                fullWidth
                size="small"
                label="Значение"
                value={newOption.value}
                onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
              />
            </Stack>
            <Stack sx={{ width: '41.66%' }}>
              <TextField
                fullWidth
                size="small"
                label="Текст"
                value={newOption.label}
                onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
              />
            </Stack>
            <Stack sx={{ width: '16.66%' }}>
              <IconButton color="primary" onClick={addOption} size="small">
                <AddIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Box>
      );
    }
    return null;
  };
  
  // Функция для отображения краткой информации о поле
  const getFieldSummary = (): string[] => {
    const summaryParts: string[] = [];
    
    // Добавляем тип поля
    if (formField.type) {
      const fieldType = fieldTypes
        .flatMap(group => group.items)
        .find(item => item.value === formField.type);
      if (fieldType) {
        summaryParts.push(fieldType.label);
      }
    }
    
    // Добавляем порядок отображения
    if (formField.order !== undefined) {
      summaryParts.push(`Порядок: ${formField.order}`);
    }
    
    // Добавляем признак обязательности
    if (formField.type !== 'header' && formField.type !== 'divider' && formField.required) {
      summaryParts.push('Обязательное');
    }
    
    return summaryParts;
  };

  return (
    <Accordion 
      expanded={expanded} 
      onChange={handleExpandChange}
      sx={{ 
        mb: 1.5,
        '&:before': { display: 'none' }, // убираем линию перед аккордеоном
        boxShadow: expanded ? 3 : 1,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="field-editor-content"
        id="field-editor-header"
        sx={{ 
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {/* Иконка для перетаскивания */}
        {isDraggable && (
          <DragIndicatorIcon 
            sx={{ 
              mr: 1, 
              color: '#999',
              cursor: 'grab',
              '&:hover': {
                color: 'primary.main',
              } 
            }} 
          />
        )}
        
        <Box sx={{ display: 'flex', flexGrow: 1, alignItems: 'center' }}>
          {/* Название поля */}
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            {formField.label || 'Новое поле'}
          </Typography>
          
          {/* Дополнительная информация */}
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, flexWrap: 'wrap' }}>
            {getFieldSummary().map((text, index) => (
              <Chip 
                key={index} 
                label={text} 
                size="small" 
                variant="outlined"
                sx={{ height: 24 }}
              />
            ))}
          </Box>
        </Box>
        
        {/* Кнопка удаления поля */}
        {onDelete && (
          <IconButton 
            size="small" 
            color="error" 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            sx={{ ml: 1 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </AccordionSummary>

      <AccordionDetails sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Stack sx={{ width: { xs: '100%', md: '50%' } }}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="field-type-label">Тип поля</InputLabel>
              <Select
                labelId="field-type-label"
                id="field-type"
                value={formField.type || ''}
                onChange={(e) => handleFieldChange('type', e.target.value)}
                label="Тип поля"
                required
              >
                {fieldTypes.flatMap((group) => [
                  <MenuItem 
                    key={group.group} 
                    disabled 
                    sx={{ 
                      fontWeight: 'bold', 
                      opacity: 0.7, 
                      backgroundColor: '#f5f5f5',
                      pointerEvents: 'none'
                    }}
                  >
                    {group.group}
                  </MenuItem>,
                  ...group.items.map((item) => (
                    <MenuItem 
                      key={item.value} 
                      value={item.value}
                      sx={{ pl: 4 }} // Отступ для вложенных элементов
                    >
                      {item.label}
                    </MenuItem>
                  ))
                ])}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Название поля"
              name="label"
              value={formField.label || ''}
              onChange={(e) => handleFieldChange('label', e.target.value)}
              margin="normal"
            />
          </Stack>
          
          <Stack sx={{ width: { xs: '100%', md: '50%' } }}>
            <TextField
              fullWidth
              label="Порядок отображения"
              name="order"
              type="number"
              value={formField.order || 0}
              onChange={(e) => handleFieldChange('order', parseInt(e.target.value))}
              margin="normal"
            />
          </Stack>
        </Stack>

        {/* Подсказка не нужна для заголовков и разделителей */}
        {formField.type !== 'header' && formField.type !== 'divider' && (
          <TextField
            fullWidth
            label="Подсказка"
            name="placeholder"
            value={formField.placeholder || ''}
            onChange={(e) => handleFieldChange('placeholder', e.target.value)}
            margin="normal"
          />
        )}

        {/* Поля Битрикса и обязательность не нужны для заголовков и разделителей */}
        {formField.type !== 'header' && formField.type !== 'divider' && renderBitrixFields()}

        {formField.type !== 'header' && formField.type !== 'divider' && (
          <FormControlLabel
            control={
              <Switch
                checked={formField.required || false}
                onChange={(e) => handleFieldChange('required', e.target.checked)}
              />
            }
            label="Обязательное поле"
            sx={{ mt: 1 }}
          />
        )}

        {/* Динамические источники и опции не нужны для заголовков и разделителей */}
        {formField.type !== 'header' && formField.type !== 'divider' && renderDynamicSourceSettings()}
        {formField.type !== 'header' && formField.type !== 'divider' && renderOptionsEditor()}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSave}
            sx={{ ml: 1 }}
          >
            Сохранить
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default FormFieldEditor;
