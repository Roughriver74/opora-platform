import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, FormControlLabel,
  Checkbox, Tab, Tabs, Box, CircularProgress, SelectChangeEvent,
  IconButton, Grid, Card, CardContent, Tooltip, Divider, FormHelperText,
  useMediaQuery, useTheme
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import { styled } from '@mui/material/styles';
import { adminApi, FieldMapping, FieldMappingCreate } from '../../services/adminApi';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';

// Типы данных для маппинга значений списков
interface ValueOption {
  app_value: string;
  bitrix_value: string;
}

// Added helper function to convert datetime values to Moscow timezone
const convertToMoscowTime = (isoString: string): string => {
  const date = new Date(isoString);
  const moscowOffsetInMs = 3 * 60 * 60 * 1000; // Moscow is UTC+3
  return new Date(date.getTime() + moscowOffsetInMs).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
};

interface FormData extends Omit<FieldMappingCreate, 'value_options'> {
  value_options_array?: ValueOption[];
  value_options?: string;
  description?: string;
  show_in_visit?: boolean;
  section?: string;
  sort_order?: number;
  is_multiple?: boolean;
  composite_field1_name?: string;
  composite_field2_name?: string;
  composite_separator?: string;
  composite_settings?: {
    fields: {
      id: string;
      type: string;
    }[];
  };
}

const entityTypes = ["visit", "clinic", "doctor", "network_clinic"];

const entityTypeLabels: Record<string, string> = {
  visit: "Визиты",
  clinic: "Компании",
  doctor: "Специалисты",
  network_clinic: "Филиалы",
};
const fieldTypes = [
  'string',
  'number',
  'date',
  'datetime',
  'boolean',
  'list',
  'enum',
  'address',
  'crm_multifield',
  'composite'
];

const mapBitrixTypeToAppType = (bitrixType: string, fieldId?: string): string => {
  // Определяем адресные поля по семантике, без хардкода ID
  if (fieldId && (
    fieldId.toLowerCase().includes('address') ||
    fieldId.toLowerCase().includes('адрес')
  )) {
    return 'address';
  }
  const typeMap: Record<string, string> = {
    'string': 'string',
    'integer': 'number',
    'double': 'number',
    'datetime': 'datetime',
    'date': 'date',
    'boolean': 'boolean',
    'address': 'address',
    'enumeration': 'list',
    'crm_status': 'list',
    'crm_company': 'number',
    'crm_contact': 'number',
    'user': 'number'
  };
  return typeMap[bitrixType] || 'string';
};

const StyledContainer = styled(Container)(({ theme }) => ({
  flexGrow: 1,
  backgroundColor: theme.palette.background.paper,
  marginTop: theme.spacing(3),
  padding: theme.spacing(2),
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(3),
  },
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(3),
}));

const StyledTableContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  overflowX: 'auto',
  width: '100%',
}));

