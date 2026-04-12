import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  TextField,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CleaningServices,
  Build,
  FactCheck,
  Store,
  EditNote,
  CheckCircle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  onboardingService,
  TemplateInfo,
  SetupResponse,
} from '../services/onboardingService';

const ICON_MAP: Record<string, React.ReactElement> = {
  cleaning_services: <CleaningServices sx={{ fontSize: 48 }} />,
  build: <Build sx={{ fontSize: 48 }} />,
  fact_check: <FactCheck sx={{ fontSize: 48 }} />,
  store: <Store sx={{ fontSize: 48 }} />,
  edit_note: <EditNote sx={{ fontSize: 48 }} />,
};

const TEAM_SIZES = ['1-5', '6-20', '21-50', '50+'];

const steps = ['Название компании', 'Тип бизнеса', 'Размер команды', 'Готово!'];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [companyName, setCompanyName] = useState('');
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [teamSize, setTeamSize] = useState<string | null>(null);
  const [result, setResult] = useState<SetupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onboardingService.getTemplates().then(setTemplates).catch(console.error);
  }, []);

  const handleNext = async () => {
    if (activeStep === 2 && selectedTemplate && teamSize) {
      setLoading(true);
      setError(null);
      try {
        const res = await onboardingService.setup({
          template_id: selectedTemplate,
          company_name: companyName,
          team_size: teamSize,
        });
        setResult(res);
        setActiveStep(3);
      } catch (e: any) {
        setError(e.response?.data?.detail || 'Ошибка при настройке');
      } finally {
        setLoading(false);
      }
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const canProceed = () => {
    if (activeStep === 0) return companyName.trim().length > 0;
    if (activeStep === 1) return selectedTemplate !== null;
    if (activeStep === 2) return teamSize !== null;
    return false;
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4, px: 2 }}>
      <Typography variant="h4" gutterBottom align="center">
        Настройка ОПОРА
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Шаг 1: Название компании */}
      {activeStep === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Как называется ваша компания?
          </Typography>
          <TextField
            fullWidth
            label="Название компании"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            autoFocus
            sx={{ mb: 3 }}
          />
        </Box>
      )}

      {/* Шаг 2: Выбор шаблона */}
      {activeStep === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Чем занимается ваша команда?
          </Typography>
          <Grid container spacing={2}>
            {templates.map((t) => (
              <Grid item xs={6} key={t.id}>
                <Card
                  variant={selectedTemplate === t.id ? 'elevation' : 'outlined'}
                  sx={{
                    border: selectedTemplate === t.id ? 2 : 1,
                    borderColor:
                      selectedTemplate === t.id ? 'primary.main' : 'divider',
                  }}
                >
                  <CardActionArea
                    onClick={() => setSelectedTemplate(t.id)}
                    sx={{ p: 2, textAlign: 'center' }}
                  >
                    {ICON_MAP[t.icon] || <EditNote sx={{ fontSize: 48 }} />}
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {t.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Шаг 3: Размер команды */}
      {activeStep === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Сколько выездных сотрудников?
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
            {TEAM_SIZES.map((size) => (
              <Chip
                key={size}
                label={size}
                clickable
                color={teamSize === size ? 'primary' : 'default'}
                variant={teamSize === size ? 'filled' : 'outlined'}
                onClick={() => setTeamSize(size)}
                sx={{ fontSize: '1.1rem', py: 2.5, px: 1 }}
              />
            ))}
          </Box>
          {teamSize === '50+' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Для команд от 50 человек рекомендуем тариф Pro (399 ₽/чел/мес) или Business (699 ₽/чел/мес).
            </Alert>
          )}
        </Box>
      )}

      {/* Шаг 4: Результат */}
      {activeStep === 3 && result && (
        <Box textAlign="center">
          <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Готово!
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {result.message}
          </Typography>
          <Box sx={{ textAlign: 'left', mb: 3, mx: 'auto', maxWidth: 400 }}>
            <Typography>
              Форма визита: {result.form_fields_count} полей
            </Typography>
            <Typography>
              Чек-лист: {result.checklist_items_count} пунктов
            </Typography>
            <Typography>
              Статусы: {result.statuses.length} этапов
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/visits/new')}
            >
              Создать первый визит
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/admin/user-management')}
            >
              Пригласить сотрудника
            </Button>
          </Box>
        </Box>
      )}

      {/* Навигация */}
      {activeStep < 3 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={() => setActiveStep((prev) => prev - 1)}
          >
            Назад
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canProceed() || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Далее'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
