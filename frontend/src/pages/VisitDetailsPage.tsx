import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Button,
  IconButton,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  Fab,
  Snackbar,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Collapse,
  SelectChangeEvent,
  alpha,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  Save as SaveIcon,
  Business as BusinessIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationOnIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  visitService,
  VisitDetails,
  VisitInput,
  VisitStatus,
  visitStatusDisplayNames,
} from '../services/visitService';
import { api } from '../services/api';

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

// Status color dot mapping (landing palette)
const statusDotColors: Record<string, string> = {
  planned: '#2563EB',     // Blue-600
  in_progress: '#F59E0B', // Amber-500
  completed: '#059669',   // Emerald-600
  cancelled: '#78716C',   // Stone-500
  failed: '#EF4444',      // Red-500
};

// --------------- Component ---------------

export const VisitDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [companyInfoOpen, setCompanyInfoOpen] = useState(false);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Form state: status + template custom field values
  const [status, setStatus] = useState<string>('planned');
  const [customValues, setCustomValues] = useState<Record<string, any>>({});

  // --------------- Queries ---------------

  const {
    data: visit,
    isLoading,
    error,
  } = useQuery<VisitDetails>({
    queryKey: ['visit', id],
    queryFn: () => visitService.getVisit(Number(id)),
    enabled: !!id,
    retry: 1,
  });

  const { data: formTemplate, isLoading: isLoadingTemplate } = useQuery<VisitFormTemplate>(
    ['visitFormTemplate'],
    async () => {
      const res = await api.get('/visit-form/');
      return res.data;
    },
    { staleTime: 300000 }
  );

  // --------------- Initialize form from visit data ---------------

  useEffect(() => {
    if (!visit || !formTemplate) return;

    setStatus(visit.status || 'planned');

    // Pre-fill customValues from visit data
    const values: Record<string, any> = {};
    const df = visit.dynamic_fields || {};

    for (const field of formTemplate.fields) {
      const key = field.key;
      // Check top-level visit properties first, then dynamic_fields
      if (key === 'visit_type') {
        values[key] = visit.visit_type || df[key] || '';
      } else if (key === 'comment') {
        values[key] = visit.comment || df[key] || '';
      } else if (key === 'with_distributor') {
        values[key] = visit.with_distributor ?? df[key] ?? false;
      } else {
        // Custom / dynamic fields
        values[key] = df[key] ?? '';
      }
    }

    setCustomValues(values);
  }, [visit, formTemplate]);

  // --------------- Mutations ---------------

  const updateVisitMutation = useMutation({
    mutationFn: (visitData: VisitInput) =>
      visitService.updateVisit(Number(id), visitData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit', id] });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      setSnackbar({ open: true, message: 'Визит сохранен', severity: 'success' });
      setIsSaving(false);
    },
    onError: (error: any) => {
      let message = 'Ошибка при обновлении визита';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'object' && detail !== null) {
          if (Array.isArray(detail)) {
            message = detail
              .map((err: any) => (typeof err === 'string' ? err : err.msg || JSON.stringify(err)))
              .join(', ');
          } else if (detail.msg) {
            message = detail.msg;
          } else {
            try { message = JSON.stringify(detail); } catch { message = 'Ошибка валидации'; }
          }
        } else if (typeof detail === 'string') {
          message = detail;
        }
      }
      setFormError(message);
      setSnackbar({ open: true, message, severity: 'error' });
      setIsSaving(false);
    },
  });

  // --------------- Handlers ---------------

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomValues((prev) => ({ ...prev, [key]: value }));
  };

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const timezoneOffset = -date.getTimezoneOffset();
    const offsetHours = String(Math.floor(Math.abs(timezoneOffset) / 60)).padStart(2, '0');
    const offsetMinutes = String(Math.abs(timezoneOffset) % 60).padStart(2, '0');
    const offsetSign = timezoneOffset >= 0 ? '+' : '-';
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
  };

  const handleSave = () => {
    if (!visit || !id) return;

    // Validate required template fields
    if (formTemplate?.fields) {
      for (const field of formTemplate.fields) {
        if (field.required) {
          const val = customValues[field.key];
          if (val === undefined || val === null || val === '') {
            setFormError(`Поле "${field.label}" обязательно для заполнения`);
            return;
          }
        }
      }
    }

    setIsSaving(true);
    setFormError(null);

    const dynamicFields: Record<string, any> = { ...(visit.dynamic_fields || {}) };

    // Merge custom values into dynamic_fields + extract top-level props
    const visitData: VisitInput = {
      company_id: visit.company_id,
      doctor_ids: visit.doctors?.map((d) => d.id) || [],
      date: visit.date ? formatLocalDate(new Date(visit.date)) : formatLocalDate(new Date()),
      status: status as VisitStatus,
    };

    if (formTemplate?.fields) {
      for (const field of formTemplate.fields) {
        const val = customValues[field.key];
        if (val !== undefined && val !== null) {
          dynamicFields[field.key] = val;

          // Map well-known keys to top-level visit properties
          if (field.key === 'visit_type') {
            visitData.visit_type = val;
          } else if (field.key === 'comment') {
            visitData.comment = val;
          } else if (field.key === 'with_distributor') {
            visitData.with_distributor = !!val;
          }
        }
      }
    }

    // Keep date in dynamic_fields too
    dynamicFields['date'] = visitData.date;
    if (dynamicFields['1732026990932'] !== undefined) {
      dynamicFields['1732026990932'] = visitData.date;
    }
    if (dynamicFields['1732026275473'] !== undefined) {
      dynamicFields['1732026275473'] = visitData.date;
    }

    visitData.dynamic_fields = dynamicFields;

    updateVisitMutation.mutate(visitData);
  };

  // --------------- Address helper ---------------

  const getClinicAddress = (company: any): string => {
    if (!company) return '';
    if (company.address && typeof company.address === 'string' && company.address.trim() !== '') {
      return company.address;
    }
    if (company.dynamic_fields && typeof company.dynamic_fields === 'object') {
      // Ищем адрес по семантическому ключу и UF_CRM_ полям с адресными данными
      const addressKeys = ['address', 'ADDRESS', ...Object.keys(company.dynamic_fields).filter(k => k.toLowerCase().includes('address'))];
      for (const k of addressKeys) {
        if (company.dynamic_fields[k] && typeof company.dynamic_fields[k] === 'string' && company.dynamic_fields[k].trim() !== '') {
          return company.dynamic_fields[k];
        }
      }
      const keys = Object.keys(company.dynamic_fields);
      const addrKey = keys.find((k) => k.toLowerCase().includes('address') || k.toLowerCase().includes('адрес'));
      if (addrKey && typeof company.dynamic_fields[addrKey] === 'string') {
        return company.dynamic_fields[addrKey];
      }
    }
    return '';
  };

  // --------------- Render ---------------

  if (isLoading || isLoadingTemplate) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        sx={{ height: 'calc(100vh - 120px)', minHeight: 300 }}
      >
        <CircularProgress size={40} thickness={4} />
        <Typography variant="h6" mt={3} color="text.secondary" fontWeight={500}>
          Загрузка визита...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ borderRadius: 3, mb: 2 }}>
          Ошибка при загрузке данных визита.
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/visits')} startIcon={<ChevronLeftIcon />}>
          Вернуться к визитам
        </Button>
      </Box>
    );
  }

  if (!visit) {
    return (
      <Box p={3}>
        <Alert severity="warning" sx={{ borderRadius: 3, mb: 2 }}>
          Визит не найден
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/visits')} startIcon={<ChevronLeftIcon />}>
          Вернуться к визитам
        </Button>
      </Box>
    );
  }

  const templateFields = formTemplate?.fields || [];
  const companyAddress = getClinicAddress(visit.company);
  const contacts = visit.company?.contacts || [];

  return (
    <Box sx={{ pb: 12, minHeight: '100%', bgcolor: 'background.default' }}>
      {/* Sticky Header */}
      <Box
        sx={{
          px: 1,
          pt: 1,
          pb: 1,
          display: 'flex',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          bgcolor: alpha(theme.palette.background.paper, 0.85),
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: `0 0.5px 0 ${theme.palette.divider}`,
          mb: 2,
          alignItems: 'center',
        }}
      >
        <IconButton onClick={() => navigate('/visits')} sx={{ color: 'primary.main' }}>
          <ChevronLeftIcon fontSize="large" />
        </IconButton>
        <Typography variant="h6" component="h1" noWrap sx={{ fontWeight: 600, flexGrow: 1 }}>
          Редактирование визита
        </Typography>
        {/* Desktop save button in header */}
        {!isMobile && (
          <Button
            variant="contained"
            startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={isSaving}
            sx={{ borderRadius: 3, minWidth: 140, px: 3 }}
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        )}
      </Box>

      <Box sx={{ px: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
        {formError && (
          <Alert severity="error" onClose={() => setFormError(null)} sx={{ mb: 2, borderRadius: 3 }}>
            {formError}
          </Alert>
        )}

        {/* ====== Card 1: Visit Header ====== */}
        <Card
          sx={{
            mb: 2,
            borderRadius: '20px',
            border: 'none',
            boxShadow: theme.palette.mode === 'light'
              ? '0 2px 10px rgba(0,0,0,0.04)'
              : '0 2px 10px rgba(0,0,0,0.3)',
          }}
        >
          <CardContent sx={{ p: { xs: 2, md: 3 }, '&:last-child': { pb: { xs: 2, md: 3 } } }}>
            {/* Company name as link */}
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                cursor: 'pointer',
                mb: 1,
                '&:hover': { textDecoration: 'underline' },
              }}
              onClick={() => navigate(`/companies/${visit.company.id}/edit`)}
            >
              {visit.company.name}
            </Typography>

            {/* Date */}
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {new Date(visit.date).toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Typography>

            {/* Status selector */}
            <FormControl fullWidth size="small">
              <InputLabel>Статус</InputLabel>
              <Select
                label="Статус"
                value={status}
                onChange={(e: SelectChangeEvent) => setStatus(e.target.value)}
                sx={{ borderRadius: '16px' }}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: statusDotColors[selected] || '#8E8E93',
                        flexShrink: 0,
                      }}
                    />
                    {visitStatusDisplayNames[selected as VisitStatus] || selected}
                  </Box>
                )}
              >
                {[
                  { value: 'planned', label: 'Запланирован' },
                  { value: 'in_progress', label: 'В работе' },
                  { value: 'completed', label: 'Завершен' },
                  { value: 'cancelled', label: 'Отменен' },
                ].map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: statusDotColors[opt.value] || '#8E8E93',
                          flexShrink: 0,
                        }}
                      />
                      {opt.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        {/* ====== Card 2: Visit Form (template-driven) ====== */}
        <Card
          sx={{
            mb: 2,
            borderRadius: '20px',
            border: 'none',
            boxShadow: theme.palette.mode === 'light'
              ? '0 2px 10px rgba(0,0,0,0.04)'
              : '0 2px 10px rgba(0,0,0,0.3)',
          }}
        >
          <CardContent sx={{ p: { xs: 2, md: 3 }, '&:last-child': { pb: { xs: 2, md: 3 } } }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Данные визита
            </Typography>

            {templateFields.length > 0 ? (
              <Grid container spacing={2}>
                {templateFields.map((field) => (
                  <Grid item xs={12} md={6} key={field.key}>
                    {renderTemplateField(field, customValues[field.key], handleCustomFieldChange)}
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Шаблон формы не настроен. Настройте его в разделе администрирования.
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* ====== Card 3: Company Info (collapsible) ====== */}
        <Card
          sx={{
            mb: 2,
            borderRadius: '20px',
            border: 'none',
            boxShadow: theme.palette.mode === 'light'
              ? '0 2px 10px rgba(0,0,0,0.04)'
              : '0 2px 10px rgba(0,0,0,0.3)',
          }}
        >
          <CardContent sx={{ p: 0 }}>
            {/* Collapsible header */}
            <Box
              onClick={() => setCompanyInfoOpen(!companyInfoOpen)}
              sx={{
                px: { xs: 2, md: 3 },
                py: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                },
                borderRadius: companyInfoOpen ? '20px 20px 0 0' : '20px',
                transition: 'background-color 0.2s',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Информация о компании
                </Typography>
              </Box>
              {companyInfoOpen ? (
                <ExpandLessIcon sx={{ color: 'text.secondary' }} />
              ) : (
                <ExpandMoreIcon sx={{ color: 'text.secondary' }} />
              )}
            </Box>

            <Collapse in={companyInfoOpen}>
              <Box sx={{ px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 } }}>
                {/* Company name */}
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  {visit.company.name}
                </Typography>

                {/* Address */}
                {companyAddress && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
                    <LocationOnIcon fontSize="small" sx={{ color: 'text.secondary', mt: 0.3 }} />
                    <Typography variant="body2" color="text.secondary">
                      {companyAddress}
                      {visit.company.city ? `, г. ${visit.company.city}` : ''}
                    </Typography>
                  </Box>
                )}

                {/* INN */}
                {(visit.company.inn || visit.company.dynamic_fields?.inn) && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    ИНН: {visit.company.inn || visit.company.dynamic_fields?.inn}
                  </Typography>
                )}

                {/* Contacts */}
                {contacts.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Контакты
                    </Typography>
                    {contacts.map((contact) => (
                      <Box
                        key={contact.id}
                        sx={{
                          p: 1.5,
                          mb: 1,
                          bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.4 : 1),
                          borderRadius: 3,
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {contact.name}
                        </Typography>
                        {contact.position && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            {contact.position}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 0.5 }}>
                          {contact.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PhoneIcon fontSize="small" sx={{ color: 'primary.main', fontSize: 16 }} />
                              <Typography
                                variant="caption"
                                component="a"
                                href={`tel:${contact.phone}`}
                                sx={{ textDecoration: 'none', color: 'primary.main' }}
                              >
                                {contact.phone}
                              </Typography>
                            </Box>
                          )}
                          {contact.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <EmailIcon fontSize="small" sx={{ color: 'primary.main', fontSize: 16 }} />
                              <Typography
                                variant="caption"
                                component="a"
                                href={`mailto:${contact.email}`}
                                sx={{ textDecoration: 'none', color: 'primary.main' }}
                              >
                                {contact.email}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Edit company link */}
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/companies/${visit.company.id}/edit`)}
                  size="small"
                  sx={{ mt: 2, borderRadius: 3, textTransform: 'none' }}
                >
                  Редактировать компанию
                </Button>
              </Box>
            </Collapse>
          </CardContent>
        </Card>

        {/* Desktop save at bottom */}
        {!isMobile && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/visits')}
              sx={{ borderRadius: 3 }}
            >
              Отмена
            </Button>
            <Button
              variant="contained"
              startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={isSaving}
              sx={{ borderRadius: 3, minWidth: 160 }}
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </Box>
        )}
      </Box>

      {/* Mobile FAB */}
      {isMobile && (
        <Fab
          color="primary"
          onClick={handleSave}
          disabled={isSaving}
          sx={{
            position: 'fixed',
            bottom: 84,
            right: 20,
            zIndex: 1000,
          }}
        >
          {isSaving ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
        </Fab>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 3 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// --------------- Template field renderer ---------------

function renderTemplateField(
  field: FieldDefinition,
  value: any,
  onChange: (key: string, value: any) => void
) {
  switch (field.type) {
    case 'text':
      return (
        <TextField
          fullWidth
          label={field.label}
          required={field.required}
          size="small"
          value={value || ''}
          onChange={(e) => onChange(field.key, e.target.value)}
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
          value={value || ''}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );
    case 'select':
      return (
        <FormControl fullWidth size="small" required={field.required}>
          <InputLabel>{field.label}</InputLabel>
          <Select
            label={field.label}
            value={value || ''}
            onChange={(e: SelectChangeEvent) => onChange(field.key, e.target.value)}
          >
            {(field.options || []).map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    case 'checkbox':
      return (
        <FormControlLabel
          control={
            <Switch
              checked={!!value}
              onChange={(e) => onChange(field.key, e.target.checked)}
            />
          }
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
          value={value || ''}
          onChange={(e) => onChange(field.key, e.target.value)}
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
          value={value ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );
    default:
      return (
        <TextField
          fullWidth
          label={field.label}
          size="small"
          value={value || ''}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );
  }
}