const ActionButton = styled(Button)(({ theme }) => ({
  marginRight: theme.spacing(1),
  whiteSpace: 'nowrap',
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
  minWidth: '100%',
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const AddButton = styled(Button)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const FieldMappingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [tab, setTab] = useState("visit");
  const [openDialog, setOpenDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    entity_type: "visit",
    app_field_name: "",
    bitrix_field_id: "",
    field_type: "string",
    is_required: false,
    display_name: "",
    show_in_card: false,
    show_in_visit: false,
    section: "",
    value_options_array: []
  });

  const { data: mappings, isLoading, error: mappingsError } = useQuery<FieldMapping[]>(
    ['fieldMappings', tab],
    () => adminApi.getFieldMappings(tab),
    {
      onError: (error: any) => {
        if (error?.response?.status === 401) {
          enqueueSnackbar('Для доступа к админ-панели требуются права администратора', { variant: 'error' });
        } else {
          enqueueSnackbar('Ошибка загрузки данных: ' + (error?.message || 'неизвестная ошибка'), { variant: 'error' });
        }
      },
      retry: false
    }
  );

  const getFieldListValuesMutation = useMutation(
    (params: { entityType: string, fieldId: string }) => {
      switch (params.entityType) {
        case 'visit':
          return adminApi.getBitrixSmartProcessFieldValues(1054, params.fieldId);
        case 'clinic':
          return adminApi.getBitrixCompanyFieldValues(params.fieldId);
        case 'doctor':
          return adminApi.getBitrixDoctorFields();
        default:
          throw new Error(`Неизвестный тип сущности: ${params.entityType}`);
      }
    },
    {
      onSuccess: (data) => {
        if (data && data.items && Array.isArray(data.items)) {
          data.items = data.items.map((item: any) => {
            if (item.field_type === 'datetime' && item.value) {
              return { ...item, value: convertToMoscowTime(item.value) };
            }
            return item;
          });
        }
        if (data?.items && Array.isArray(data.items)) {
          const valueOptionsArray = data.items.map((item: any) => ({
            app_value: item.VALUE,
            bitrix_value: item.ID
          }));
          setFormData({
            ...formData,
            value_options_array: valueOptionsArray
          });
          enqueueSnackbar('Списочные значения получены', { variant: 'success' });
        } else {
          enqueueSnackbar('Поле не содержит списочных значений', { variant: 'info' });
        }
      },
      onError: (error: unknown) => {
        enqueueSnackbar('Ошибка при получении списочных значений', { variant: 'error' });
      }
    }
  );

  const createMutation = useMutation(
    (data: FieldMappingCreate) => adminApi.createFieldMapping(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['fieldMappings', tab]);
        handleCloseDialog();
        enqueueSnackbar('Маппинг поля успешно создан', { variant: 'success' });
      },
      onError: (error: unknown) => {
        enqueueSnackbar('Ошибка при создании маппинга', { variant: 'error' });
      }
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: FieldMappingCreate }) =>
      adminApi.updateFieldMapping(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['fieldMappings', tab]);
        handleCloseDialog();
        enqueueSnackbar('Маппинг поля успешно обновлен', { variant: 'success' });
      },
      onError: (error: unknown) => {
        enqueueSnackbar('Ошибка при обновлении маппинга', { variant: 'error' });
      }
    }
  );

  const deleteMutation = useMutation(
    (id: number) => adminApi.deleteFieldMapping(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['fieldMappings', tab]);
        enqueueSnackbar('Маппинг поля успешно удален', { variant: 'success' });
      },
      onError: (error: unknown) => {
        enqueueSnackbar('Ошибка при удалении маппинга', { variant: 'error' });
      }
    }
  );

  const getBitrixFieldsMutation = useMutation(
    (entityType: string) => {
      switch (entityType) {
        case 'visit':
          return adminApi.getBitrixVisitFields();
        case 'clinic':
          return adminApi.getBitrixCompanyFields();
        case 'doctor':
          return adminApi.getBitrixDoctorFields();
        case 'network_clinic':
          return adminApi.getNetworkClinicsFields();
        default:
          throw new Error(`Неизвестный тип сущности: ${entityType}`);
      }
    },
    {
      onSuccess: (data) => {
        enqueueSnackbar('Поля успешно получены из Bitrix24', { variant: 'success' });
        console.log('Полученные поля:', data);
      },
      onError: (error: unknown) => {
        enqueueSnackbar('Ошибка при получении полей из Bitrix24', { variant: 'error' });
      }
    }
  );

  const updateListValuesMutation = useMutation(
    () => adminApi.updateFieldListValues(),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['fieldMappings', tab]);
        enqueueSnackbar('Списочные значения успешно обновлены', { variant: 'success' });
      },
      onError: (error: unknown) => {
        enqueueSnackbar('Ошибка при обновлении списочных значений', { variant: 'error' });
      }
    }
  );

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  };

  const handleGetBitrixFields = () => {
    getBitrixFieldsMutation.mutate(tab);
  };

  const handleUpdateListValues = () => {
    updateListValuesMutation.mutate();
  };

  const handleAddSelectedField = () => {
    if (selectedFieldId && getBitrixFieldsMutation.data) {
      const field = getBitrixFieldsMutation.data.fields[selectedFieldId];
      if (field) {
        const fieldName = selectedFieldId.split('_').pop() || selectedFieldId;
        const appFieldName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const fieldType = mapBitrixTypeToAppType(field.type, selectedFieldId);
        let displayName = field.title || '';
        if (fieldType === 'address' && !displayName.toLowerCase().includes('адрес')) {
          displayName += ' (Адрес)';
        }
        setFormData({
          entity_type: tab,
          app_field_name: appFieldName,
          bitrix_field_id: selectedFieldId,
          field_type: fieldType,
          is_required: field.isRequired || false,
          display_name: displayName,
          show_in_card: false,
          value_options_array: []
        });
        setOpenDialog(true);
        setEditId(null);
        if (fieldType === 'list' || fieldType === 'enum') {
          getFieldListValuesMutation.mutate({
            entityType: tab,
            fieldId: selectedFieldId
          });
        }
      }
    }
  };

  const handleOpenDialog = (mapping?: FieldMapping) => {
    if (mapping) {
      let valueOptionsArray: ValueOption[] = [];
      let compositeField1Name = '';
      let compositeField2Name = '';
      let compositeSeparator = ':';
      if (mapping.value_options) {
        try {
          if (mapping.field_type === 'composite') {
            const compositeSettings = JSON.parse(mapping.value_options);
            compositeField1Name = compositeSettings.field1_name || 'Имя';
            compositeField2Name = compositeSettings.field2_name || 'Значение';
            compositeSeparator = compositeSettings.separator || ':';
          } else {
            valueOptionsArray = JSON.parse(mapping.value_options);
          }
        } catch (e) {
          console.error('Error parsing value_options:', e);
          valueOptionsArray = [];
        }
      }
      setFormData({
        entity_type: mapping.entity_type,
        app_field_name: mapping.app_field_name,
        bitrix_field_id: mapping.bitrix_field_id,
        field_type: mapping.field_type,
        is_required: mapping.is_required,
        display_name: mapping.display_name,
        description: mapping.description || '',
        show_in_card: mapping.show_in_card,
        show_in_visit: mapping.show_in_visit || false,
        section: mapping.section || '',
        is_multiple: mapping.is_multiple || false,
        value_options: mapping.value_options,
        value_options_array: Array.isArray(valueOptionsArray) ? valueOptionsArray : [],
        composite_field1_name: compositeField1Name,
        composite_field2_name: compositeField2Name,
        composite_separator: compositeSeparator,
        sort_order: mapping.sort_order
      });
      setEditId(mapping.id);
    } else {
      setFormData({
        entity_type: tab,
        app_field_name: "",
        bitrix_field_id: "",
        field_type: "string",
        is_required: false,
        display_name: "",
        show_in_card: false,
        show_in_visit: false,
        section: "",
        is_multiple: false,
        value_options_array: [],
        sort_order: 100
      });
      setEditId(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, checked } = e.target as HTMLInputElement & HTMLTextAreaElement;
    setFormData({
      ...formData,
      [name]: (name === 'is_required' || name === 'show_in_card' || name === 'show_in_visit' || name === 'is_multiple') ? checked : value
    });
  };

  const updateCompositeSettings = () => {
    const compositeSettings = {
      field1_name: formData.composite_field1_name || 'Имя',
      field2_name: formData.composite_field2_name || 'Значение',
      separator: formData.composite_separator || ':'
    };
    setFormData({
      ...formData,
      value_options: JSON.stringify(compositeSettings)
    });
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const name = e.target.name as string;
    const value = e.target.value as string;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = () => {
    const submissionData: FieldMappingCreate = {
      entity_type: formData.entity_type,
      app_field_name: formData.app_field_name,
      bitrix_field_id: formData.bitrix_field_id,
      field_type: formData.field_type,
      is_required: formData.is_required,
      display_name: formData.display_name,
      show_in_card: formData.show_in_card,
      show_in_visit: formData.entity_type === 'clinic' ? formData.show_in_visit : undefined,
      section: formData.section,
      sort_order: formData.sort_order ? parseInt(formData.sort_order.toString()) : 100
    };

    if (formData.field_type === 'string' || formData.field_type === 'list' || formData.field_type === 'enum' || formData.field_type === 'composite') {
      submissionData.is_multiple = formData.is_multiple || false;
    }

    if (formData.field_type === 'composite') {
      const compositeSettings = {
        field1_name: formData.composite_field1_name || 'ФИО',
        field2_name: formData.composite_field2_name || 'Инфо',
        separator: formData.composite_separator || ':'
      };
      submissionData.value_options = JSON.stringify(compositeSettings);
    }

    if ((formData.field_type === 'list' || formData.field_type === 'enum') &&
      formData.value_options_array &&
      formData.value_options_array.length > 0) {
      const valueOptionsArray = [...formData.value_options_array];
      submissionData.value_options = JSON.stringify(valueOptionsArray);
    }

    if (editId) {
      updateMutation.mutate({ id: editId, data: submissionData });
    } else {
      createMutation.mutate(submissionData);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить это сопоставление поля?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <StyledContainer maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Маппинг полей
      </Typography>
      <StyledPaper>
        <Typography variant="body1" paragraph>
          Здесь вы можете настроить сопоставление полей между вашим приложением и Bitrix24.
          Это позволит динамически управлять интеграцией без изменения кода приложения.
        </Typography>

        <StyledTabs
          value={tab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          {entityTypes.map(type => (
            <Tab key={type} value={type} label={entityTypeLabels[type] || type} />
          ))}
        </StyledTabs>

        <Grid container spacing={1} sx={{ mt: 2, mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <AddButton
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Добавить новое сопоставление
            </AddButton>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              startIcon={<SyncIcon />}
              onClick={handleGetBitrixFields}
              disabled={getBitrixFieldsMutation.isLoading}
            >
              {getBitrixFieldsMutation.isLoading ? 'Загрузка...' : 'Получить поля из Bitrix24'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              color="primary"
              onClick={handleUpdateListValues}
              disabled={updateListValuesMutation.isLoading}
            >
              {updateListValuesMutation.isLoading ? 'Обновление...' : 'Обновить списочные значения'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => navigate('/admin/user-management')}
            >
              Управление пользователями
            </Button>
          </Grid>
        </Grid>

        {getBitrixFieldsMutation.data && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1">
              Полученные поля из Bitrix24:
            </Typography>
            <Paper sx={{ p: 2, maxHeight: '400px', overflow: 'auto' }}>
              <StyledTableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Идентификатор</TableCell>
                      <TableCell>Название</TableCell>
                      <TableCell>Тип</TableCell>
                      <TableCell>Обязательное</TableCell>
                      <TableCell>Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      const fields = tab === 'visit'
                        ? getBitrixFieldsMutation.data.fields
                        : getBitrixFieldsMutation.data || {};
                      if (fields && typeof fields === 'object') {
                        type FieldType = {
                          title?: string;
                          name?: string;
                          type?: string;
                          isRequired?: boolean;
                          isDeprecated?: boolean;
                          filterLabel?: string;
                        };
                        return Object.entries(fields as Record<string, FieldType>)
                          .filter(([key, field]) => !key.startsWith('_') && (!('isDeprecated' in field) || !field.isDeprecated))
                          .map(([fieldId, field]) => (
                            <TableRow key={fieldId}>
                              <TableCell>{fieldId}</TableCell>
                              <TableCell>
                                {tab !== 'visit' && field.filterLabel
                                  ? field.filterLabel
                                  : (field.title || field.name || fieldId)}
                              </TableCell>
                              <TableCell>{field.type || 'Не указан'}</TableCell>
                              <TableCell>{field.isRequired ? 'Да' : 'Нет'}</TableCell>
                              <TableCell>
                                <Button
                                  size="small"
                                  variant="contained"
                                  sx={{ bgcolor: 'success.main', color: '#fff', '&:hover': { bgcolor: 'success.dark' } }}
                                  onClick={() => {
                                    const fieldName = fieldId.split('_').pop() || fieldId;
                                    const appFieldName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                    const fieldType = mapBitrixTypeToAppType(field.type || '');
                                    const fieldMapping: Partial<FieldMapping> = {
                                      entity_type: tab,
                                      app_field_name: appFieldName,
                                      bitrix_field_id: fieldId,
                                      field_type: fieldType,
                                      is_required: field.isRequired || false,
                                      display_name: field.title || field.name || fieldId,
                                      value_options: '[]'
                                    };
                                    handleOpenDialog(fieldMapping as FieldMapping);
                                    if (fieldType === 'list' || fieldType === 'enum') {
                                      getFieldListValuesMutation.mutate({
                                        entityType: tab,
                                        fieldId: fieldId
                                      });
                                    }
                                  }}
                                >
                                  Добавить
                                </Button>
                              </TableCell>
                            </TableRow>
                          ));
                      }
                      return null;
                    })()}
                  </TableBody>
                </Table>
              </StyledTableContainer>
            </Paper>
          </Box>
        )}

        {isLoading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <StyledTableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Поле в приложении</TableCell>
                  <TableCell>Поле в Bitrix24</TableCell>
                  <TableCell>Название в форме</TableCell>
                  <TableCell>Тип поля</TableCell>
                  <TableCell>Обязательное</TableCell>
                  <TableCell>Раздел</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mappings && mappings.length > 0 ? (
                  mappings.map((mapping: FieldMapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell>{mapping.id}</TableCell>
                      <TableCell>{mapping.app_field_name}</TableCell>
                      <TableCell>{mapping.bitrix_field_id}</TableCell>
                      <TableCell>{mapping.display_name}</TableCell>
                      <TableCell>
                        {mapping.field_type}
                        {(mapping.field_type === 'list' || mapping.field_type === 'enum') && mapping.value_options &&
                          <Tooltip title="Имеет настроенные значения списка">
                            <span> (со значениями)</span>
                          </Tooltip>
                        }
                      </TableCell>
                      <TableCell>{mapping.is_required ? 'Да' : 'Нет'}</TableCell>
                      <TableCell>{mapping.section}</TableCell>
                      <TableCell>
                        <ActionButton
                          variant="outlined"
                          color="primary"
                          onClick={() => handleOpenDialog(mapping)}
                        >
                          Редактировать
                        </ActionButton>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => handleDelete(mapping.id)}
                        >
                          Удалить
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      <Typography variant="body2" color="text.secondary">
                        Настройте маппинг полей для синхронизации с Bitrix24
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </StyledTableContainer>
        )}
      </StyledPaper>

      {/* Диалог добавления/редактирования */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        fullScreen={isMobile}
        fullWidth
        maxWidth={isMobile ? false : 'md'}
      >
        <DialogTitle>
          {editId ? 'Редактировать сопоставление поля' : 'Добавить новое сопоставление поля'}
        </DialogTitle>
        <DialogContent>
          <StyledFormControl>
            <InputLabel id="entity-type-label">Тип сущности</InputLabel>
            <Select
              labelId="entity-type-label"
              name="entity_type"
              value={formData.entity_type}
              onChange={handleSelectChange}
            >
              {entityTypes.map(type => (
                <MenuItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </StyledFormControl>

          <TextField
            label="Имя поля в приложении"
            name="app_field_name"
            value={formData.app_field_name}
            onChange={handleInputChange}
            fullWidth
            sx={{ mt: 2, mb: 2 }}
            helperText="Имя поля в базе данных приложения (например, 'name', 'date', 'status')"
          />

          <TextField
            label="ID поля в Bitrix24"
            name="bitrix_field_id"
            value={formData.bitrix_field_id}
            onChange={handleInputChange}
            fullWidth
            sx={{ mt: 2, mb: 2 }}
            helperText="Идентификатор поля в Bitrix24 (например, 'UF_CRM_123456789')"
          />

          <TextField
            label="Название для отображения"
            name="display_name"
            value={formData.display_name}
            onChange={handleInputChange}
            fullWidth
            sx={{ mt: 2, mb: 2 }}
            helperText="Человекочитаемое название поля для форм"
          />

          <StyledFormControl>
            <InputLabel id="field-type-label">Тип поля</InputLabel>
            <Select
              labelId="field-type-label"
              name="field_type"
              value={formData.field_type}
              onChange={handleSelectChange}
            >
              {fieldTypes.map(type => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
            {formData.field_type === 'address' && (
              <FormHelperText>
                Поля типа "address" будут автоматически очищаться от специальных символов (|;) и отображаться как многострочные поля
              </FormHelperText>
            )}
          </StyledFormControl>

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_required}
                onChange={handleInputChange}
                name="is_required"
                color="primary"
              />
            }
            label="Обязательное поле"
          />

          {(formData.field_type === 'string' || formData.field_type === 'list' || formData.field_type === 'enum') && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.is_multiple === true}
                  onChange={handleInputChange}
                  name="is_multiple"
                  color="primary"
                />
              }
              label="Множественное (разрешить несколько значений)"
            />
          )}

          {formData.field_type === 'composite' && (
            <Card sx={{ mt: 3, mb: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Настройка составного поля
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Укажите названия для двух частей поля и разделитель между ними
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Название первого поля"
                      name="composite_field1_name"
                      value={formData.composite_field1_name || 'ФИО'}
                      onChange={handleInputChange}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Название второго поля"
                      name="composite_field2_name"
                      value={formData.composite_field2_name || 'Инфо'}
                      onChange={handleInputChange}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Разделитель"
                      name="composite_separator"
                      value={formData.composite_separator || ':'}
                      onChange={handleInputChange}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.show_in_card}
                onChange={handleInputChange}
                name="show_in_card"
                color="primary"
              />
            }
            label="Отображать в карточке"
          />

          {formData.entity_type === 'clinic' && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.show_in_visit === true}
                  onChange={handleInputChange}
                  name="show_in_visit"
                  color="primary"
                />
              }
              label="Отображать в визите"
            />
          )}

          <TextField
            label="Описание"
            name="description"
            value={formData.description || ''}
            onChange={handleInputChange}
            fullWidth
            sx={{ mt: 2, mb: 2 }}
            helperText="Подсказка, которая будет отображаться под полем"
          />

          <TextField
            label="Порядок отображения"
            name="sort_order"
            type="number"
            inputProps={{ min: 0, max: 999 }}
            value={formData.sort_order || 100}
            onChange={(e) => {
              const value = e.target.value === '' ? undefined : parseInt(e.target.value);
              setFormData({
                ...formData,
                sort_order: value
              });
            }}
            fullWidth
            sx={{ mt: 2, mb: 2 }}
            helperText="Чем меньше число, тем выше будет отображаться поле (0-999)"
          />

          <TextField
            label="Раздел"
            name="section"
            value={formData.section}
            onChange={handleInputChange}
            fullWidth
            sx={{ mt: 2, mb: 2 }}
            helperText="Раздел, в котором будет отображаться поле"
          />

          {(formData.field_type === 'list' || formData.field_type === 'enum') && (
            <Card sx={{ mt: 3, mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                  <Typography variant="h6" sx={{ mb: { xs: 1, sm: 0 } }}>
                    Настройка значений списка
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    disabled={!formData.entity_type || !formData.bitrix_field_id || getFieldListValuesMutation.isLoading}
                    startIcon={<SyncIcon />}
                    onClick={() => {
                      getFieldListValuesMutation.mutate({
                        entityType: formData.entity_type,
                        fieldId: formData.bitrix_field_id
                      });
                    }}
                  >
                    {getFieldListValuesMutation.isLoading ? 'Загрузка...' : 'Получить значения из Bitrix24'}
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Укажите соответствие между значениями в вашем приложении и значениями в Bitrix24.
                </Typography>
                {getFieldListValuesMutation.isLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                )}
                {formData.value_options_array && formData.value_options_array.map((option, index) => (
                  <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={5}>
                      <TextField
                        label="Значение в приложении"
                        value={option.app_value}
                        onChange={(e) => {
                          const updatedOptions = [...(formData.value_options_array || [])];
                          updatedOptions[index].app_value = e.target.value;
                          setFormData({
                            ...formData,
                            value_options_array: updatedOptions
                          });
                        }}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <TextField
                        label="Значение в Bitrix24"
                        value={option.bitrix_value}
                        onChange={(e) => {
                          const updatedOptions = [...(formData.value_options_array || [])];
                          updatedOptions[index].bitrix_value = e.target.value;
                          setFormData({
                            ...formData,
                            value_options_array: updatedOptions
                          });
                        }}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconButton
                        color="error"
                        onClick={() => {
                          const updatedOptions = [...(formData.value_options_array || [])];
                          updatedOptions.splice(index, 1);
                          setFormData({
                            ...formData,
                            value_options_array: updatedOptions
                          });
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  variant="outlined"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      value_options_array: [
                        ...(formData.value_options_array || []),
                        { app_value: '', bitrix_value: '' }
                      ]
                    });
                  }}
                  fullWidth
                  sx={{ mt: 1 }}
                >
                  Добавить значение
                </Button>
              </CardContent>
            </Card>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Отмена
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            {editId ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>
    </StyledContainer>
  );
};

export default FieldMappingPage;