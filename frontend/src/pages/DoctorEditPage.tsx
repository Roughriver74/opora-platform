import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  TextField,
  Typography,
  Alert,
  Chip,
  IconButton,
  Fab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import SaveIcon from '@mui/icons-material/Save';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import SyncIcon from '@mui/icons-material/Sync';
import SyncProblemIcon from '@mui/icons-material/SyncProblem';
import { doctorService, DoctorCreate, DoctorUpdate } from '../services/doctorService';
import { adminApi, FieldMapping } from '../services/adminApi';

const DoctorEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const isNew = !id || id === 'new';

  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({
    name: '',
    dynamic_fields: {},
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load field mappings
  useEffect(() => {
    const fetchFieldMappings = async () => {
      try {
        const mappings = await adminApi.getFieldMappings();
        setFieldMappings(mappings);
      } catch (error) {
        console.error('Error fetching field mappings:', error);
      }
    };
    fetchFieldMappings();
  }, []);

  // Load doctor data for edit mode
  const { data: doctor, isLoading } = useQuery(
    ['doctor', id],
    () => doctorService.getDoctor(Number(id)),
    {
      enabled: !isNew,
      onSuccess: (data) => {
        setFormValues({
          name: data.name || '',
          dynamic_fields: data.dynamic_fields || {},
        });
      },
    }
  );

  // Create mutation
  const createMutation = useMutation(
    (data: DoctorCreate) => doctorService.createDoctor(data),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['doctors']);
        navigate(`/doctors/${data.id}`);
      },
    }
  );

  // Update mutation
  const updateMutation = useMutation(
    (data: DoctorUpdate) => doctorService.updateDoctor(Number(id), data),
    {
      onSuccess: () => {
        setSaveSuccess(true);
        queryClient.invalidateQueries(['doctor', id]);
        queryClient.invalidateQueries(['doctors']);
        setTimeout(() => setSaveSuccess(false), 3000);
      },
    }
  );

  const handleFieldChange = (field: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleDynamicFieldChange = (field: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      dynamic_fields: {
        ...(prev.dynamic_fields || {}),
        [field]: value,
      },
    }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formValues.name?.trim()) {
      errors.name = 'Имя обязательно';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!validate()) return;

    if (isNew) {
      createMutation.mutate({
        name: formValues.name,
        dynamic_fields: formValues.dynamic_fields || {},
      });
    } else {
      updateMutation.mutate({
        name: formValues.name,
        dynamic_fields: formValues.dynamic_fields || {},
      });
    }
  };

  const renderSyncStatus = () => {
    if (isNew || !doctor) return null;

    const syncStatus = doctor.sync_status;
    const lastSynced = doctor.last_synced
      ? new Date(doctor.last_synced).toLocaleString()
      : 'никогда';

    let statusSx: Record<string, string> = {};
    let statusText = 'Неизвестно';

    switch (syncStatus) {
      case 'synced':
        statusSx = { bgcolor: 'success.main', color: '#fff' };
        statusText = 'Синхронизировано';
        break;
      case 'pending':
        statusSx = { bgcolor: 'warning.main', color: '#fff' };
        statusText = 'Ожидает синхронизации';
        break;
      case 'error':
        statusSx = { bgcolor: 'error.main', color: '#fff' };
        statusText = 'Ошибка синхронизации';
        break;
      default:
        break;
    }

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Chip
          label={statusText}
          size="small"
          icon={syncStatus === 'error' ? <SyncProblemIcon /> : <SyncIcon />}
          sx={{ mr: 1, ...statusSx, '& .MuiChip-icon': { color: 'inherit' } }}
        />
        <Typography variant="caption" color="text.secondary">
          Последняя синхронизация: {lastSynced}
        </Typography>
      </Box>
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const isSaving = createMutation.isLoading || updateMutation.isLoading;

  return (
    <Box sx={{ pb: 10, minHeight: '100%', bgcolor: 'background.default' }}>
      {/* Top Header */}
      <Box
        sx={{
          px: 1,
          pt: 1,
          pb: 1,
          display: 'flex',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          bgcolor: 'background.paper',
          boxShadow: (theme: any) =>
            theme.palette.mode === 'light'
              ? '0 1px 3px rgba(0,0,0,0.05)'
              : '0 1px 3px rgba(0,0,0,0.2)',
          mb: 2,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <IconButton onClick={() => navigate('/doctors')} sx={{ color: 'primary.main' }}>
          <ChevronLeftIcon fontSize="large" />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
          {isNew ? 'Новый специалист' : 'Редактирование специалиста'}
        </Typography>
        {!isMobile && (
          <IconButton
            sx={{ color: 'primary.main', bgcolor: 'action.hover' }}
            onClick={() => handleSubmit()}
            disabled={isSaving}
          >
            {isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
          </IconButton>
        )}
      </Box>

      <Box sx={{ px: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
            Специалист успешно сохранен
          </Alert>
        )}

        {createMutation.isError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            Ошибка при создании специалиста
          </Alert>
        )}

        {updateMutation.isError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            Ошибка при обновлении специалиста
          </Alert>
        )}

        {!isNew && doctor?.bitrix_id ? (
          <Chip
            icon={<LocalHospitalIcon />}
            label={`Bitrix ID: ${doctor.bitrix_id}`}
            variant="filled"
            sx={{
              mb: 2,
              bgcolor: 'primary.light',
              color: 'primary.dark',
              fontWeight: 500,
              '& .MuiChip-icon': { color: 'primary.dark' },
            }}
          />
        ) : !isNew ? (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            Этот специалист еще не синхронизирован
          </Alert>
        ) : null}

        {renderSyncStatus()}

        <Card
          variant="outlined"
          sx={{
            borderRadius: 3,
            border: 'none',
            boxShadow: (theme: any) =>
              theme.palette.mode === 'light'
                ? '0 2px 8px rgba(0,0,0,0.04)'
                : '0 2px 8px rgba(0,0,0,0.2)',
            mb: 3,
          }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Основная информация
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Имя специалиста"
                  value={formValues.name || ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  required
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Dynamic fields from field mappings */}
        {fieldMappings.filter((m) => m.entity_type === 'doctor').length > 0 && (
          <Card
            variant="outlined"
            sx={{
              borderRadius: 3,
              border: 'none',
              boxShadow: (theme: any) =>
                theme.palette.mode === 'light'
                  ? '0 2px 8px rgba(0,0,0,0.04)'
                  : '0 2px 8px rgba(0,0,0,0.2)',
              mb: 3,
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Дополнительная информация
              </Typography>
              <Grid container spacing={3}>
                {fieldMappings
                  .filter((mapping) => mapping.entity_type === 'doctor')
                  .map((mapping) => {
                    const fieldId = mapping.bitrix_field_id.toLowerCase();
                    const fieldValue =
                      formValues.dynamic_fields?.[fieldId] !== undefined
                        ? formValues.dynamic_fields[fieldId]
                        : '';

                    return (
                      <Grid item xs={12} md={6} key={fieldId}>
                        <TextField
                          fullWidth
                          label={mapping.display_name || fieldId}
                          value={fieldValue}
                          onChange={(e) =>
                            handleDynamicFieldChange(fieldId, e.target.value)
                          }
                        />
                      </Grid>
                    );
                  })}
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Floating Save Button (mobile) */}
      {isMobile && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
          onClick={() => handleSubmit()}
          disabled={isSaving}
        >
          {isSaving ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
        </Fab>
      )}
    </Box>
  );
};

export default DoctorEditPage;
