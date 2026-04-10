import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Snackbar,
  Grid,
  Chip,
  Paper,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  SelectChangeEvent,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Save as SaveIcon,
  Visibility as PreviewIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

// --------------- Types ---------------

interface FieldDefinition {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface VisitFormTemplate {
  id?: number;
  organization_id?: number;
  fields: FieldDefinition[];
}

const FIELD_TYPES = [
  { value: 'text', label: 'Текст' },
  { value: 'textarea', label: 'Многострочный текст' },
  { value: 'select', label: 'Выпадающий список' },
  { value: 'checkbox', label: 'Чекбокс' },
  { value: 'date', label: 'Дата' },
  { value: 'number', label: 'Число' },
];

function generateKey(label: string): string {
  // Transliterate Cyrillic to Latin
  const translitMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  };

  return label
    .toLowerCase()
    .split('')
    .map(ch => translitMap[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    || `field_${Date.now()}`;
}

// --------------- Component ---------------

export const VisitFormEditorPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();

  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // New field state
  const [newField, setNewField] = useState<FieldDefinition>({
    key: '',
    label: '',
    type: 'text',
    required: false,
    options: [],
  });
  const [newOption, setNewOption] = useState('');

  // --------------- API calls ---------------

  const { isLoading } = useQuery<VisitFormTemplate>(
    ['visitFormTemplate'],
    async () => {
      const res = await api.get('/visit-form/');
      return res.data;
    },
    {
      onSuccess: (data) => {
        setFields(data.fields || []);
      },
    }
  );

  const saveMutation = useMutation(
    async (fieldsData: FieldDefinition[]) => {
      const res = await api.put('/visit-form/', { fields: fieldsData });
      return res.data;
    },
    {
      onSuccess: () => {
        setHasChanges(false);
        queryClient.invalidateQueries(['visitFormTemplate']);
        setSnackbar({ open: true, message: 'Шаблон формы сохранен', severity: 'success' });
      },
      onError: () => {
        setSnackbar({ open: true, message: 'Ошибка при сохранении шаблона', severity: 'error' });
      },
    }
  );

  // --------------- Field operations ---------------

  const markChanged = useCallback(() => setHasChanges(true), []);

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const updated = [...fields];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setFields(updated);
    markChanged();
  };

  const removeField = (index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
    markChanged();
  };

