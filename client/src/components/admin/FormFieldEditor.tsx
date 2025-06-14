import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  IconButton,
  Stack,
  Divider,
  Alert,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Autocomplete,
  FormHelperText,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { FormField, FieldType, FormFieldOption } from '../../types';
import BitrixOptionsLoader from './BitrixOptionsLoader';
import { FormFieldService } from '../../services/formFieldService';

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
  allFields?: FormField[]; // Все поля формы для определения разделов
}

const FormFieldEditor: React.FC<FormFieldEditorProps> = ({
  field,
  onSave,
  onDelete,
  availableBitrixFields,
  isDraggable,
  allFields = [], // По умолчанию пустой массив
}) => {
  const [formField, setFormField] = useState<Partial<FormField>>(field);
  const [options, setOptions] = useState<FormFieldOption[]>(field.options || []);
  const [newOption, setNewOption] = useState<FormFieldOption>({ value: '', label: '' });
  
  // Состояния для управления раскрытием секций и поиском
  const [expanded, setExpanded] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [loadingEnumValues, setLoadingEnumValues] = useState<boolean>(false);
  const [enumError, setEnumError] = useState<string | null>(null);

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
      { value: 'date', label: 'Дата/время' },
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
    // Сохраняем текущий источник данных, или устанавливаем по умолчанию 'catalog'
    const currentSource = formField.dynamicSource?.source || 'catalog';
    
    setFormField((prev) => ({
      ...prev,
      dynamicSource: {
        enabled,
        source: currentSource,
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

  // Обработка загруженных опций из Битрикс24
  const handleBitrixOptionsLoaded = (bitrixOptions: FormFieldOption[]) => {
    setOptions(bitrixOptions);
    // Автоматически обновляем поле формы с новыми опциями
    setFormField((prev) => ({
      ...prev,
      options: bitrixOptions,
    }));
  };

  // Функция для автоматической загрузки значений enum поля
  const loadEnumValues = async (fieldCode: string) => {
    setLoadingEnumValues(true);
    setEnumError(null);
    
    try {
      // Сначала получаем информацию о пользовательских полях
      const userFieldsResponse = await FormFieldService.getUserFields();
      
      if (userFieldsResponse?.result) {
        // Находим поле по коду
        const targetField = userFieldsResponse.result.find(
          (field: any) => field.FIELD_NAME === fieldCode
        );
        
        if (targetField && targetField.USER_TYPE_ID === 'enumeration') {
          // Загружаем значения для этого поля, используя FIELD_NAME для лучшей совместимости
          const enumValuesResponse = await FormFieldService.getEnumFieldValues(targetField.FIELD_NAME);
          
          if (enumValuesResponse?.result) {
            const enumOptions = enumValuesResponse.result.map((value: any) => ({
              value: value.ID,
              label: value.VALUE,
            }));
            
            console.log(`Загружены значения для поля ${fieldCode}:`, enumOptions);
            handleBitrixOptionsLoaded(enumOptions);
          }
        }
      }
    } catch (error: any) {
      console.error('Ошибка при загрузке enum значений:', error);
      setEnumError(`Ошибка загрузки значений: ${error.message}`);
    } finally {
      setLoadingEnumValues(false);
    }
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
                
                // Загрузка значений enum полей при выборе поля из Bitrix24
                if (newValue.field.enumValues) {
                  const enumOptions = newValue.field.enumValues.map((value: any) => ({
                    value: value.value,
                    label: value.label,
                  }));
                  handleBitrixOptionsLoaded(enumOptions);
                } else if (newValue.field.USER_TYPE_ID === 'enumeration') {
                  loadEnumValues(newValue.field.FIELD_NAME);
                }
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
    if (!['select', 'radio', 'autocomplete'].includes(formField.type as string)) {
      return null;
    }

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Настройки опций
        </Typography>
        
        {/* Показать ошибку загрузки enum значений */}
        {enumError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {enumError}
          </Alert>
        )}
        
        {/* Показать состояние загрузки */}
        {loadingEnumValues && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Загружаются значения из Bitrix24...
          </Alert>
        )}
        
        {/* Кнопка для ручной загрузки enum значений */}
        {formField.bitrixFieldId && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={() => loadEnumValues(formField.bitrixFieldId as string)}
              disabled={loadingEnumValues}
            >
              {loadingEnumValues ? 'Загрузка...' : 'Загрузить значения из Bitrix24'}
            </Button>
          </Box>
        )}

        {/* Опции из Битрикс24 */}
        {formField.dynamicSource?.enabled && (
          <BitrixOptionsLoader
            onOptionsLoaded={handleBitrixOptionsLoaded}
          />
        )}

        {/* Ручное редактирование опций */}
        {!formField.dynamicSource?.enabled && (
          <div>
            <Typography variant="subtitle1" gutterBottom>
              Опции для выбора
            </Typography>
            
            {options.map((option, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TextField
                  label="Значение"
                  value={option.value}
                  onChange={(e) => {
                    const newOptions = [...options];
                    newOptions[index].value = e.target.value;
                    setOptions(newOptions);
                  }}
                  size="small"
                  sx={{ mr: 1, flex: 1 }}
                />
                <TextField
                  label="Название"
                  value={option.label}
                  onChange={(e) => {
                    const newOptions = [...options];
                    newOptions[index].label = e.target.value;
                    setOptions(newOptions);
                  }}
                  size="small"
                  sx={{ mr: 1, flex: 1 }}
                />
                <IconButton
                  color="error"
                  onClick={() => removeOption(index)}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}

            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <TextField
                label="Значение"
                value={newOption.value}
                onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
                size="small"
                sx={{ mr: 1, flex: 1 }}
              />
              <TextField
                label="Название"
                value={newOption.label}
                onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
                size="small"
                sx={{ mr: 1, flex: 1 }}
              />
              <Button
                variant="outlined"
                onClick={addOption}
                startIcon={<AddIcon />}
                size="small"
              >
                Добавить
              </Button>
            </Box>
          </div>
        )}
      </Box>
    );
  };

  // Получаем доступные разделы из всех полей формы
  const existingSections = useMemo(() => {
    // Добавляем вариант без раздела
    const sections = [
      {
        id: '',
        name: 'Без раздела', 
        order: 0,
        sectionNumber: 0 // Секция 000 для полей без раздела
      }
    ];
    
    // Собираем все существующие заголовки с их номерами секций
    const headerFields = allFields.filter(field => field.type === 'header');
    
    // Получаем существующие номера секций или создаем новые
    headerFields.forEach(header => {
      // Пытаемся определить номер секции из order
      let sectionNumber = Math.floor(header.order / 100);
      
      // Если номер секции не соответствует формату (100, 200, и т.д.),
      // то назначаем новый
      if (sectionNumber < 1 || sectionNumber * 100 !== Math.floor(header.order)) {
        // Находим максимальный номер секции среди существующих
        sectionNumber = sections.length > 0 
          ? Math.max(...sections.map(s => s.sectionNumber || 0)) + 1 
          : 1;
      }
      
      sections.push({
        id: header._id || '',
        name: header.label,
        order: header.order,
        sectionNumber: sectionNumber
      });
    });
    
    // Сортировка разделов по номеру секции
    return sections.sort((a, b) => (a.sectionNumber || 0) - (b.sectionNumber || 0));
  }, [allFields]);
  
  // Текущий выбранный раздел при добавлении/редактировании поля
  const [selectedSection, setSelectedSection] = useState<string>('');
  
  // Обработчик выбора раздела
  const handleSectionChange = (sectionId: string) => {
    setSelectedSection(sectionId);
    
    if (sectionId) {
      // Находим раздел
      const section = existingSections.find(s => s.id === sectionId);
      if (section) {
        // Получаем номер секции или используем 0 для полей без раздела
        const sectionNumber = section.sectionNumber || 0;
        
        // Фильтруем поля текущей секции, основываясь на первой цифре порядка
        const fieldsInSection = allFields.filter(field => {
          // Для заголовка и без id пропускаем
          if (field.type === 'header' || !field._id) return false;
          // Пропускаем текущее редактируемое поле
          if (formField._id && field._id === formField._id) return false;
          
          // Получаем номер секции из порядка поля
          const fieldSectionNumber = Math.floor(field.order / 100);
          return fieldSectionNumber === sectionNumber;
        });
        
        // Сортируем поля в секции по порядку
        fieldsInSection.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Вычисляем новый порядок в новой трехзначной системе
        let newOrder;
        
        // Базовый порядок для секции - sectionNumber * 100
        const baseSectionOrder = sectionNumber * 100;
        
        if (fieldsInSection.length === 0) {
          // Если в секции нет полей, первое поле получает порядок baseSectionOrder + 1
          newOrder = baseSectionOrder + 1;
        } else {
          // Находим максимальное значение порядка в секции
          const maxOrderInSection = Math.max(...fieldsInSection.map(f => f.order || 0));
          
          // Убеждаемся, что не выходим за пределы секции (не превышаем следующие 100)
          const nextValue = maxOrderInSection + 1;
          if (Math.floor(nextValue / 100) > sectionNumber) {
            // Если превышаем границу секции, то просто увеличиваем последнюю цифру
            const lastDigit = maxOrderInSection % 10;
            newOrder = baseSectionOrder + (lastDigit + 1 > 9 ? 9 : lastDigit + 1);
          } else {
            newOrder = nextValue;
          }
        }
        
        // Проверяем, чтобы порядок всегда имел правильную первую цифру (номер секции)
        if (Math.floor(newOrder / 100) !== sectionNumber) {
          newOrder = baseSectionOrder + (newOrder % 100);
        }
        
        // Если больше 99 полей, ограничиваем до 99
        if ((newOrder % 100) > 99) {
          newOrder = baseSectionOrder + 99;
        }
        
        console.log(`Установка порядка для поля в разделе ${sectionNumber}: ${newOrder}`);
        handleFieldChange('order', newOrder);
      }
    }
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
            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ width: '100%' }}>
              <TextField
                fullWidth
                label="Порядок отображения"
                name="order"
                type="number"
                value={formField.order || 0}
                onChange={(e) => handleFieldChange('order', parseInt(e.target.value))}
                margin="normal"
              />
              
              {formField.type !== 'header' && (
                <FormControl fullWidth margin="normal">
                  <InputLabel id="section-select-label">Раздел</InputLabel>
                  <Select
                    labelId="section-select-label"
                    value={selectedSection}
                    onChange={(e) => handleSectionChange(e.target.value as string)}
                    label="Раздел"
                  >
                    <MenuItem value=""><em>Не выбрано</em></MenuItem>
                    {existingSections.map((section) => (
                      <MenuItem key={section.id} value={section.id}>
                        {section.name} (раздел: {section.sectionNumber}00)
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    Выберите раздел, чтобы автоматически установить порядок поля
                  </FormHelperText>
                </FormControl>
              )}
            </Stack>
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
