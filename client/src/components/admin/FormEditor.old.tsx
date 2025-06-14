import React, { useState, useEffect, useCallback } from 'react';
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
  Card,
  CardContent,
  Stack,
  Chip,
  Tooltip,
  IconButton,
  Snackbar,
  Fade,
  LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoSaveIcon from '@mui/icons-material/CloudDone';
import WarningIcon from '@mui/icons-material/Warning';
import DragHandleIcon from '@mui/icons-material/DragHandle';
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
  
  // UX состояния
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [draggedField, setDraggedField] = useState<FormFieldType | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Автосохранение
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const autoSave = useCallback(async () => {
    if (hasChanges && !saving && !autoSaving) {
      setAutoSaving(true);
      try {
        const fieldIds = fields.map(field => field._id).filter(id => id);
        const formToSave: Partial<Form> = { ...formData, fields: fieldIds as string[] };

        let savedForm: Form;
        if (formData._id) {
          savedForm = await FormService.updateForm(formData._id, formToSave);
        } else {
          savedForm = await FormService.createForm(formToSave as Omit<Form, '_id'>);
          setFormData(prev => ({ ...prev, _id: savedForm._id }));
        }

        setHasChanges(false);
        setLastSaved(new Date());
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } catch (err: any) {
        setError('Ошибка автосохранения: ' + err.message);
      } finally {
        setAutoSaving(false);
      }
    }
  }, [formData, fields, hasChanges, saving, autoSaving]);

  useEffect(() => {
    if (hasChanges) {
      if (saveTimeout) clearTimeout(saveTimeout);
      const timeout = setTimeout(autoSave, 3000); // Автосохранение через 3 секунды
      setSaveTimeout(timeout);
    }
    return () => {
      if (saveTimeout) clearTimeout(saveTimeout);
    };
  }, [hasChanges, autoSave, saveTimeout]);

  // Загрузка данных из Битрикс24
  useEffect(() => {
    const loadBitrixData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [fieldsResponse, categoriesResponse] = await Promise.all([
          FormFieldService.getBitrixFields(),
          FormService.getDealCategories()
        ]);

        if (fieldsResponse?.result) {
          setBitrixFields(fieldsResponse.result);
        }
        if (categoriesResponse?.result) {
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
      if (typeof form.fields[0] === 'string') {
        const loadFields = async () => {
          setLoading(true);
          try {
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
        setFields(form.fields as FormFieldType[]);
      }
    }
  }, [form]);

  // Обновление данных формы с отслеживанием изменений
  const handleFormChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setHasChanges(true);
  };

  // Улучшенное перетаскивание
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, field: FormFieldType, index: number) => {
    setDraggedField(field);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    
    // Визуальная обратная связь
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.6';
      e.currentTarget.style.transform = 'scale(0.98)';
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = Number(e.dataTransfer.getData('text/plain'));
    
    if (sourceIndex === targetIndex) {
      setDragOverIndex(null);
      return;
    }
    
    const reorderedFields = [...fields];
    const [removed] = reorderedFields.splice(sourceIndex, 1);
    reorderedFields.splice(targetIndex, 0, removed);
    
    // Обновляем порядок полей
    const updatedFields = reorderedFields.map((field, index) => ({
      ...field,
      order: index + 1
    }));
    
    setFields(updatedFields);
    setDraggedField(null);
    setDragOverIndex(null);
    setHasChanges(true);
    
    // Автоматическое сохранение порядка
    try {
      const savePromises = updatedFields
        .filter(field => field._id)
        .map(field => FormFieldService.updateField(field._id as string, field));
      
      if (savePromises.length > 0) {
        await Promise.all(savePromises);
      }
    } catch (err) {
      setError('Ошибка при сохранении порядка полей');
    }
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1';
      e.currentTarget.style.transform = 'scale(1)';
    }
    setDraggedField(null);
    setDragOverIndex(null);
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
    setHasChanges(true);
  };

  // Сохранение поля
  const handleFieldSave = async (index: number, updatedField: Partial<FormFieldType>) => {
    try {
      let savedField;
      
      if (updatedField._id) {
        savedField = await FormFieldService.updateField(
          updatedField._id,
          updatedField as FormFieldType
        );
      } else {
        savedField = await FormFieldService.createField(
          updatedField as Omit<FormFieldType, '_id'>
        );
      }

      const updatedFields = [...fields];
      updatedFields[index] = savedField;
      setFields(updatedFields);
      setHasChanges(true);
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
    setHasChanges(true);
  };

  // Ручное сохранение формы
  const handleFormSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const fieldIds = fields.map(field => field._id).filter(id => id);
      const formToSave: Partial<Form> = { ...formData, fields: fieldIds as string[] };

      let savedForm;
      if (formData._id) {
        savedForm = await FormService.updateForm(formData._id, formToSave);
      } else {
        savedForm = await FormService.createForm(formToSave as Omit<Form, '_id'>);
      }

      setHasChanges(false);
      setLastSaved(new Date());
      onSave(savedForm);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError('Ошибка при сохранении формы: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Получение статуса сохранения
  const getSaveStatus = () => {
    if (saving || autoSaving) return { text: 'Сохранение...', color: 'info' as const };
    if (hasChanges) return { text: 'Есть изменения', color: 'warning' as const };
    if (lastSaved) return { text: `Сохранено ${lastSaved.toLocaleTimeString()}`, color: 'success' as const };
    return { text: 'Новая форма', color: 'default' as const };
  };

  const saveStatus = getSaveStatus();

  return (
    <Box sx={{ mb: 4 }}>
      {/* Индикатор прогресса */}
      {(loading || saving || autoSaving) && (
        <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }} />
      )}

      {/* Заголовок с индикаторами состояния */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h4" component="h1">
              {form && form._id ? 'Редактирование формы' : 'Создание новой формы'}
            </Typography>
            
            <Stack direction="row" alignItems="center" spacing={2}>
              <Chip
                icon={
                  saving || autoSaving ? <CircularProgress size={16} /> :
                  hasChanges ? <WarningIcon /> :
                  lastSaved ? <CheckCircleIcon /> : undefined
                }
                label={saveStatus.text}
                color={saveStatus.color}
                variant={hasChanges ? 'filled' : 'outlined'}
              />
              
              {hasChanges && (
                <Tooltip title="Сохранить сейчас">
                  <IconButton 
                    color="primary" 
                    onClick={handleFormSave}
                    disabled={saving || autoSaving}
                  >
                    <SaveIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Основные настройки формы */}
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Идентификатор формы"
                value={formData.name || ''}
                onChange={(e) => handleFormChange('name', e.target.value)}
                required
                helperText="Уникальный идентификатор (без пробелов)"
                error={!formData.name}
              />

              <TextField
                fullWidth
                label="Заголовок формы"
                value={formData.title || ''}
                onChange={(e) => handleFormChange('title', e.target.value)}
                required
                error={!formData.title}
              />
            </Stack>

            <TextField
              fullWidth
              label="Описание формы"
              value={formData.description || ''}
              onChange={(e) => handleFormChange('description', e.target.value)}
              multiline
              rows={2}
            />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Категория сделки в Битрикс24</InputLabel>
                <Select
                  value={formData.bitrixDealCategory || ''}
                  onChange={(e) => handleFormChange('bitrixDealCategory', e.target.value)}
                  label="Категория сделки в Битрикс24"
                >
                  <MenuItem value="">По умолчанию</MenuItem>
                  {dealCategories.map((category) => (
                    <MenuItem key={category.ID} value={category.ID}>
                      {category.NAME}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive || false}
                    onChange={(e) => handleFormChange('isActive', e.target.checked)}
                  />
                }
                label="Форма активна"
                sx={{ minWidth: 'fit-content' }}
              />
            </Stack>

            <TextField
              fullWidth
              label="Сообщение об успешной отправке"
              value={formData.successMessage || 'Спасибо! Ваша заявка успешно отправлена.'}
              onChange={(e) => handleFormChange('successMessage', e.target.value)}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Поля формы */}
      <Card elevation={2}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Typography variant="h5" component="h2">
              Поля формы
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={addNewField}
              size="large"
            >
              Добавить поле
            </Button>
          </Stack>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={60} />
            </Box>
          ) : (
            <Box>
              {fields.length === 0 ? (
                <Box 
                  sx={{ 
                    textAlign: 'center', 
                    py: 8, 
                    color: 'text.secondary',
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 2
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Поля не добавлены
                  </Typography>
                  <Typography variant="body2">
                    Нажмите "Добавить поле" чтобы создать первое поле формы
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {[...fields]
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((field, sortedIndex) => {
                      const originalIndex = fields.findIndex(f => 
                        (f._id && field._id) ? f._id === field._id : f === field
                      );
                      
                      return (
                        <Box
                          key={field._id || `field-${sortedIndex}`}
                          sx={{
                            position: 'relative',
                            transition: 'all 0.2s ease-in-out',
                            transform: dragOverIndex === sortedIndex ? 'translateY(-4px)' : 'translateY(0)',
                            '&::before': dragOverIndex === sortedIndex ? {
                              content: '""',
                              position: 'absolute',
                              top: -2,
                              left: 0,
                              right: 0,
                              height: 4,
                              bgcolor: 'primary.main',
                              borderRadius: 1,
                              zIndex: 1
                            } : {}
                          }}
                        >
                          <Box
                            draggable
                            onDragStart={(e) => handleDragStart(e, field, sortedIndex)}
                            onDragOver={(e) => handleDragOver(e, sortedIndex)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, sortedIndex)}
                            onDragEnd={handleDragEnd}
                            sx={{
                              cursor: 'move',
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: 4
                              }
                            }}
                          >
                            <FormFieldEditor
                              field={field}
                              onSave={(updatedField) => handleFieldSave(originalIndex, updatedField)}
                              onDelete={() => handleFieldDelete(originalIndex)}
                              availableBitrixFields={bitrixFields}
                              isDraggable={true}
                              allFields={fields}
                            />
                          </Box>
                        </Box>
                      );
                    })}
                </Stack>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Кнопка сохранения */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleFormSave}
          disabled={saving || autoSaving || !formData.name || !formData.title}
          size="large"
          sx={{ minWidth: 200 }}
        >
          {saving ? 'Сохранение...' : 'Сохранить форму'}
        </Button>
      </Box>

      {/* Уведомления */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setShowSuccess(false)} 
          severity="success" 
          variant="filled"
          icon={<AutoSaveIcon />}
        >
          Форма успешно сохранена!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FormEditor;