  const updateField = (index: number, patch: Partial<FieldDefinition>) => {
    setFields(prev => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
    markChanged();
  };

  const handleAddField = () => {
    if (!newField.label.trim()) return;

    const key = newField.key || generateKey(newField.label);
    // Ensure unique key
    const existing = fields.map(f => f.key);
    let finalKey = key;
    let counter = 1;
    while (existing.includes(finalKey)) {
      finalKey = `${key}_${counter}`;
      counter++;
    }

    const field: FieldDefinition = {
      key: finalKey,
      label: newField.label.trim(),
      type: newField.type,
      required: newField.required,
    };
    if (newField.type === 'select' && newField.options && newField.options.length > 0) {
      field.options = [...newField.options];
    }

    setFields(prev => [...prev, field]);
    markChanged();
    setAddDialogOpen(false);
    resetNewField();
  };

  const resetNewField = () => {
    setNewField({ key: '', label: '', type: 'text', required: false, options: [] });
    setNewOption('');
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    setNewField(prev => ({
      ...prev,
      options: [...(prev.options || []), newOption.trim()],
    }));
    setNewOption('');
  };

  const removeOption = (idx: number) => {
    setNewField(prev => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== idx),
    }));
  };

  // --------------- Render ---------------

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 10, minHeight: '100%', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          pt: 2,
          pb: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          bgcolor: 'background.paper',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          mb: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Редактор формы визита
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PreviewIcon />}
            onClick={() => setPreviewOpen(true)}
          >
            {isMobile ? '' : 'Просмотр'}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<SaveIcon />}
            onClick={() => saveMutation.mutate(fields)}
            disabled={!hasChanges || saveMutation.isLoading}
          >
            {saveMutation.isLoading ? <CircularProgress size={20} color="inherit" /> : isMobile ? '' : 'Сохранить'}
          </Button>
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
        {hasChanges && (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            Есть несохраненные изменения
          </Alert>
        )}

        {/* Fields list */}
        {fields.length === 0 && (
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 2 }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                Нет полей. Добавьте первое поле для формы визита.
              </Typography>
            </CardContent>
          </Card>
        )}

        {fields.map((field, index) => (
          <Card
            key={field.key}
            variant="outlined"
            sx={{
              borderRadius: 3,
              mb: 1.5,
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DragIcon color="disabled" sx={{ flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                      {field.label}
                    </Typography>
                    <Chip
                      label={FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                    {field.required && (
                      <Chip label="Обязательное" size="small" color="error" variant="outlined" />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    key: {field.key}
                    {field.type === 'select' && field.options && field.options.length > 0 && (
                      <> | Варианты: {field.options.join(', ')}</>
                    )}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexShrink: 0 }}>
                  <IconButton
                    size="small"
                    disabled={index === 0}
                    onClick={() => moveField(index, 'up')}
                  >
                    <ArrowUpIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={index === fields.length - 1}
                    onClick={() => moveField(index, 'down')}
                  >
                    <ArrowDownIcon fontSize="small" />
                  </IconButton>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={field.required}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                      />
                    }
                    label=""
                    sx={{ ml: 0.5, mr: 0 }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeField(index)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}

        {/* Add field button */}
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            resetNewField();
            setAddDialogOpen(true);
          }}
          sx={{
            borderRadius: 3,
            borderStyle: 'dashed',
            py: 1.5,
            mt: 1,
          }}
        >
          Добавить поле
        </Button>
      </Box>

      {/* Add field dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Новое поле</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Название поля"
                value={newField.label}
                onChange={(e) =>
                  setNewField(prev => ({
                    ...prev,
                    label: e.target.value,
                    key: generateKey(e.target.value),
                  }))
                }
                placeholder="Например: Результат визита"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ключ (key)"
                value={newField.key}
                onChange={(e) =>
                  setNewField(prev => ({ ...prev, key: e.target.value }))
                }
                helperText="Уникальный идентификатор поля (генерируется автоматически)"
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Тип поля</InputLabel>
                <Select
                  value={newField.type}
                  label="Тип поля"
                  onChange={(e: SelectChangeEvent) =>
                    setNewField(prev => ({ ...prev, type: e.target.value }))
                  }
                >
                  {FIELD_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newField.required}
                    onChange={(e) =>
                      setNewField(prev => ({ ...prev, required: e.target.checked }))
                    }
                  />
                }
                label="Обязательное поле"
                sx={{ mt: 1 }}
              />
            </Grid>

            {/* Options for select type */}
            {newField.type === 'select' && (
              <Grid item xs={12}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Варианты для выбора
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Новый вариант"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addOption();
                      }
                    }}
                  />
                  <Button variant="outlined" size="small" onClick={addOption}>
                    +
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(newField.options || []).map((opt, i) => (
                    <Chip
                      key={i}
                      label={opt}
                      onDelete={() => removeOption(i)}
                      size="small"
                    />
                  ))}
                </Box>
                {(newField.options || []).length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Добавьте хотя бы один вариант
                  </Typography>
                )}
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleAddField}
            disabled={!newField.label.trim() || (newField.type === 'select' && (!newField.options || newField.options.length === 0))}
          >
            Добавить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Предпросмотр формы визита</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {/* Standard fields always present */}
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Стандартные поля (всегда отображаются):
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
              <TextField
                fullWidth
                label="Компания"
                disabled
                value="Компания ABC"
                size="small"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Дата визита"
                type="date"
                disabled
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Paper>

            {fields.length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Настраиваемые поля:
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Grid container spacing={2}>
                    {fields.map((field) => (
                      <Grid item xs={12} key={field.key}>
                        {renderPreviewField(field)}
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </>
            )}

            {fields.length === 0 && (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Нет настраиваемых полей. Форма будет содержать только стандартные поля.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// --------------- Preview field renderer ---------------

function renderPreviewField(field: FieldDefinition) {
  switch (field.type) {
    case 'text':
      return (
        <TextField
          fullWidth
          label={field.label}
          required={field.required}
          size="small"
          disabled
        />
      );
    case 'textarea':
      return (
        <TextField
          fullWidth
          label={field.label}
          required={field.required}
          size="small"
          multiline
          rows={3}
          disabled
        />
      );
    case 'select':
      return (
        <FormControl fullWidth size="small" required={field.required} disabled>
          <InputLabel>{field.label}</InputLabel>
          <Select label={field.label} value="">
            {(field.options || []).map(opt => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    case 'checkbox':
      return (
        <FormControlLabel
          control={<Switch disabled />}
          label={field.label}
        />
      );
    case 'date':
      return (
        <TextField
          fullWidth
          label={field.label}
          type="date"
          required={field.required}
          size="small"
          InputLabelProps={{ shrink: true }}
          disabled
        />
      );
    case 'number':
      return (
        <TextField
          fullWidth
          label={field.label}
          type="number"
          required={field.required}
          size="small"
          disabled
        />
      );
    default:
      return (
        <TextField
          fullWidth
          label={field.label}
          size="small"
          disabled
        />
      );
  }
}

export default VisitFormEditorPage;
