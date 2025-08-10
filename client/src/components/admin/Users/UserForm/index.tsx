import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useUserForm } from './hooks/useUserForm';
import { User } from '../../../../types/user';

interface UserFormProps {
  open: boolean;
  user?: User | null;
  onClose: () => void;
  onSave: (user: User) => void;
}

export const UserForm: React.FC<UserFormProps> = ({
  open,
  user,
  onClose,
  onSave
}) => {
  console.log('🔄 UserForm rendered with props:', { open, user: user?.id || null });
  
  const {
    formData,
    errors,
    loading,
    handleInputChange,
    handleSelectChange,
    handleSwitchChange,
    handleSettingsChange,
    handleSubmit,
    isValid,
    generatePassword
  } = useUserForm(user, onSave, onClose);

  const isEditing = Boolean(user);
  
  console.log('🎭 UserForm state:', { 
    open, 
    isEditing, 
    formData: formData.email || 'empty',
    loading 
  });

  // Дополнительное логирование изменений пропов
  useEffect(() => {
    console.log('🔄 UserForm props changed:', { open, userId: user?.id || null });
  }, [open, user]);

  // Проверка корректности отображения Dialog
  if (open) {
    console.log('✅ Dialog should be visible with open=true');
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown={false}
      keepMounted={true}
      PaperProps={{
        sx: { 
          minHeight: '600px'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon />
            <Typography variant="h6">
              {isEditing ? 'Редактирование пользователя' : 'Новый пользователь'}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {/* Основная информация */}
            <Typography variant="h6" gutterBottom>
              Основная информация
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Email *"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                error={Boolean(errors.email)}
                helperText={errors.email}
                disabled={loading}
              />

              <FormControl fullWidth error={Boolean(errors.role)}>
                <InputLabel>Роль *</InputLabel>
                <Select
                  value={formData.role}
                  label="Роль *"
                  name="role"
                  onChange={handleSelectChange}
                  disabled={loading}
                >
                  <MenuItem value="user">Пользователь</MenuItem>
                  <MenuItem value="admin">Администратор</MenuItem>
                </Select>
                {errors.role && <FormHelperText>{errors.role}</FormHelperText>}
              </FormControl>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Имя"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                error={Boolean(errors.firstName)}
                helperText={errors.firstName}
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Фамилия"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                error={Boolean(errors.lastName)}
                helperText={errors.lastName}
                disabled={loading}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Телефон"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                error={Boolean(errors.phone)}
                helperText={errors.phone}
                disabled={loading}
                placeholder="+7 (900) 123-45-67"
              />

              <TextField
                fullWidth
                label="Битрикс ID"
                name="bitrix_id"
                value={formData.bitrix_id}
                onChange={handleInputChange}
                error={Boolean(errors.bitrix_id)}
                helperText={errors.bitrix_id || 'ID пользователя в Битрикс24'}
                disabled={loading}
              />
            </Stack>

            {/* Пароль */}
            <Divider />
            <Typography variant="h6" gutterBottom>
              Пароль
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label={isEditing ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль *'}
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                error={Boolean(errors.password)}
                helperText={errors.password || 'Минимум 6 символов, должен содержать буквы и цифры'}
                disabled={loading}
                required={!isEditing}
              />

              <Button
                variant="outlined"
                onClick={generatePassword}
                disabled={loading}
                sx={{ minWidth: 150, height: 56 }}
              >
                Сгенерировать
              </Button>
            </Stack>

            {/* Статус (только при редактировании) */}
            {isEditing && (
              <>
                <Divider />
                <Typography variant="h6" gutterBottom>
                  Статус
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.status === 'active'}
                      onChange={handleSwitchChange}
                      name="status"
                      disabled={loading}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">
                        {formData.status === 'active' ? 'Активный' : 'Неактивный'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formData.status === 'active' 
                          ? 'Пользователь может войти в систему' 
                          : 'Пользователь не может войти в систему'
                        }
                      </Typography>
                    </Box>
                  }
                />

                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Настройки
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.settings?.onlyMyCompanies || false}
                      onChange={(e) => handleSettingsChange('onlyMyCompanies', e.target.checked)}
                      name="onlyMyCompanies"
                      disabled={loading}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">
                        Только мои компании
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Показывать в автокомплите только компании, где пользователь является ответственным
                      </Typography>
                    </Box>
                  }
                />
              </>
            )}
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Отмена
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSubmit}
          disabled={loading || !isValid}
        >
          {loading ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 