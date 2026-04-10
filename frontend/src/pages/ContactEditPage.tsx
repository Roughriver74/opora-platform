import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  MultiFieldDisplay,
  prepareDataForBitrix,
  BitrixMultiFieldItem,
} from '../components/MultiFieldDisplay'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Paper,
  IconButton,
  Divider,
  Tooltip,
  Badge,
  Switch,
  FormControlLabel,
  FormHelperText,
  Fab,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { useForm, Controller } from 'react-hook-form'
import { contactService } from '../services/contactService'
import { Contact, ContactUpdate } from '../types/contact'
import { adminApi, FieldMapping } from '../services/adminApi'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import SyncIcon from '@mui/icons-material/Sync'
import SaveIcon from '@mui/icons-material/Save'
import PersonIcon from '@mui/icons-material/Person'
import SyncProblemIcon from '@mui/icons-material/SyncProblem'

// Расширенный интерфейс для данных, получаемых из Bitrix24
interface BitrixContactData {
  bitrix_id: any
  name: string
  contact_type: string
  email: any
  phone: any
  bitrix_data: any
  dynamic_fields: Record<string, any>
  sync_status: string
  last_synced: string
}

const ContactEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // Получаем данные из state при навигации
  const locationState = location.state as {
    bitrixId?: string
    bitrixData?: any
  } | null

  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isBitrixLoading, setIsBitrixLoading] = useState(false)
  const [bitrixTimeout, setBitrixTimeout] = useState(false)
  // Добавляем состояние для блокировки автоматического обновления формы
  const [lockFormUpdate, setLockFormUpdate] = useState(false)
  // Сохраняем последние значения формы для восстановления
  const [lastFormValues, setLastFormValues] = useState<Record<string, any>>({})

  // Синхронизация данных с Bitrix24 только для текущего контакта
  const syncMutation = useMutation(
    async () => {
      if (!id) return null
      setIsBitrixLoading(true)
      setBitrixTimeout(false)

      // Устанавливаем таймаут для долгих запросов
      const timeoutId = setTimeout(() => {
        setBitrixTimeout(true)
      }, 5000) // 5 секунд для уведомления о долгом запросе

      try {
        // Синхронизируем только один контакт с указанным ID
        console.log(`Запрашиваем данные контакта ${id} из Bitrix24`)
        const result = await contactService.getContact(Number(id), true)
        console.log(
          `Синхронизация контакта ${id} с Bitrix24 выполнена успешно`,
          result
        )
        clearTimeout(timeoutId)
        setIsBitrixLoading(false)
        return result
      } catch (error) {
        console.error('Ошибка при синхронизации с Bitrix24:', error)
        clearTimeout(timeoutId)
        setIsBitrixLoading(false)
        throw error
      }
    },
    {
      onSuccess: data => {
        console.log('Данные успешно получены из Bitrix24:', data)
        queryClient.invalidateQueries(['contact', id])
      },
    }
  )

  // Получение данных контакта только для отображения без запроса в БД
  const {
    data: contact,
    isLoading,
    refetch,
  } = useQuery(
    ['contact', id],
    async () => {
      console.log(`Запрос данных контакта с ID: ${id}`)

      // Если есть данные из Bitrix24 в state, используем их
      if (locationState?.bitrixData) {
        console.log(
          'Используем данные из Bitrix24, переданные через state:',
          locationState.bitrixData
        )

        // Создаем объект с данными в формате, ожидаемом компонентом
        const bitrixContact = locationState.bitrixData
        const formattedData: BitrixContactData = {
          bitrix_id: bitrixContact.ID,
          name: `${bitrixContact.NAME || ''} ${bitrixContact.LAST_NAME || ''}`.trim(),
          contact_type: bitrixContact.TYPE_ID || 'LPR',
          email: bitrixContact.EMAIL || [],
          phone: bitrixContact.PHONE || [],
          bitrix_data: bitrixContact,
          dynamic_fields: {},
          sync_status: 'synced',
          last_synced: new Date().toISOString(),
        }

        // Обрабатываем динамические поля
        for (const [key, value] of Object.entries(bitrixContact)) {
          if (key.startsWith('UF_CRM_')) {
            const fieldId = key.replace('UF_CRM_', '').toLowerCase()
            formattedData.dynamic_fields[fieldId] = value
          }
          // Обрабатываем множественные поля EMAIL и PHONE
          if (key === 'EMAIL' || key === 'PHONE') {
            formattedData.dynamic_fields[key.toLowerCase()] = value
          }
        }

        return formattedData
      }

      // Если нет данных в state, загружаем данные напрямую из Bitrix24
      console.log(`Загружаем данные напрямую из Bitrix24 для контакта ${id}`)
      // Проверяем, заблокировано ли обновление формы
      // Если заблокировано, не синхронизируем с Bitrix24
      const syncWithBitrix = !lockFormUpdate
      console.log(
        `Синхронизация с Bitrix24: ${
          syncWithBitrix ? 'включена' : 'отключена (форма заблокирована)'
        }`
      )
      return await contactService.getContact(Number(id), syncWithBitrix)
    },
    {
      enabled: !!id,
      onSuccess: data => {
        console.log('Получены данные контакта:', data)

        // Проверяем, заблокировано ли обновление формы
        if (lockFormUpdate) {
          console.log(
            'Обновление формы заблокировано, используем сохраненные значения'
          )
          // Если обновление заблокировано, используем сохраненные значения формы
          if (Object.keys(lastFormValues).length > 0) {
            setFormValues(lastFormValues)
          }
          return
        }

        // Установим динамические значения полей
        const initialValues: Record<string, any> = {}
        Object.entries(data).forEach(([key, value]) => {
          initialValues[key] = value
        })

        setFormValues(initialValues)
        console.log('Установлены начальные значения формы:', initialValues)
      },
      staleTime: 0, // Данные всегда считаются устаревшими
      retry: 1, // Повторяем запрос один раз в случае ошибки
    }
  )

  // Запрос данных контакта напрямую из Bitrix24
  const {
    data: bitrixContact,
    isLoading: isBitrixQueryLoading,
    error: bitrixError,
    refetch: refetchBitrix,
  } = useQuery(
    ['bitrix_contact', id],
    async () => {
      if (!contact?.bitrix_id) {
        console.warn(
          'Отсутствует Bitrix ID для контакта, невозможно выполнить прямой запрос к Bitrix24'
        )
        return null
      }
      console.log(
        `Выполняется прямой запрос к Bitrix24 для получения контакта с ID: ${contact.bitrix_id}`
      )
      try {
        const bitrixData = await contactService.getContactFromBitrix(contact.bitrix_id)
        console.log('Получены данные из Bitrix24:', bitrixData)
        return bitrixData
      } catch (error) {
        console.error('Ошибка при прямом запросе к Bitrix24:', error)
        throw error
      }
    },
    {
      enabled: !!contact?.bitrix_id, // Запускаем автоматически, если есть bitrix_id
      retry: 1,
      staleTime: 30000, // 30 секунд
      cacheTime: 60000, // 1 минута
      onError: error => {
        console.error('Не удалось получить данные контакта из Bitrix24:', error)
      },
    }
  )

  // Получение маппингов полей из API
  useEffect(() => {
    const fetchFieldMappings = async () => {
      try {
        const mappings = await adminApi.getFieldMappings()
        console.log('Получены маппинги полей:', mappings)
        setFieldMappings(mappings)
      } catch (error) {
        console.error('Ошибка при получении маппингов полей:', error)
      }
    }

    fetchFieldMappings()
  }, [])

  // Мутация для обновления данных в Bitrix24
  const updateBitrixMutation = useMutation(
    async (data: any) => {
      if (!contact?.bitrix_id) throw new Error('Bitrix ID не указан')
      console.log(`Обновление контакта в Bitrix24 с ID ${contact.bitrix_id}:`, data)
      return await contactService.updateContactInBitrix(contact.bitrix_id, data)
    },
    {
      onSuccess: data => {
        console.log('Контакт успешно обновлен в Bitrix24:', data)
        // После успешного обновления в Bitrix24, блокируем форму на короткое время
        setLockFormUpdate(true)
        setTimeout(() => {
          setLockFormUpdate(false)
        }, 2000) // Блокируем на 2 секунды
      },
      onError: error => {
        console.error('Ошибка при обновлении контакта в Bitrix24:', error)
      },
    }
  )
  
  // Обработка данных из Bitrix24 при их получении
  useEffect(() => {
    // Проверяем, заблокировано ли обновление формы
    if (lockFormUpdate || updateBitrixMutation.isSuccess) {
      console.log(
        'Обработка данных из Bitrix24 пропущена - форма заблокирована или недавно было сохранение'
      )
      return
    }

    // Добавляем проверку на наличие данных в форме
    const hasExistingMultipleFields =
      (formValues.email &&
        Array.isArray(formValues.email) &&
        formValues.email.length > 0) ||
      (formValues.phone &&
        Array.isArray(formValues.phone) &&
        formValues.phone.length > 0)

    if (
      bitrixContact &&
      contact &&
      isBitrixLoading === false &&
      bitrixTimeout === false
    ) {
      console.log('=== Обработка данных из Bitrix24 после явного запроса ===')
      console.log('Полученные данные из Bitrix24:', bitrixContact)
      console.log('Текущие значения формы:', formValues)
      console.log('Маппинги полей:', fieldMappings)

      // Создаем копию текущих значений формы
      const updatedValues = { ...formValues }
      let hasChanges = false

      // Создаем объект для динамических полей
      const dynamicFields: Record<string, any> = {}

      // Обрабатываем стандартные поля
      if (bitrixContact.NAME || bitrixContact.LAST_NAME) {
        const fullName = `${bitrixContact.NAME || ''} ${bitrixContact.LAST_NAME || ''}`.trim()
        if (updatedValues.name !== fullName) {
          updatedValues.name = fullName
          hasChanges = true
        }
      }

      if (bitrixContact.TYPE_ID) {
        if (updatedValues.contact_type !== bitrixContact.TYPE_ID) {
          updatedValues.contact_type = bitrixContact.TYPE_ID
          hasChanges = true
        }
      }

      // Обрабатываем множественные поля EMAIL и PHONE
      if (bitrixContact.EMAIL && !hasExistingMultipleFields) {
        updatedValues.email = bitrixContact.EMAIL
        dynamicFields.email = bitrixContact.EMAIL
        hasChanges = true
      }

      if (bitrixContact.PHONE && !hasExistingMultipleFields) {
        updatedValues.phone = bitrixContact.PHONE
        dynamicFields.phone = bitrixContact.PHONE
        hasChanges = true
      }

      // Обрабатываем динамические поля (UF_CRM_)
      for (const [key, value] of Object.entries(bitrixContact)) {
        if (key.startsWith('UF_CRM_')) {
          const fieldId = key.replace('UF_CRM_', '').toLowerCase()
          dynamicFields[fieldId] = value
          hasChanges = true
        }
      }

      // Обновляем динамические поля в форме
      updatedValues.dynamic_fields = dynamicFields

      // Если были изменения, обновляем значения формы
      if (hasChanges) {
        console.log('Обновляем значения формы с данными из Bitrix24:', updatedValues)
        setFormValues(updatedValues)
      }
    }
  }, [bitrixContact, contact, formValues, fieldMappings, isBitrixLoading, bitrixTimeout, lockFormUpdate, updateBitrixMutation.isSuccess])

  // Мутация для обновления контакта
  const updateMutation = useMutation(
    async (data: ContactUpdate) => {
      if (!id) throw new Error('ID контакта не указан')
      console.log(`Обновление контакта с ID ${id}:`, data)
      return await contactService.updateContact(Number(id), data)
    },
    {
      onSuccess: data => {
        console.log('Контакт успешно обновлен:', data)
        queryClient.invalidateQueries(['contact', id])
      },
      onError: error => {
        console.error('Ошибка при обновлении контакта:', error)
      },
    }
  )



  // Обработка отправки формы
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    console.log('Отправка формы с данными:', formValues)

    // Сохраняем текущие значения формы
    setLastFormValues({ ...formValues })

    try {
      // Подготавливаем данные для обновления
      const updateData: ContactUpdate = {
        name: formValues.name,
        contact_type: formValues.contact_type,
        dynamic_fields: formValues.dynamic_fields || {},
      }

      // Обновляем контакт в локальной базе данных
      await updateMutation.mutateAsync(updateData)

      // Если есть bitrix_id, обновляем данные в Bitrix24
      if (contact?.bitrix_id) {
        // Подготавливаем данные для Bitrix24
        const bitrixData: any = {}

        // Разделяем имя на имя и фамилию
        const nameParts = formValues.name.split(' ')
        bitrixData.NAME = nameParts[0] || ''
        bitrixData.LAST_NAME = nameParts.slice(1).join(' ') || ''

        // Добавляем тип контакта
        bitrixData.TYPE_ID = formValues.contact_type || 'LPR'

        // Обрабатываем множественные поля EMAIL и PHONE
        if (formValues.email && Array.isArray(formValues.email)) {
          bitrixData.EMAIL = formValues.email
        }

        if (formValues.phone && Array.isArray(formValues.phone)) {
          bitrixData.PHONE = formValues.phone
        }

        // Добавляем динамические поля
        if (formValues.dynamic_fields) {
          for (const [key, value] of Object.entries(formValues.dynamic_fields)) {
            // Проверяем, не является ли это множественным полем
            if (key !== 'email' && key !== 'phone') {
              // Преобразуем имя поля для Bitrix24
              const bitrixFieldName = `UF_CRM_${key.toUpperCase()}`
              bitrixData[bitrixFieldName] = value
            }
          }
        }

        // Обновляем данные в Bitrix24
        await updateBitrixMutation.mutateAsync(bitrixData)
      }
    } catch (error) {
      console.error('Ошибка при сохранении данных:', error)
    }
  }

  // Обработка изменения полей формы
  const handleFieldChange = (field: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  // Обработка изменения динамических полей
  const handleDynamicFieldChange = (field: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      dynamic_fields: {
        ...(prev.dynamic_fields || {}),
        [field]: value,
      },
    }))
  }

  // Обработка изменения множественных полей (email, phone)
  const handleMultiFieldChange = (field: string, value: BitrixMultiFieldItem[]) => {
    // Обновляем значение в dynamic_fields
    handleDynamicFieldChange(field, value)
    
    // Также обновляем значение в корне объекта formValues для совместимости
    handleFieldChange(field, value)
  }

  // Функция для отображения статуса синхронизации
  const renderSyncStatus = () => {
    if (!contact) return null

    const syncStatus = contact.sync_status
    const lastSynced = contact.last_synced
      ? new Date(contact.last_synced).toLocaleString()
      : 'никогда'

    let statusColor = 'default'
    let statusText = 'Неизвестно'

    switch (syncStatus) {
      case 'synced':
        statusColor = 'success'
        statusText = 'Синхронизировано'
        break
      case 'pending':
        statusColor = 'warning'
        statusText = 'Ожидает синхронизации'
        break
      case 'error':
        statusColor = 'error'
        statusText = 'Ошибка синхронизации'
        break
      default:
        break
    }

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Chip
          label={statusText}
          color={statusColor as any}
          size="small"
          icon={
            syncStatus === 'error' ? <SyncProblemIcon /> : <SyncIcon />
          }
          sx={{ mr: 1 }}
        />
        <Typography variant="caption" color="text.secondary">
          Последняя синхронизация: {lastSynced}
        </Typography>
      </Box>
    )
  }

  // Если данные загружаются, показываем индикатор загрузки
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ pb: 10, minHeight: '100%', bgcolor: 'background.default' }}>
      {/* Mobile Top Header Area */}
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
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          mb: 2,
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <IconButton onClick={() => navigate(-1)} sx={{ color: 'primary.main' }}>
          <ChevronLeftIcon fontSize="large" />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
          Редактирование контакта
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton 
            color="primary" 
            onClick={() => syncMutation.mutate()}
            disabled={isBitrixLoading || !contact?.bitrix_id}
            sx={{ bgcolor: 'action.hover' }}
          >
            {isBitrixLoading ? <CircularProgress size={20} /> : <SyncIcon />}
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2, md: 3 }, maxWidth: 800, mx: 'auto' }}>
        {bitrixTimeout && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            Запрос выполняется дольше обычного. Пожалуйста, подождите...
          </Alert>
        )}

        {contact?.bitrix_id ? (
          <Chip
            icon={<PersonIcon />}
            label={`ID: ${contact.bitrix_id}`}
            variant="filled"
            color="primary"
            sx={{ mb: 2, bgcolor: theme.palette.mode === 'light' ? 'primary.light' : undefined, color: 'primary.dark', fontWeight: 500 }}
          />
        ) : (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            Этот контакт еще не синхронизирован
          </Alert>
        )}

        {renderSyncStatus()}

        <Card variant="outlined" sx={{ borderRadius: 3, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Основная информация
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Имя контакта"
                  value={formValues.name || ''}
                  onChange={e => handleFieldChange('name', e.target.value)}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Тип контакта</InputLabel>
                  <Select
                    value={formValues.contact_type || 'LPR'}
                    onChange={e => handleFieldChange('contact_type', e.target.value)}
                    label="Тип контакта"
                  >
                    <MenuItem value="LPR">Контактное лицо</MenuItem>
                    <MenuItem value="OTHER">Другой</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 3, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Контактная информация
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Email
                </Typography>
            <MultiFieldDisplay
              fieldName="email"
              displayName="Email"
              values={formValues.email || []}
              onChange={(fieldName, values) => handleMultiFieldChange(fieldName, values)}
              typeId="EMAIL"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Телефон
            </Typography>
            <MultiFieldDisplay
              fieldName="phone"
              displayName="Телефон"
              values={formValues.phone || []}
              onChange={(fieldName, values) => handleMultiFieldChange(fieldName, values)}
              typeId="PHONE"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>

    <Card variant="outlined" sx={{ borderRadius: 3, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Дополнительная информация
        </Typography>
        <Grid container spacing={3}>
          {fieldMappings
            .filter(mapping => mapping.entity_type === 'contact')
            .map(mapping => {
              const fieldId = mapping.bitrix_field_id.toLowerCase()
              const fieldValue =
                formValues.dynamic_fields?.[fieldId] !== undefined
                  ? formValues.dynamic_fields[fieldId]
                  : ''

              return (
                <Grid item xs={12} md={6} key={fieldId}>
                  <TextField
                    fullWidth
                    label={mapping.display_name || fieldId}
                    value={fieldValue}
                    onChange={e =>
                      handleDynamicFieldChange(fieldId, e.target.value)
                    }
                  />
                </Grid>
              )
            })}
          </Grid>
        </CardContent>
      </Card>
      </Box>

      {/* Floating Save Button */}
      <Fab
        color='primary'
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
        }}
        onClick={handleSubmit}
        disabled={updateMutation.isLoading || updateBitrixMutation.isLoading}
      >
        {updateMutation.isLoading || updateBitrixMutation.isLoading ? (
          <CircularProgress size={24} color='inherit' />
        ) : (
          <SaveIcon />
        )}
      </Fab>
    </Box>
  )
}

export default ContactEditPage
