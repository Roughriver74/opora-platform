import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Paper,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
// Удалена зависимость от библиотеки drag-and-drop, используем нативный HTML5 Drag and Drop API
import FormFieldEditor from './FormFieldEditor';
import { Form, FormField as FormFieldType } from '../../types';
import { FormService } from '../../services/formService';
import { FormFieldService } from '../../services/formFieldService';

interface FormEditorProps {
  form?: Form;
  onSave: (form: Form) => void;
}

const FormEditor: React.FC<FormEditorProps> = ({ form, onSave }) => {
  const [formData, setFormData] = useState<Partial<Form>>(
    form || {
      name: '',
      title: '',
      description: '',
      isActive: true,
      fields: [],
      successMessage: 'Спасибо! Ваша заявка успешно отправлена.',
    }
  );
  const [fields, setFields] = useState<FormFieldType[]>([]);
  const [bitrixFields, setBitrixFields] = useState<Record<string, any>>({});
  const [dealCategories, setDealCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных из Битрикс24
  useEffect(() => {
    const loadBitrixData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Загрузка полей для сделок
        const fieldsResponse = await FormFieldService.getBitrixFields();
        if (fieldsResponse && fieldsResponse.result) {
          setBitrixFields(fieldsResponse.result);
        }

        // Загрузка категорий сделок
        const categoriesResponse = await FormService.getDealCategories();
        if (categoriesResponse && categoriesResponse.result) {
          setDealCategories(categoriesResponse.result);
        }
      } catch (err: any) {
        setError('Ошибка при загрузке данных из Битрикс24: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadBitrixData();
  }, []);

  // Загрузка существующих полей формы
  useEffect(() => {
    if (form && form._id && form.fields) {
      // Если поля представлены в виде ID, загружаем их данные
      if (typeof form.fields[0] === 'string') {
        const loadFields = async () => {
          setLoading(true);
          try {
            // Загрузка всех полей и фильтрация нужных
            const allFields = await FormFieldService.getAllFields();
            const formFields = allFields.filter((field: FormFieldType) => 
              (form.fields as string[]).includes(field._id!)
            );
            setFields(formFields);
          } catch (err: any) {
            setError('Ошибка при загрузке полей формы: ' + err.message);
          } finally {
            setLoading(false);
          }
        };
        loadFields();
      } else {
        // Если поля уже загружены полностью
        setFields(form.fields as FormFieldType[]);
      }
    }
  }, [form]);

  // Обновление данных формы
  const handleFormChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Состояние для отслеживания перетаскиваемого элемента
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Обработчики перетаскивания с использованием нативного HTML5 Drag and Drop API
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Добавляем данные для переноса
    e.dataTransfer.setData('text/plain', index.toString());
    // Устанавливаем полупрозрачность для перетаскиваемого элемента
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.5';
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = Number(e.dataTransfer.getData('text/plain'));
    
    // Если порядок не изменился
    if (sourceIndex === targetIndex) return;
    
    // Создаем копию массива полей
    const reorderedFields = [...fields];
    
    // Удаляем элемент из старой позиции
    const [removed] = reorderedFields.splice(sourceIndex, 1);
    // Добавляем элемент на новую позицию
    reorderedFields.splice(targetIndex, 0, removed);
    
    // Обновляем порядок (order) полей после перетаскивания
    const updatedFields = reorderedFields.map((field, index) => ({
      ...field,
      order: index + 1
    }));
    
    // Обновляем состояние
    setFields(updatedFields);
    setDraggedIndex(null);
    
    // Сохраняем поля на сервере автоматически после перетаскивания
    try {
      // Показываем индикатор загрузки
      setLoading(true);
      
      // Сохраняем каждое поле с обновленным порядком
      const savePromises = updatedFields
        .filter(field => field._id) // Только для полей, которые уже имеют ID (сохранены в базе)
        .map(field => FormFieldService.updateField(field._id as string, field));
      
      if (savePromises.length > 0) {
        await Promise.all(savePromises);
      }
      
      // Показываем уведомление об успехе
      setError('\u041fорядок полей успешно обновлен');
      
      // Скрываем уведомление через 2 секунды
      setTimeout(() => setError(null), 2000);
    } catch (err) {
      console.error('\u041eшибка при сохранении порядка полей:', err);
      setError('\u041eшибка при сохранении порядка полей');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    // Возвращаем нормальную прозрачность для перетаскиваемого элемента
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedIndex(null);
  };

  // Добавление нового поля
  const addNewField = () => {
    const newField: Partial<FormFieldType> = {
      name: `field_${fields.length + 1}`,
      label: `Поле ${fields.length + 1}`,
      type: 'text',
      required: false,
      order: fields.length + 1,
      bitrixFieldId: '',
      bitrixFieldType: '',
    };
    
    setFields([...fields, newField as FormFieldType]);
  };

  // Сохранение поля
  const handleFieldSave = async (index: number, updatedField: Partial<FormFieldType>) => {
    try {
      // Отладочный вывод данных поля
      console.log('Сохраняемые данные поля:', JSON.stringify(updatedField, null, 2));
      
      let savedField;
      
      if (updatedField._id) {
        // Обновление существующего поля
        savedField = await FormFieldService.updateField(
          updatedField._id,
          updatedField as FormFieldType
        );
      } else {
        // Создание нового поля
        savedField = await FormFieldService.createField(
          updatedField as Omit<FormFieldType, '_id'>
        );
      }

      // Обновление списка полей
      const updatedFields = [...fields];
      updatedFields[index] = savedField;
      setFields(updatedFields);
    } catch (err: any) {
      setError('Ошибка при сохранении поля: ' + err.message);
    }
  };

  // Удаление поля
  const handleFieldDelete = async (index: number) => {
    const field = fields[index];
    
    if (field._id) {
      try {
        await FormFieldService.deleteField(field._id);
      } catch (err: any) {
        setError('Ошибка при удалении поля: ' + err.message);
        return;
      }
    }
    
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
  };

  // Сохранение формы
  const handleFormSave = async () => {
    setLoading(true);
    setError(null);

    try {
      // Подготовка данных формы
      const fieldIds = fields.map(field => field._id).filter(id => id); // Получаем только ID полей
      
      const formToSave: Partial<Form> = {
        ...formData,
        fields: fieldIds as string[],
      };

      let savedForm;
      if (formData._id) {
        // Обновление существующей формы
        savedForm = await FormService.updateForm(formData._id, formToSave);
      } else {
        // Создание новой формы
        savedForm = await FormService.createForm(formToSave as Omit<Form, '_id'>);
      }

      onSave(savedForm);
    } catch (err: any) {
      setError('Ошибка при сохранении формы: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          {form && form._id ? 'Редактирование формы' : 'Создание новой формы'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Идентификатор формы"
          name="name"
          value={formData.name || ''}
          onChange={(e) => handleFormChange('name', e.target.value)}
          margin="normal"
          required
          helperText="Уникальный идентификатор формы (без пробелов)"
        />

        <TextField
          fullWidth
          label="Заголовок формы"
          name="title"
          value={formData.title || ''}
          onChange={(e) => handleFormChange('title', e.target.value)}
          margin="normal"
          required
        />

        <TextField
          fullWidth
          label="Описание формы"
          name="description"
          value={formData.description || ''}
          onChange={(e) => handleFormChange('description', e.target.value)}
          margin="normal"
          multiline
          rows={2}
        />

        <FormControl fullWidth margin="normal">
          <InputLabel id="deal-category-label">Категория сделки в Битрикс24</InputLabel>
          <Select
            labelId="deal-category-label"
            id="bitrix-deal-category"
            value={formData.bitrixDealCategory || ''}
            onChange={(e) => handleFormChange('bitrixDealCategory', e.target.value)}
            label="Категория сделки в Битрикс24"
          >
            <MenuItem value="">
              <em>По умолчанию</em>
            </MenuItem>
            {dealCategories.map((category) => (
              <MenuItem key={category.ID} value={category.ID}>
                {category.NAME}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Сообщение об успешной отправке"
          name="successMessage"
          value={formData.successMessage || 'Спасибо! Ваша заявка успешно отправлена.'}
          onChange={(e) => handleFormChange('successMessage', e.target.value)}
          margin="normal"
        />

        <FormControlLabel
          control={
            <Switch
              checked={formData.isActive || false}
              onChange={(e) => handleFormChange('isActive', e.target.checked)}
            />
          }
          label="Форма активна"
          sx={{ mt: 1, mb: 2, display: 'block' }}
        />

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Поля формы
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            {/* Используем нативный HTML5 Drag and Drop API */}
            <div style={{ width: '100%' }}>
                    {/* Сортировка полей по порядку отображения */}
                    {[...fields]
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((field, index) => {
                        // Находим оригинальный индекс поля в несортированном массиве
                        const originalIndex = fields.findIndex(f => 
                          (f._id && field._id) ? f._id === field._id : f === field
                        );
                        
                        return (
                          <div
                            key={field._id || `field-${index}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            style={{
                              opacity: draggedIndex === index ? 0.5 : 1,
                              cursor: 'move',
                              marginBottom: '10px',
                              position: 'relative'
                            }}
                          >
                            {/* Бейдж с номером порядка */}
                            <Box
                              sx={{
                                position: 'absolute',
                                top: '-8px',
                                left: '-8px',
                                zIndex: 10,
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                backgroundColor: 'primary.main',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                                boxShadow: 2,
                                border: '2px solid white'
                              }}
                            >
                              {field.order || index + 1}
                            </Box>
                            <FormFieldEditor
                              key={field._id || index}
                              field={field}
                              onSave={(updatedField) => handleFieldSave(originalIndex, updatedField)}
                              onDelete={() => handleFieldDelete(originalIndex)}
                              availableBitrixFields={bitrixFields}
                              isDraggable={true}
                            />
                          </div>
                        );
                      })}  
                  </div>

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addNewField}
              sx={{ mt: 2 }}
            >
              Добавить поле
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 4, textAlign: 'right' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleFormSave}
            disabled={loading}
            size="large"
          >
            Сохранить форму
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default FormEditor;
