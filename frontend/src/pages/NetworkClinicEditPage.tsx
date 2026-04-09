import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'

import PastVisitsDialog from '../components/PastVisitsDialog'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
    IconButton,
    Divider,
    Tooltip,
    Switch,
    FormControlLabel,
    FormHelperText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    useMediaQuery,
    useTheme,
    Container,
    Skeleton,
    Fab,
    Snackbar,
    FormLabel,
    Checkbox,
    DialogContentText,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LoadingButton } from '@mui/lab'
import { clinicService, Clinic } from '../services/clinicService'
import { visitService } from '../services/visitService'
import { adminApi, FieldMapping } from '../services/adminApi'
import customSectionService from '../services/customSectionService'
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    ArrowBack as ArrowBackIcon,
    Sync as SyncIcon,
    Save as SaveIcon,
    Business as BusinessIcon,
    History as HistoryIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    Work as WorkIcon,
    Info as InfoIcon,
    LocationOn as LocationOnIcon,
    Event as EventIcon,
    MonetizationOn as MonetizationOnIcon,
    List as ListIcon,
    Subject as SubjectIcon,
    CheckBox as CheckBoxIcon,
    People as PeopleIcon,


} from '@mui/icons-material'
import { Contact } from '../services/contactService'
import { getBitrixApiUrl } from '../constants/api'
import { AddressAutocomplete, AddressData } from '../components/AddressAutocomplete'
import { validateAddress } from '../services/dadataService'


interface BitrixClinicData {
    bitrix_id: any
    name: string
    company_type: string
    address: string
    city: string
    country: string
    inn: string
    bitrix_data: any
    dynamic_fields: Record<string, any>
    sync_status: string
    last_synced: string
    doctor_bitrix_id?: number,
    bitrix_main_clinic_id?: number,
    [key: string]: any
}

interface BitrixCompany {
    ID: string | number
    TITLE: string
    COMPANY_TYPE?: string
    ADDRESS?: string
    ADDRESS_CITY?: string
    ADDRESS_COUNTRY?: string
    EMAIL?: any[]
    PHONE?: any[]
    UF_CRM_1741267701427?: string
    [key: string]: any
}

interface UserProfile {
    id?: number
    email: string
    bitrix_user_id: number
    name?: string
    is_admin?: boolean
}

const cleanAddressString = (address: string | undefined): string => {
    if (!address) return ''

    // Удаляем всё, что находится после символа |;| (формат Bitrix24)
    if (address.includes('|;|')) {
        return address.split('|;|')[0]
    }

    // Удаляем всё, что находится после символа | (старый формат)
    if (address.includes('|')) {
        return address.split('|')[0]
    }

    return address
}

// Функция для обработки значений полей типа список/перечисление
const processEnumValue = (value: any): string => {

    // Если значение пришло как массив, берем первый элемент
    if (Array.isArray(value)) {
        return value.length > 0 ? String(value[0]) : ''
    }
    // Если пришел объект с полем value, используем его
    if (typeof value === 'object' && value !== null) {
        return String(value.value || value.VALUE || '')
    }
    // Иначе используем значение как есть
    const result = String(value || '')



    return result
}

export interface CustomSection {
    id: string
    name: string
    order: number
    fields: string[] // ID полей, которые находятся в этой секции
}

const NetworkClinicEditPage: React.FC = () => {
    const { bitrixId } = useParams<{ bitrixId: string }>()

    const navigate = useNavigate()
    const location = useLocation()
    const queryClient = useQueryClient()
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
    const initialLoadRef = useRef(false)
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const syncDoneRef = useRef(false)
    const [addressString, setAddressString] = useState<string>('');
    const [addressObject, setAddressObject] = useState<AddressData | null>(null);

    const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
    const [formValues, setFormValues] = useState<Record<string, any>>({})
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})
    const [isBitrixLoading, setIsBitrixLoading] = useState(false)
    const [isBitrixSyncSuccess, setIsBitrixSyncSuccess] = useState(false)
    const [bitrixTimeout, setBitrixTimeout] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [pastVisitsDialogOpen, setPastVisitsDialogOpen] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [syncStatus, setSyncStatus] = useState<{
        type: 'success' | 'error' | 'warning' | 'info'
        message: string
    } | null>(null)

    const [syncStatusContact, setSyncStatusContact] = useState<{
        type: 'success' | 'error' | 'warning' | 'info'
        message: string
    } | null>(null)
    const [userProfile] = useState<UserProfile | null>(null)
    const [dataFullyLoaded, setDataFullyLoaded] = useState(false)
    const [initialBitrixLoading, setInitialBitrixLoading] = useState(true)

    const [customSections, setCustomSections] = useState<CustomSection[]>([])
    const [sectionDialogOpen, setSectionDialogOpen] = useState(false)
    const [currentSection, setCurrentSection] = useState<CustomSection | null>(
        null
    )
    const [newContact, setNewContact] = useState({
        name: '',
        lastName: '',
        position: '',
        email: '',
        phone: '',
    })
    const [isEditMode, setIsEditMode] = useState(false)
    const [editContactId, setEditContactId] = useState<number | null>(null)
    const [createContactDialogOpen, setCreateContactDialogOpen] = useState(false)
    const [isContactsLoading, setIsContactsLoading] = useState(false)
    const [deleteContactId, setDeleteContactId] = useState<number | null>(null)
    const [isCreatingContact, setIsCreatingContact] = useState(false)

    const [contacts, setContacts] = useState<Contact[]>([])
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
    const [doctorSelectKey, setDoctorSelectKey] = useState(0)

    const [availableFields, setAvailableFields] = useState<FieldMapping[]>([])
    const [snackbarOpen, setSnackbarOpen] = useState(false)
    const [snackbarMessage, setSnackbarMessage] = useState('')
    const [snackbarSeverity, setSnackbarSeverity] = useState<
        'success' | 'error' | 'warning' | 'info'
    >('info')
    const [fieldSelectionDialogOpen, setFieldSelectionDialogOpen] =
        useState(false)
    const [currentSectionForFields] =
        useState<string>('')
    const [selectedFields, setSelectedFields] = useState<string[]>([])
    const [doctorBitrixId] = useState<number | null>(null);

    const locationState = location.state as {
        bitrixId?: string
        bitrixData?: any
        fromSearch?: boolean
        newBitrixId?: number | string
        directOpen?: boolean
    } | null



    const fetchClinicData = async (forceBitrixSync: boolean = false) => {

        if (locationState?.bitrixData) {
            const bitrixCompany = locationState.bitrixData
            const formattedData: BitrixClinicData = {
                bitrix_id: bitrixCompany.ID,
                name: bitrixCompany.TITLE || '',
                company_type: bitrixCompany.COMPANY_TYPE || '',
                address: cleanAddressString(bitrixCompany.ADDRESS) || '',
                city: bitrixCompany.CITY || '', // Используем поле CITY вместо ADDRESS_CITY
                country: bitrixCompany.COUNTRY || '', // Используем поле COUNTRY вместо ADDRESS_COUNTRY
                inn:
                    'UF_CRM_1741267701427' in bitrixCompany
                        ? bitrixCompany.UF_CRM_1741267701427 || ''
                        : bitrixCompany.inn || '',
                bitrix_data: bitrixCompany,
                dynamic_fields: {},
                sync_status: 'synced',
                last_synced: new Date().toISOString(),
            }
            for (const [key, value] of Object.entries(bitrixCompany)) {
                if (key.startsWith('UF_CRM_') && key !== 'UF_CRM_1741267701427') {


                    if (
                        (key === 'UF_CRM_6679726EB1750' || !formattedData.address) &&
                        typeof value === 'string'
                    ) {
                        formattedData.address = cleanAddressString(value)
                    }
                }

            }
            return formattedData
        }

        try {
            if (customSections.length === 0) {
                await loadGlobalCustomSections()
            }


            const shouldSyncWithBitrix =
                forceBitrixSync ||
                (locationState?.fromSearch && locationState?.newBitrixId)
            const unifiedData = await clinicService.getUnifiedNetworkClinicData(Number(bitrixId), {
                forceBitrixSync: !!shouldSyncWithBitrix,
                skipBitrix: true,
            })

            const clinicData = unifiedData.localData
            const bitrixData = unifiedData.bitrixData

            if (bitrixData) {
                try {
                    const isBitrixFormat = bitrixData && 'TITLE' in bitrixData

                    const formattedData: BitrixClinicData = {
                        bitrix_id: isBitrixFormat
                            ? (bitrixData as BitrixCompany).ID
                            : (bitrixData as Clinic).bitrix_id?.toString() ||
                            clinicData.bitrix_id?.toString() ||
                            '',
                        name: isBitrixFormat
                            ? (bitrixData as BitrixCompany).TITLE || ''
                            : (bitrixData as Clinic).name || '',
                        company_type: isBitrixFormat
                            ? (bitrixData as BitrixCompany).COMPANY_TYPE || ''
                            : (bitrixData as Clinic).company_type || '',
                        address: isBitrixFormat
                            ? cleanAddressString((bitrixData as BitrixCompany).ADDRESS) || ''
                            : cleanAddressString((bitrixData as Clinic).address) || '',
                        city: isBitrixFormat
                            ? (bitrixData as BitrixCompany).CITY || ''
                            : (bitrixData as Clinic).city || '',
                        country: isBitrixFormat
                            ? (bitrixData as BitrixCompany).COUNTRY || ''
                            : (bitrixData as Clinic).country || '',
                        inn: '',
                        bitrix_data: bitrixData,
                        dynamic_fields: {},
                        sync_status: 'synced',
                        last_synced: new Date().toISOString(),
                    }

                    let innValue = ''

                    if (isBitrixFormat) {
                        if (
                            'UF_CRM_1741267701427' in bitrixData &&
                            (bitrixData as BitrixCompany).UF_CRM_1741267701427
                        ) {
                            innValue =
                                (bitrixData as BitrixCompany).UF_CRM_1741267701427 || ''
                        } else if ('inn' in bitrixData) {
                            innValue = (bitrixData as any).inn || ''
                        }
                    } else {
                        innValue = (bitrixData as Clinic).inn || ''
                    }

                    if (!innValue && clinicData.inn) {
                        innValue = clinicData.inn
                    }

                    formattedData.inn = innValue

                    formattedData.dynamic_fields['UF_CRM_1741267701427'] = innValue
                    formattedData.dynamic_fields['1741267701427'] = innValue

                    return formattedData
                } catch (error) {
                    console.error('Ошибка при получении данных из Bitrix:', error)
                    return clinicData
                }
            }
            return clinicData
        } catch (error) {
            console.error('Ошибка при получении данных клиники:', error)
            return {
                bitrix_id: null,
                name: '',
                company_type: '',
                address: '',
                city: '',
                country: '',
                inn: '',
                bitrix_data: {},
                dynamic_fields: {},
                sync_status: 'error',
                last_synced: new Date().toISOString(),
            } as BitrixClinicData
        }
    }
    const {
        data: clinic,
        isLoading,
        refetch: refetchClinic,
    } = useQuery(['clinic', bitrixId, 'static'], () => fetchClinicData(false), {
        enabled: !!bitrixId,
        onSuccess: data => {
            if (!data) {
                setError('Не удалось загрузить данные клиники')
                return
            }

            const initialValues = { ...data }

            if (initialValues.address) {
                initialValues.address = cleanAddressString(initialValues.address)
            }

            // Создаем копию динамических полей, чтобы не потерять их структуру
            initialValues.dynamic_fields = data.dynamic_fields
                ? { ...data.dynamic_fields }
                : {}

            // Очищаем адресные поля в динамических полях
            if (initialValues.dynamic_fields) {
                // Проверяем известные адресные поля и очищаем их
                const addressFields = [
                    'address',
                    'ADDRESS',
                    '6679726eb1750',
                    'UF_CRM_6679726EB1750',
                    'uf_crm_6679726eb1750',
                    'UF_CRM_ADDRESS',
                    'uf_crm_address',
                ]

                addressFields.forEach(field => {
                    if (
                        initialValues.dynamic_fields &&
                        initialValues.dynamic_fields[field]
                    ) {
                        const value = initialValues.dynamic_fields[field]
                        if (typeof value === 'string') {
                            initialValues.dynamic_fields[field] = cleanAddressString(value)
                        }
                    }
                })

                // Проверяем другие поля, которые могут содержать адрес
                if (initialValues.dynamic_fields) {
                    Object.keys(initialValues.dynamic_fields).forEach(key => {
                        if (initialValues.dynamic_fields) {
                            const value = initialValues.dynamic_fields[key]
                            if (
                                key.toLowerCase().includes('address') ||
                                (typeof value === 'string' && value.includes('|;|'))
                            ) {
                                if (typeof value === 'string') {
                                    initialValues.dynamic_fields[key] = cleanAddressString(value)
                                }
                            }
                        }
                    })
                }
            }

            // Проверяем наличие ИНН в разных форматах
            const innFromDynamicFields =
                initialValues.dynamic_fields &&
                (initialValues.dynamic_fields['UF_CRM_1741267701427'] ||
                    initialValues.dynamic_fields['1741267701427'])

            // Определяем финальное значение ИНН из всех возможных источников
            const finalInn = initialValues.inn || innFromDynamicFields || ''

            // Сохраняем ИНН в основной структуре данных
            initialValues.inn = finalInn

            // Всегда сохраняем ИНН в динамических полях с полным именем поля
            initialValues.dynamic_fields['UF_CRM_1741267701427'] = finalInn
            // Для совместимости сохраняем также без префикса
            initialValues.dynamic_fields['1741267701427'] = finalInn

            setFormValues(initialValues)
            if (initialLoadRef.current) {
                initialLoadRef.current = false
            }
        },
        staleTime: Infinity, // Данные никогда не становятся устаревшими, обновляем только при явном вызове refetch
        cacheTime: 600000, // Увеличиваем время хранения в кэше до 10 минут
        retry: 1, // Уменьшаем количество попыток загрузки
        refetchOnMount: false, // Не обновляем при монтировании компонента
        refetchOnWindowFocus: false, // Отключаем обновление при возврате фокуса на окно
        refetchInterval: false, // Отключаем периодическое обновление
    })




    const refetchBitrix = async () => {
        setIsBitrixLoading(true)
        try {
            console.log('РЕФЕТЧ=', clinic)
            const bitrixId = clinic?.bitrix_id || null
            if (!bitrixId) {
                console.warn('Не удалось получить Bitrix ID для клиники')
                return null
            }

            // Запрашиваем данные из Bitrix24 напрямую, а не через refetchClinic
            const bitrixData = await clinicService.getNetworkClinicById(Number(bitrixId))
            return bitrixData
        } catch (error) {
            console.error('Ошибка при обновлении данных из Bitrix24:', error)
            return null
        } finally {
            setIsBitrixLoading(false)
        }
    }

    const { data: pastVisits, isLoading: isPastVisitsLoading } = useQuery(
        ['past_visits', bitrixId],
        () => (bitrixId ? visitService.getVisitsByCompanyId(Number(bitrixId)) : []),
        { enabled: !!bitrixId && pastVisitsDialogOpen, staleTime: 30000 }
    )



    // Обработчик успешной загрузки маппингов
    const handleFieldMappingsLoaded = useCallback((data: FieldMapping[]) => {

        // Сохраняем маппинги
        setFieldMappings(data)
    }, [])

    // Загружаем маппинги полей для клиники
    const { isLoading: isFieldMappingsLoading } =
        useQuery(
            ['fieldMappings', 'network_clinic'],
            () => adminApi.getPublicFieldMappings('network_clinic'),
            {
                onSuccess: handleFieldMappingsLoaded,
                staleTime: 3600000, // Увеличиваем время кэширования до 1 часа (маппинги редко меняются)
                refetchOnMount: 'always', // Обновляем только при первом монтировании
                refetchOnWindowFocus: false, // Отключаем обновление при возврате фокуса на окно
                retry: 2, // Увеличиваем количество попыток загрузки
                cacheTime: 3600000, // Увеличиваем время хранения в кэше до 1 часа
            }
        )

    // Функция фильтрации полей (не использует хуки)
    const filterAvailableFields = (
        fieldMappingsToFilter: FieldMapping[],
        sectionFields: string[]
    ) => {
        return fieldMappingsToFilter.filter(
            mapping =>
                !sectionFields.includes(mapping.id.toString()) &&
                mapping.app_field_name !== 'email' &&
                mapping.app_field_name !== 'phone'
        )
    }



    // Обработчик синхронизации с Bitrix24
    const handleBitrixSync = useCallback(
        async (forceRefresh: boolean = true): Promise<void> => {
            if (!clinic?.bitrix_id) {
                alert(
                    'Не найден ID клиники в Bitrix24. Сначала создайте клинику в Bitrix24.'
                )
                return
            }

            setIsBitrixLoading(true)
            setBitrixTimeout(false)

            // Уменьшаем таймаут до 5 секунд
            const timeoutId = setTimeout(() => setBitrixTimeout(true), 5000)

            try {
                // Обновляем данные из кэша
                await refetchBitrix()

                console.log(
                    `Запрос свежих данных из Bitrix24 для ID: ${clinic.bitrix_id}, forceRefresh: ${forceRefresh}`
                )
                // Получаем свежие данные из Bitrix24 с принудительным обновлением кэша
                const freshData = await clinicService.getNetworkClinicById(
                    clinic.bitrix_id,
                    forceRefresh
                )

                if (!freshData) {
                    throw new Error('Не удалось получить данные из Bitrix24')
                }

                const updatedValues = { ...formValues }
                let hasChanges = false
                const dynamicFields: Record<string, any> = {}

                // Обработка полей из маппинга, которые не являются динамическими
                fieldMappings.forEach(m => {
                    if (
                        !m.bitrix_field_id?.startsWith('ufCrm') &&
                        (freshData as any)[m.bitrix_field_id] !== undefined &&
                        JSON.stringify((freshData as any)[m.bitrix_field_id]) !==
                        JSON.stringify(formValues[m.app_field_name])
                    ) {
                        updatedValues[m.app_field_name] = (freshData as any)[
                            m.bitrix_field_id
                        ]
                        hasChanges = true
                    }
                })

                // Обработка стандартных полей
                const standardFields = [
                    { appField: 'name', bitrixField: 'TITLE' },
                    { appField: 'company_type', bitrixField: 'COMPANY_TYPE' },
                    { appField: 'address', bitrixField: 'ADDRESS' },
                    { appField: 'city', bitrixField: 'CITY' }, // Используем поле CITY вместо ADDRESS_CITY
                    { appField: 'country', bitrixField: 'COUNTRY' }, // Используем поле COUNTRY вместо ADDRESS_COUNTRY
                ]

                standardFields.forEach(({ appField, bitrixField }) => {
                    // Используем безопасный способ доступа к свойствам с проверкой
                    const bitrixValue = (freshData as any)[bitrixField]
                    if (
                        bitrixValue !== undefined &&
                        bitrixValue !== formValues[appField]
                    ) {
                        updatedValues[appField] =
                            bitrixField === 'ADDRESS'
                                ? cleanAddressString(bitrixValue)
                                : bitrixValue
                        hasChanges = true
                    }
                })

                // Обработка динамических полей и специальных полей
                for (const [key, value] of Object.entries(freshData as any)) {
                    // Обработка динамических полей UF_CRM_*
                    if (key.startsWith('UF_CRM_')) {
                        // Специальная обработка для поля ИНН
                        if (key === 'UF_CRM_1741267701427') {
                            continue
                        }

                        // Обработка других динамических полей через маппинг
                        const mapping = fieldMappings.find(m => m.bitrix_field_id === key)
                        if (mapping) {
                            const appFieldName = mapping.app_field_name

                            // Обработка значения в зависимости от типа поля
                            let processedValue = value

                            // Обработка булевых полей
                            if (mapping.field_type === 'boolean') {
                                processedValue =
                                    value === true || value === '1' || value === 1 ? 1 : 0
                            }
                            // Обработка полей типа список/перечисление
                            else if (
                                mapping.field_type === 'list' ||
                                mapping.field_type === 'enum'
                            ) {
                                // Выводим исходное значение для отладки

                                // Проверим, есть ли опции для этого поля
                                if (mapping.value_options) {
                                    try {
                                        const options = JSON.parse(mapping.value_options)

                                        // Обрабатываем значение в зависимости от его типа
                                        const processedEnumValue = processEnumValue(value)

                                        // Ищем соответствие в опциях по значению bitrix_value
                                        const matchingOption = options.find((opt: any) => {
                                            return (
                                                String(opt.bitrix_value) === String(processedEnumValue)
                                            )
                                        })

                                        // Если нашли соответствие, используем app_value
                                        if (matchingOption) {
                                            processedValue = matchingOption.app_value

                                            // Добавляем логирование для проблемного поля

                                        } else {
                                            // Если не нашли, пробуем найти по числовому значению
                                            const numericValue = Number(processedEnumValue)
                                            if (!isNaN(numericValue)) {
                                                const numericOption = options.find(
                                                    (opt: any) =>
                                                        Number(opt.bitrix_value) === numericValue
                                                )

                                                if (numericOption) {
                                                    processedValue = numericOption.app_value


                                                }
                                            }

                                            // Если не нашли соответствие, используем обработанное значение
                                            processedValue = processedEnumValue
                                        }
                                    } catch (error) {
                                        processedValue = processEnumValue(value) // Используем простую обработку в случае ошибки
                                    }
                                } else {
                                    // Если нет опций, используем простое преобразование
                                    processedValue = processEnumValue(value)
                                }

                                // Логируем итоговое значение
                            }


                            // Проверяем, изменилось ли значение
                            if (
                                JSON.stringify(processedValue) !==
                                JSON.stringify(formValues[appFieldName])
                            ) {
                                updatedValues[appFieldName] = processedValue

                                // Добавляем в динамические поля, если это не стандартное поле
                                if (
                                    ![
                                        'name',
                                        'company_type',
                                        'address',
                                        'city',
                                        'country',
                                        'inn',
                                    ].includes(appFieldName)
                                ) {
                                    // Сохраняем с полным именем поля
                                    dynamicFields[key] = processedValue
                                    // Для совместимости сохраняем также без префикса
                                    dynamicFields[appFieldName] = processedValue
                                }
                            }
                        }
                    }

                }

                // Обновляем состояние формы, если были изменения
                if (hasChanges) {
                    // Создаем объединенные динамические поля
                    const mergedDynamicFields = {
                        ...formValues.dynamic_fields,
                        ...dynamicFields,
                    }

                    // Проверяем наличие ИНН в разных форматах
                    const innFromDynamicFields =
                        mergedDynamicFields &&
                        (mergedDynamicFields['inn'] || mergedDynamicFields['1741267701427'])

                    // Приоритет: 1) ИНН из обновленных значений, 2) ИНН из динамических полей
                    const finalInn = updatedValues.inn || innFromDynamicFields || ''

                    // Сохраняем ИНН в основной структуре данных
                    updatedValues.inn = finalInn

                    // Всегда сохраняем ИНН в динамических полях с полным именем поля
                    mergedDynamicFields['UF_CRM_1741267701427'] = finalInn
                    // Для совместимости сохраняем также без префикса
                    mergedDynamicFields['1741267701427'] = finalInn

                    // Устанавливаем обновленные динамические поля
                    updatedValues.dynamic_fields = mergedDynamicFields

                    // Обновляем форму
                    setFormValues(updatedValues)
                    setIsBitrixSyncSuccess(true)
                    setTimeout(() => setIsBitrixSyncSuccess(false), 3000)
                }

                clearTimeout(timeoutId)
                setIsBitrixLoading(false)
                setBitrixTimeout(false)
            } catch (error) {
                console.error('Ошибка при синхронизации с Bitrix24:', error)
                alert(
                    'Не удалось получить данные из Bitrix24. Пожалуйста, попробуйте позже.'
                )
                clearTimeout(timeoutId)
                setIsBitrixLoading(false)
                setBitrixTimeout(false)
            }
        },
        [clinic?.bitrix_id, fieldMappings, formValues, refetchBitrix]
    )

    // Эффект для обновления доступных полей
    useEffect(() => {
        if (!isFieldMappingsLoading && fieldMappings.length > 0) {
            const fieldsInSections = customSections.flatMap(s => s.fields)
            const filtered = filterAvailableFields(fieldMappings, fieldsInSections)
            setAvailableFields(filtered)
        } else {
            setAvailableFields([])
        }
    }, [customSections, fieldMappings, isFieldMappingsLoading])

    // Эффект для загрузки контактов - только при первой загрузке или изменении ID


    // Dedicated effect for loading custom sections
    const loadGlobalCustomSections = async (forceReload = false) => {
        try {
            const sections = await customSectionService.getCustomSections()

            if (sections && sections.length > 0) {
                setCustomSections(sections)
                return true

            }
        } catch (error) {
            console.error('Error loading global custom sections:', error)

            return false
        }
    }

    // Эффект для загрузки глобальных секций
    useEffect(() => {
        const loadSections = async () => {
            setIsSaving(true)
            try {
                const success = await loadGlobalCustomSections()
                if (!success) {
                    console.warn('Failed to load custom sections, using defaults')
                }
            } catch (error) {
                console.error('Error in custom sections loading effect:', error)
            } finally {
                setIsSaving(false)
            }
        }

        loadSections()
    }, [])

    useEffect(() => {
        if (
            clinic?.bitrix_id &&
            !isLoading &&
            !isFieldMappingsLoading &&
            fieldMappings.length > 0 &&
            !syncDoneRef.current
        ) {
            syncDoneRef.current = true
            handleBitrixSync()
        }
    }, [
        clinic?.bitrix_id,
        handleBitrixSync,
        isLoading,
        isFieldMappingsLoading,
        fieldMappings,
    ])

    useEffect(() => {
        if (bitrixId && !initialLoadRef.current) {
            queryClient.removeQueries(['clinic', bitrixId.toString()])
            queryClient.removeQueries(['clinic', bitrixId.toString(), 'static'])
            queryClient.removeQueries(['clinic', bitrixId.toString(), 'bitrix'])
            initialLoadRef.current = true
        }

        if (locationState?.fromSearch && locationState?.newBitrixId && bitrixId) {
            queryClient.removeQueries(['clinic', bitrixId.toString()])
            setTimeout(() => refetchClinic(), 100)
        } else if (locationState?.directOpen && bitrixId) {
            queryClient.removeQueries(['clinic', bitrixId.toString()])
            setTimeout(() => refetchClinic(), 100)
        }

        return () => {
            if (bitrixId) {
                queryClient.removeQueries(['clinic', bitrixId.toString()])
                queryClient.removeQueries(['clinic', bitrixId.toString(), 'static'])
                queryClient.removeQueries(['clinic', bitrixId.toString(), 'bitrix'])
                syncStarted.current = false
            }
        }
    }, [bitrixId, locationState, refetchClinic, queryClient])

    const syncStarted = useRef(false)

    useEffect(() => {

        if (bitrixId && clinic) {

            if (clinic.bitrix_id && !syncStarted.current && !dataFullyLoaded) {
                syncStarted.current = true

                setTimeout(() => {
                    setBitrixTimeout(true)
                }, 5000) // 5 секунд

                refetchBitrix()
                    .then(bitrixData => {
                        // Проверяем, что получены данные из Bitrix24
                        if (bitrixData) {
                            console.log('Получены данные из Bitrix24:', bitrixData)
                            // Проверяем наличие поля UF_CRM_1741267701427 (ИНН)
                            if ('UF_CRM_1741267701427' in bitrixData) {
                                const innValue = bitrixData.UF_CRM_1741267701427 || ''

                                // Обновляем только поле ИНН, не переписывая всю форму
                                setFormValues(prev => ({
                                    ...prev,
                                    inn: innValue,
                                    dynamic_fields: {
                                        ...prev.dynamic_fields,
                                        UF_CRM_1741267701427: innValue,
                                        '1741267701427': innValue,
                                    },
                                }))
                            }
                            console.log('КЛИНИКА=', clinic)

                            setDataFullyLoaded(true)
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка при загрузке данных из Bitrix:', error)
                    })
                    .finally(() => {
                        setIsBitrixLoading(false)
                        setInitialBitrixLoading(false)
                    })
            } else if (!clinic.bitrix_id) {
                setDataFullyLoaded(true)
                setInitialBitrixLoading(false)
            }
        } else {
            // При первой загрузке страницы показываем лоадер
            setInitialBitrixLoading(true)
        }
    }, [bitrixId, clinic, dataFullyLoaded, refetchBitrix])

    // Сброс состояний загрузки при размонтировании компонента
    useEffect(() => {
        return () => {
            setIsBitrixLoading(false)
            setInitialBitrixLoading(false)
            setDataFullyLoaded(false)
            setBitrixTimeout(false)
        }
    }, [])
    const syncWithBitrix = useCallback(async () => {
        if (!clinic?.bitrix_id) {
            setSyncStatus({
                type: 'error',
                message:
                    'Не найден ID клиники в Bitrix24. Сначала создайте клинику в Bitrix24.',
            })
            return
        }

        setIsSyncing(true)
        setSyncStatus(null)
        setError(null)

        try {
            // Обновляем данные из кэша
            await refetchBitrix()

            // Получаем свежие данные из Bitrix24
            const freshData = await clinicService.getNetworkClinicById(clinic.bitrix_id)

            if (!freshData) {
                throw new Error('Не удалось получить данные из Bitrix24')
            }

            const updatedValues = { ...formValues }
            let hasChanges = false
            const dynamicFields: Record<string, any> = {}

            // Обработка полей из маппинга, которые не являются динамическими
            fieldMappings.forEach(m => {
                if (
                    !m.bitrix_field_id?.startsWith('ufCrm') &&
                    (freshData as any)[m.bitrix_field_id] !== undefined &&
                    JSON.stringify((freshData as any)[m.bitrix_field_id]) !==
                    JSON.stringify(formValues[m.app_field_name])
                ) {
                    updatedValues[m.app_field_name] = (freshData as any)[
                        m.bitrix_field_id
                    ]
                    hasChanges = true
                }
            })

            // Обработка стандартных полей
            const standardFields = [
                { appField: 'name', bitrixField: 'TITLE' },
                { appField: 'company_type', bitrixField: 'COMPANY_TYPE' },
                { appField: 'address', bitrixField: 'ADDRESS' },
                { appField: 'city', bitrixField: 'CITY' }, // Используем поле CITY вместо ADDRESS_CITY
                { appField: 'country', bitrixField: 'COUNTRY' }, // Используем поле COUNTRY вместо ADDRESS_COUNTRY
            ]

            standardFields.forEach(({ appField, bitrixField }) => {
                // Используем безопасный способ доступа к свойствам с проверкой
                const bitrixValue = (freshData as any)[bitrixField]
                if (bitrixValue !== undefined && bitrixValue !== formValues[appField]) {
                    updatedValues[appField] =
                        bitrixField === 'ADDRESS'
                            ? cleanAddressString(bitrixValue)
                            : bitrixValue
                    hasChanges = true
                }
            })

            // Обработка динамических полей и специальных полей
            for (const [key, value] of Object.entries(freshData as any)) {
                // Обработка динамических полей UF_CRM_*
                if (key.startsWith('UF_CRM_')) {
                    // Специальная обработка для поля ИНН
                    if (key === 'UF_CRM_1741267701427') {
                        continue
                    }

                    // Обработка других динамических полей через маппинг
                    const mapping = fieldMappings.find(m => m.bitrix_field_id === key)
                    if (mapping) {
                        const appFieldName = mapping.app_field_name

                        // Обработка значения в зависимости от типа поля
                        let processedValue = value

                        // Обработка булевых полей
                        if (mapping.field_type === 'boolean') {
                            processedValue =
                                value === true || value === '1' || value === 1 ? 1 : 0
                        }
                        // Обработка полей типа список/перечисление
                        else if (
                            mapping.field_type === 'list' ||
                            mapping.field_type === 'enum'
                        ) {


                            // Проверим, есть ли опции для этого поля
                            if (mapping.value_options) {
                                try {
                                    const options = JSON.parse(mapping.value_options)


                                    // Обрабатываем значение в зависимости от его типа
                                    const processedEnumValue = processEnumValue(value)

                                    // Ищем соответствие в опциях по значению bitrix_value
                                    const matchingOption = options.find((opt: any) => {
                                        return (
                                            String(opt.bitrix_value) === String(processedEnumValue)
                                        )
                                    })

                                    // Если нашли соответствие, используем app_value
                                    if (matchingOption) {
                                        processedValue = matchingOption.app_value

                                    } else {
                                        // Если не нашли, используем обработанное значение
                                        processedValue = processedEnumValue

                                    }
                                } catch (error) {
                                    console.error(
                                        `Ошибка при обработке опций для поля ${mapping.display_name}:`,
                                        error
                                    )
                                    processedValue = processEnumValue(value) // Используем простую обработку в случае ошибки
                                }
                            } else {
                                // Если нет опций, используем простое преобразование
                                processedValue = processEnumValue(value)

                            }

                            // Логируем итоговое значение

                        }

                        // Проверяем, изменилось ли значение
                        if (
                            JSON.stringify(processedValue) !==
                            JSON.stringify(formValues[appFieldName])
                        ) {
                            updatedValues[appFieldName] = processedValue

                            // Добавляем в динамические поля, если это не стандартное поле
                            if (
                                ![
                                    'name',
                                    'company_type',
                                ].includes(appFieldName)
                            ) {
                                // Сохраняем с полным именем поля
                                dynamicFields[key] = processedValue
                                // Для совместимости сохраняем также без префикса
                                dynamicFields[appFieldName] = processedValue
                            }
                        }
                    }
                }

            }

            // Обновляем состояние формы, если были изменения
            if (hasChanges) {
                // Создаем объединенные динамические поля
                const mergedDynamicFields = {
                    ...formValues.dynamic_fields,
                    ...dynamicFields,
                }

                // Проверяем наличие ИНН в разных форматах
                const innFromDynamicFields =
                    mergedDynamicFields &&
                    (mergedDynamicFields['inn'] || mergedDynamicFields['1741267701427'])

                // Приоритет: 1) ИНН из обновленных значений, 2) ИНН из динамических полей
                const finalInn = updatedValues.inn || innFromDynamicFields || ''

                // Сохраняем ИНН в основной структуре данных
                updatedValues.inn = finalInn

                // Всегда сохраняем ИНН в динамических полях с полным именем поля
                mergedDynamicFields['UF_CRM_1741267701427'] = finalInn
                // Для совместимости сохраняем также без префикса
                mergedDynamicFields['1741267701427'] = finalInn

                // Устанавливаем обновленные динамические поля
                updatedValues.dynamic_fields = mergedDynamicFields

                // Обновляем форму
                setFormValues(updatedValues)
                setIsBitrixSyncSuccess(true)
                setTimeout(() => setIsBitrixSyncSuccess(false), 3000)
            }

            setSyncStatus({
                type: 'success',
                message: 'Синхронизация с Bitrix24 выполнена успешно',
            })
        } catch (err) {
            console.error('Ошибка при синхронизации с Bitrix24:', err)
            setSyncStatus({
                type: 'error',
                message:
                    'Не удалось синхронизировать данные с Bitrix24. Пожалуйста, попробуйте позже.',
            })
        } finally {
            setIsSyncing(false)
        }
    }, [clinic?.bitrix_id, fieldMappings, formValues, refetchBitrix])
    // Эффект для инициализации при первом рендере
    useEffect(() => {


        if (bitrixId && !clinic) {
            // При первой загрузке страницы показываем лоадер
            setInitialBitrixLoading(true)
        }
    }, [bitrixId, clinic, dataFullyLoaded, syncWithBitrix])

    // Функция для надежного сохранения глобальных секций
    const saveGlobalCustomSections = async (sectionsToSave: any[]) => {
        try {
            // Подготавливаем данные для сохранения, сохраняя правильные ID
            const preparedSections = sectionsToSave.map(section => ({
                // Используем существующий id в качестве section_id
                id:
                    section.id ||
                    `section-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: section.name,
                order: section.order || 1,
                fields: section.fields || [],
            }))
            // Сохраняем через сервис
            const result = await customSectionService.saveCustomSections(
                preparedSections
            )
            // Обновляем локальное состояние с новыми секциями
            if (!result) {
                console.error('Failed to save custom sections')
                return false
            }
            setCustomSections(preparedSections)
            return true
        } catch (error) {
            console.error('Error saving global custom sections:', error)
            return false
        }
    }

    const handleFieldChange = (fieldName: string, value: any) => {
        // Очистка адресных полей от служебных данных Bitrix24
        let processedValue = value


        setFormValues(prev => ({
            ...prev, dynamic_fields: {
                ...prev.dynamic_fields,
                [fieldName]: processedValue
            }, [fieldName]: processedValue
        }))



    }
    const saveCompanyAddress = async () => {
        if (!addressObject) return;
        addressObject.company_id = clinic?.id
        addressObject.is_network = true
        clinicService.updateClinicAddress(addressObject)
    }
    const handleChange = ({ object, string }: { object: AddressData | null; string: string }) => {
        setAddressString(string);
        setAddressObject(object);
        addressChanged('31_1744890745', string)
    };

    const addressChanged = (name: string, value: string | null) => {
        handleFieldChange(name, value);
        setFormValues((prev) => ({
            ...prev,
            [name]: value,
            ufCrm31_1744890745: value,
            dynamic_fields: {
                ...prev.dynamic_fields,
                ufCrm31_1744890745: value,
                '31_1744890745': value,
            },
        }));
    };
    const handleNewContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewContact(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }
    const renderFieldByType = (
        mapping: FieldMapping,
        fieldName: string,
        displayValue: any,
        fieldError: string | undefined,
        fieldIcon: React.ReactNode
    ) => {
        if (mapping.field_type === 'address') {
            return (
                <AddressAutocomplete
                    value={{
                        object: addressObject,
                        string: addressString || displayValue,
                    }}
                    onChange={handleChange}
                />
            );
        }
        // Строка или адрес
        if (mapping.field_type === 'string' || mapping.field_type === 'address') {
            return (
                <TextField
                    label={mapping.display_name}
                    value={displayValue}
                    onChange={e =>
                        handleFieldChange(
                            fieldName,
                            mapping.field_type === 'address'
                                ? cleanAddressString(e.target.value)
                                : e.target.value
                        )
                    }
                    fullWidth
                    required={mapping.is_required}
                    error={!!fieldError}
                    helperText={fieldError}
                    multiline={
                        mapping.field_type === 'address' || fieldName === 'address'
                    }
                    rows={
                        mapping.field_type === 'address' || fieldName === 'address' ? 3 : 1
                    }
                    sx={
                        mapping.field_type === 'address' || fieldName === 'address'
                            ? { '& .MuiInputBase-root': { minHeight: '100px' } }
                            : {}
                    }
                />
            )
        }

        // Число
        if (mapping.field_type === 'number') {
            return (
                <TextField
                    label={mapping.display_name}
                    value={displayValue}
                    // Используем тип text вместо number для сохранения ведущих нулей
                    type='text'
                    onChange={e => {
                        // Получаем новое значение из поля ввода
                        const newValue = e.target.value;

                        // 1. Пустые значения
                        if (newValue === '') {
                            handleFieldChange(fieldName, '');
                            return;
                        }

                        // 2. Одиночные символы: "0", ",", ".", "-"
                        if (newValue === '0' || newValue === ',' || newValue === '.' || newValue === '-') {
                            // Прямая передача строкового значения, а не преобразование в Number
                            handleFieldChange(fieldName, newValue);
                            return;
                        }

                        // 3. Проверяем, соответствует ли значение формату числа с ведущими нулями
                        if (/^-?\d*[.,]?\d*$/.test(newValue)) {
                            // Прямая передача строкового значения для сохранения ведущих нулей
                            handleFieldChange(fieldName, newValue);
                            return;
                        }
                    }}
                    fullWidth
                    required={mapping.is_required}
                    error={!!fieldError}
                    helperText={fieldError}
                    InputProps={{
                        startAdornment: fieldIcon,
                    }}
                />
            )
        }

        // Дата
        if (mapping.field_type === 'date') {
            return (
                <DatePicker
                    label={mapping.display_name}
                    value={displayValue ? new Date(displayValue) : null}
                    onChange={date => handleFieldChange(fieldName, date)}
                    slotProps={{
                        textField: {
                            fullWidth: true,
                            required: mapping.is_required,
                            error: !!fieldError,
                            helperText: fieldError,
                            InputProps: {
                                startAdornment: fieldIcon,
                            },
                        },
                    }}
                />
            )
        }

        // Булево
        if (mapping.field_type === 'boolean') {
            return (
                <FormControl
                    fullWidth
                    required={mapping.is_required}
                    error={!!fieldError}
                    component='fieldset'
                    sx={{
                        border: '1px solid',
                        borderColor: fieldError ? 'error.main' : 'divider',
                        borderRadius: 1,
                        p: 2,
                        position: 'relative',
                    }}
                >
                    <FormLabel
                        component='legend'
                        sx={{
                            position: 'absolute',
                            top: '-12px',
                            left: '10px',
                            bgcolor: 'background.paper',
                            px: 1,
                        }}
                    >
                        {mapping.display_name}
                    </FormLabel>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={!!displayValue}
                                onChange={e => handleFieldChange(fieldName, e.target.checked)}
                                color='primary'
                            />
                        }
                        label={displayValue ? 'Да' : 'Нет'}
                    />
                    {fieldError && <FormHelperText error>{fieldError}</FormHelperText>}
                </FormControl>
            )
        }

        // Список/Перечисление
        if (mapping.field_type === 'list' || mapping.field_type === 'enum') {
            // Получаем доступные значения для списка из value_options
            let options = []
            if (mapping.value_options) {
                try {
                    // Парсим JSON из value_options и преобразуем в формат для Select
                    const parsedOptions = JSON.parse(mapping.value_options)
                    options = parsedOptions.map((opt: any) => ({
                        value: opt.app_value,
                        label: opt.app_value,
                    }))
                } catch (error) {
                    console.error(
                        `Ошибка при парсинге value_options для поля ${mapping.display_name}:`,
                        error
                    )
                }
            } else {
            }

            // Обрабатываем значение для отображения
            let value = displayValue
            if (value && typeof value === 'string') {
                // Значение уже есть, используем его как есть
            } else {
                // Используем простую обработку для массивов и объектов
                value = processEnumValue(displayValue)
            }

            return (
                <FormControl
                    fullWidth
                    required={mapping.is_required}
                    error={!!fieldError}
                >
                    <InputLabel>{mapping.display_name}</InputLabel>
                    <Select
                        value={value || ''}
                        onChange={e => {
                            handleFieldChange(fieldName, e.target.value)
                        }}
                        label={mapping.display_name}
                        startAdornment={fieldIcon}
                    >
                        <MenuItem value=''>
                            <em>Не выбрано</em>
                        </MenuItem>
                        {options.map((option: any) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                    {fieldError && <FormHelperText>{fieldError}</FormHelperText>}
                </FormControl>
            )
        }

        return (
            <TextField
                label={mapping.display_name}
                value={displayValue || ''}
                onChange={e => handleFieldChange(fieldName, e.target.value)}
                fullWidth
                required={mapping.is_required}
                error={!!fieldError}
                helperText={fieldError}
                InputProps={{
                    startAdornment: fieldIcon,
                }}
            />
        )
    }

    const handleCloseModal = () => {
        setIsErrorModalOpen(false);
    };


    const onSubmit = async () => {
        const newErrors: Record<string, string> = {}
        fieldMappings.forEach(m => {
            if (m.is_required && !formValues[m.app_field_name]) {
                newErrors[m.app_field_name] = `Field ${m.display_name} is required`
            }
        })
        if (Object.keys(newErrors).length) {
            setFormErrors(newErrors)
            return
        }

        const result = await validateAddress(formValues.ufCrm31_1744890745);
        if (!result.success) {

            setModalMessage(
                'Ошибка при валидации адреса. Пожалуйста, проверьте данные и попробуйте еще раз.'
            );
            setIsErrorModalOpen(true);
            return
        }
        setIsSaving(true)
        await saveCompanyAddress()
        try {
            // First update clinic data

            // Then save custom sections - now they're global
            // Fix: Clean up empty sections and sections with empty names
            const sectionsToSave = customSections
                .filter(section => section.name && section.name.trim() !== '')
                .map((section, index) => ({
                    ...section,
                    name: section.name.trim(),
                    order: index + 1,
                    id: section.id || `section-${Date.now()}-${index}`,
                }))

            // Save only if we have valid sections
            if (sectionsToSave.length > 0) {
                await saveGlobalCustomSections(sectionsToSave)
            }

            // Update Bitrix if applicable
            if (clinic?.bitrix_id) await saveAddressToLocalDB()

            // Show success message
            setSyncStatus({
                type: 'success',
                message: 'Филиал успешно обновлен   ',
            })

            // Force reload the sections after save
            try {
                await loadGlobalCustomSections(true) // Принудительная перезагрузка
            } catch (error) {
                console.error('Error reloading custom sections after save:', error)
            }
        } catch (error) {
            console.error('Error saving clinic data:', error)
            setSyncStatus({
                type: 'error',
                message: 'Произошла ошибка при сохранении данных',
            })
        } finally {
            setIsSaving(false)
        }
    }





    const confirmDeleteContact = async () => {
        if (!clinic?.company_id) return

        try {
            const response = await fetch(
                `https://crmwest.ru/rest/156/fnonb6nklg81kzy1/crm.contact.delete`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: deleteContactId }),
                }
            )
            if (!response.ok) throw new Error('Failed to delete contact')
            const data = await response.json()
            if (data.result) {
                await loadContactsForCompany(Number(clinic?.company_id))
                setSyncStatus({
                    type: 'success',
                    message: 'Контакт успешно удален',
                })
            } else throw new Error('Contact deletion failed')
        } catch (error) {
            setSyncStatus({
                type: 'error',
                message: `Ошибка при удалении контакта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'
                    }`,
            })
        }
    }

    const loadContactsForCompany = useCallback(
        async (companyId: number) => {
            setIsContactsLoading(true)
            try {
                const bitrixId = clinic?.bitrixMainClinicID
                if (!bitrixId) {
                    setContacts([])
                    return
                }
                const response = await fetch(getBitrixApiUrl('crm.contact.list'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filter: { COMPANY_ID: bitrixId },
                        select: ['ID', 'NAME', 'LAST_NAME', 'EMAIL', 'PHONE', 'POST'],
                    }),
                })
                if (!response.ok) throw new Error('Failed to fetch contacts')
                const data = await response.json()
                setContacts(
                    data.result?.map((contact: any) => ({
                        id: parseInt(contact.ID),
                        name:
                            `${contact.NAME || ''} ${contact.LAST_NAME || ''}`.trim() ||
                            'Unnamed Contact',
                        bitrix_id: parseInt(contact.ID),
                        phone: contact.PHONE?.[0]?.VALUE || '',
                        email: contact.EMAIL?.[0]?.VALUE || '',
                        position: contact.POST || '',
                    })) || []
                )
            } catch {
                setContacts([])
            } finally {
                setIsContactsLoading(false)
            }
        },
        [clinic]
    )

    const handleSaveContact = async () => {
        setIsCreatingContact(true)
        try {
            if (!clinic?.bitrix_id) throw new Error('Clinic Bitrix ID missing')
            if (!newContact.name || !newContact.lastName) {
                setSyncStatusContact({
                    type: 'error',
                    message: 'Необходимо заполнить обязательные поля!',
                });
                return;
            }
            const contactData = {
                fields: {
                    NAME: newContact.name,
                    LAST_NAME: newContact.lastName,
                    POST: newContact.position,
                    COMPANY_ID: clinic.bitrixMainClinicID,
                    EMAIL: newContact.email
                        ? [{ VALUE: newContact.email, VALUE_TYPE: 'WORK' }]
                        : [],
                    PHONE: newContact.phone
                        ? [{ VALUE: newContact.phone, VALUE_TYPE: 'WORK' }]
                        : [],
                },
            }
            console.log(contactData)
            const response = await fetch(
                `https://crmwest.ru/rest/156/fnonb6nklg81kzy1/crm.contact.${isEditMode && editContactId ? 'update' : 'add'
                }`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(
                        isEditMode && editContactId
                            ? { ...contactData, id: editContactId }
                            : contactData
                    ),
                }
            )
            if (!response.ok) throw new Error('Failed to save contact')
            const data = await response.json()
            if (data.result) {
                await loadContactsForCompany(Number(clinic.company_id))
                setCreateContactDialogOpen(false)
                setEditContactId(null)
                setIsEditMode(false)
                setDoctorSelectKey(prev => prev + 1)

                formValues.doctor_bitrix_id = Array.isArray(data.result)
                    ? data.result.map(Number) // Если там строки — приведём к числам
                    : typeof data.result === 'number' || typeof data.result === 'string'
                        ? [Number(data.result)]
                        : [];
                console.log(formValues.doctor_bitrix_id)
            } else throw new Error('Contact save failed')
        } catch (error) {
            alert(
                `Error ${isEditMode ? 'updating' : 'creating'} contact: ${error instanceof Error ? error.message : 'Unknown error'
                }`
            )
        } finally {
            setIsCreatingContact(false)
        }
    }

    useEffect(() => {
        // Используем реф для отслеживания первой загрузки
        const isFirstLoad = initialLoadRef.current
        if (clinic?.company_id && (isFirstLoad || isLoading === false)) {
            loadContactsForCompany(Number(clinic?.company_id))
        }
    }, [clinic?.company_id, loadContactsForCompany, isLoading])

    const saveAddressToLocalDB = async () => {
        try {
            const dataToSend = { ...formValues }
            await clinicService.updateNetworkClinic(
                Number(bitrixId),
                dataToSend
            )
            await refetchBitrix()

        } catch (error) {
            console.error('Ошибка при сохранении адреса в локальную БД:', error)
            if (error instanceof Error) {
                console.error('Детали ошибки:', error.message)
            }
        }
    }




    if (isLoading && !clinic) {
        return (
            <Container maxWidth='lg' sx={{ py: { xs: 2, sm: 3 } }}>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '80vh',
                    }}
                >
                    <CircularProgress />
                    <Typography variant='body2' color='text.secondary' sx={{ ml: 2 }}>
                        Загрузка данных клиники...
                    </Typography>
                </Box>
            </Container>
        )
    }



    const handleAddSection = () => {
        // Проверяем, является ли пользователь администратором
        if (!userProfile?.is_admin) {
            // Если пользователь не администратор, показываем сообщение
            setSnackbarMessage('Только администраторы могут создавать разделы')
            setSnackbarSeverity('warning')
            setSnackbarOpen(true)
            return
        }

        // Создаем новую секцию с уникальным ID
        const newSection: CustomSection = {
            id: `section_${Date.now()}`,
            name: '',
            order: customSections.length,
            fields: [],
        }

        // Устанавливаем текущую секцию и открываем диалог
        setCurrentSection(newSection)
        setSectionDialogOpen(true)
    }



    const handleSaveSection = (section: CustomSection) => {
        // Проверяем, что название секции не пустое
        if (!section.name.trim()) {
            setSnackbarMessage('Название секции не может быть пустым')
            setSnackbarSeverity('error')
            setSnackbarOpen(true)
            return
        }

        // Проверяем на дублирование полей
        const allFieldsInOtherSections = customSections
            .filter(s => s.id !== section.id) // Исключаем текущую секцию
            .flatMap(s => s.fields)

        // Находим дублирующиеся поля
        const duplicateFields: string[] = []
        section.fields.forEach(fieldId => {
            if (allFieldsInOtherSections.includes(fieldId)) {
                // Получаем название поля для отображения в сообщении
                const fieldMapping = fieldMappings.find(
                    mapping => String(mapping.id) === fieldId
                )
                if (fieldMapping) {
                    duplicateFields.push(fieldMapping.display_name || fieldId)
                }
            }
        })

        // Если есть дублирующиеся поля, показываем предупреждение
        if (duplicateFields.length > 0) {
            setSnackbarMessage(
                `Внимание: следующие поля уже используются в других разделах: ${duplicateFields.join(
                    ', '
                )}`
            )
            setSnackbarSeverity('warning')
            setSnackbarOpen(true)
            // Но всё равно сохраняем секцию
        }

        if (customSections.some(s => s.id === section.id)) {
            // Обновление существующей секции
            setCustomSections(prev =>
                prev.map(s => (s.id === section.id ? section : s))
            )
        } else {
            // Добавление новой секции
            setCustomSections(prev => [...prev, section])
        }
        setSectionDialogOpen(false)
        setCurrentSection(null)

        // Показываем сообщение об успешном сохранении
        setSnackbarMessage('Секция успешно сохранена')
        setSnackbarSeverity('success')
        setSnackbarOpen(true)
    }






    const handleFieldSelection = () => {
        if (currentSectionForFields && selectedFields.length > 0) {
            // Update the section with the selected fields
            setCustomSections(prevSections => {
                return prevSections.map(section => {
                    if (section.id === currentSectionForFields) {
                        // Add the newly selected fields to the existing fields
                        const updatedFields = [...section.fields, ...selectedFields]
                        return { ...section, fields: updatedFields }
                    }
                    return section
                })
            })

            // Reset selection state
            setSelectedFields([])
            setFieldSelectionDialogOpen(false)
        }
    }

    const handleFieldSelectionChange = (fieldId: string) => {
        setSelectedFields(prev => {
            if (prev.includes(fieldId)) {
                return prev.filter(id => id !== fieldId)
            } else {
                return [...prev, fieldId]
            }
        })
    }




    return (
        <Container maxWidth='lg' sx={{ py: { xs: 2, sm: 3 } }}>
            {/* Полноэкранный индикатор загрузки данных из Битрикса */}
            {(initialBitrixLoading || (isBitrixLoading && !dataFullyLoaded)) && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                    }}
                >
                    <CircularProgress size={60} sx={{ color: 'white' }} />
                    <Typography variant='h6' color='white' sx={{ mt: 2 }}>
                        Загрузка данных из Bitrix24...
                    </Typography>
                    <Typography variant='body2' color='white' sx={{ mt: 1 }}>
                        Пожалуйста, подождите, не вносите изменения
                    </Typography>
                    {bitrixTimeout && (
                        <Button
                            variant='contained'
                            color='primary'
                            sx={{ mt: 3 }}
                            onClick={() => {
                                setDataFullyLoaded(true)
                                setIsBitrixLoading(false)
                                setInitialBitrixLoading(false)
                            }}
                        >
                            Продолжить без ожидания
                        </Button>
                    )}
                </Box>
            )}

            {/* Верхняя панель с заголовком и кнопками */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    mb: { xs: 2, sm: 3 },
                    gap: 2,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                        onClick={() => navigate(-1)}
                        sx={{ mr: 1 }}
                        aria-label='Назад'
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant='h5' component='h1' sx={{ fontWeight: 'bold' }}>
                        {isLoading ? (
                            <Skeleton width={200} />
                        ) : (
                            formValues.name || 'Новая клиника'
                        )}
                    </Typography>
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: 1,
                        width: 'auto',
                        flex: 1,
                        justifyContent: 'flex-end',
                        flexWrap: 'wrap'
                    }}
                >
                    {clinic?.bitrix_id && (
                        <Tooltip title="Синхронизировать" arrow>
                            <LoadingButton
                                variant='outlined'
                                color='primary'
                                startIcon={!isMobile && <SyncIcon />}
                                loading={isSyncing}
                                onClick={syncWithBitrix}
                                sx={{
                                    whiteSpace: 'nowrap',
                                    minWidth: isMobile ? '40px' : '120px',
                                    width: isMobile ? '40px' : 'auto',
                                    height: isMobile ? '40px' : 'auto',
                                    padding: isMobile ? '8px' : '8px 16px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    ...(isMobile ? {
                                        '& .MuiButton-startIcon': { margin: 0 },
                                        '& .MuiSvgIcon-root': { margin: 0 },
                                    } : {})
                                }}
                            >
                                {isMobile ? <SyncIcon /> : 'Синхронизировать'}
                            </LoadingButton>
                        </Tooltip>
                    )}
                    {bitrixId && (
                        <>
                            <Tooltip title="Прошлые визиты" arrow>
                                <Button
                                    variant='outlined'
                                    color='secondary'
                                    startIcon={!isMobile && <HistoryIcon />}
                                    onClick={() => setPastVisitsDialogOpen(true)}
                                    sx={{
                                        whiteSpace: 'nowrap',
                                        minWidth: isMobile ? '40px' : '120px',
                                        width: isMobile ? '40px' : 'auto',
                                        height: isMobile ? '40px' : 'auto',
                                        padding: isMobile ? '8px' : '8px 16px',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        ...(isMobile ? {
                                            '& .MuiButton-startIcon': { margin: 0 },
                                            '& .MuiSvgIcon-root': { margin: 0 },
                                        } : {})
                                    }}
                                >
                                    {isMobile ? <HistoryIcon /> : 'Прошлые визиты'}
                                </Button>
                            </Tooltip>
                            <Tooltip title="Создать визит" arrow>
                                <Button
                                    variant='contained'
                                    color='secondary'
                                    startIcon={!isMobile && <AddIcon />}
                                    onClick={() => navigate(`/visits/new/${clinic?.company_id}`)}
                                    sx={{
                                        whiteSpace: 'nowrap',
                                        minWidth: isMobile ? '40px' : '120px',
                                        width: isMobile ? '40px' : 'auto',
                                        height: isMobile ? '40px' : 'auto',
                                        padding: isMobile ? '8px' : '8px 16px',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        ...(isMobile ? {
                                            '& .MuiButton-startIcon': { margin: 0 },
                                            '& .MuiSvgIcon-root': { margin: 0 },
                                        } : {}),
                                        bgcolor: 'success.main',
                                        '&:hover': {
                                            bgcolor: 'success.dark',
                                        },
                                    }}
                                >
                                    {isMobile ? <AddIcon /> : 'Создать визит'}
                                </Button>
                            </Tooltip>
                        </>
                    )}
                    <Tooltip title="Сохранить" arrow>
                        <LoadingButton
                            variant='contained'
                            color='primary'
                            startIcon={!isMobile && <SaveIcon />}
                            loading={isSaving}
                            onClick={onSubmit}
                            disabled={Object.keys(formErrors).length > 0}
                            sx={{
                                whiteSpace: 'nowrap',
                                minWidth: isMobile ? '40px' : '120px',
                                width: isMobile ? '40px' : 'auto',
                                height: isMobile ? '40px' : 'auto',
                                padding: isMobile ? '8px' : '8px 16px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                ...(isMobile ? {
                                    '& .MuiButton-startIcon': { margin: 0 },
                                    '& .MuiSvgIcon-root': { margin: 0 },
                                } : {})
                            }}
                        >
                            {isMobile ? <SaveIcon /> : 'Сохранить'}
                        </LoadingButton>
                    </Tooltip>
                </Box>
            </Box>

            {error && (
                <Alert severity='error' sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {syncStatus && (
                <Alert
                    severity={syncStatus.type}
                    sx={{ mb: 3 }}
                    onClose={() => setSyncStatus(null)}
                >
                    {syncStatus.message}
                </Alert>
            )}

            {isLoading ? (
                <Card sx={{ borderRadius: { xs: 1, sm: 2 } }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Skeleton variant='rectangular' height={40} sx={{ mb: 2 }} />
                        <Divider sx={{ mb: 3 }} />
                        <Grid container spacing={{ xs: 2, sm: 3 }}>
                            {[...Array(6)].map((_, index) => (
                                <Grid item xs={12} md={6} key={index}>
                                    <Skeleton variant='rectangular' height={56} />
                                </Grid>
                            ))}
                        </Grid>
                    </CardContent>
                </Card>
            ) : (
                <Card
                    sx={{
                        borderRadius: { xs: 1, sm: 2 },
                        boxShadow: { xs: 1, sm: 3 },
                        overflow: 'visible',
                    }}
                >
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <form
                            onSubmit={e => {
                                e.preventDefault()
                                onSubmit()
                            }}
                        >
                            <Grid container spacing={{ xs: 2, sm: 3 }}>
                                {/* Основная информация - всегда отображается первой */}
                                <Grid item xs={12}>
                                    <Box sx={{ mb: 3 }}>
                                        <Typography
                                            variant='subtitle1'
                                            sx={{
                                                fontWeight: 'medium',
                                                mb: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                borderBottom: '1px solid',
                                                borderColor: 'divider',
                                                pb: 1,
                                            }}
                                        >
                                            <InfoIcon sx={{ mr: 1 }} />
                                            Основная информация
                                        </Typography>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12}>
                                                <TextField
                                                    label='Название клиники'
                                                    value={formValues.name || ''}
                                                    onChange={e =>
                                                        handleFieldChange('name', e.target.value)
                                                    }
                                                    fullWidth
                                                    required
                                                    error={!!formErrors.name}
                                                    helperText={formErrors.name}
                                                    InputProps={{
                                                        startAdornment: (
                                                            <BusinessIcon color='action' sx={{ mr: 1 }} />
                                                        ),
                                                    }}
                                                />


                                            </Grid>

                                        </Grid>
                                    </Box>
                                </Grid>

                                {/* Раздел ЛПР (Контакты) */}

                                <Grid item xs={12}>
                                    <Box
                                        sx={{
                                            mb: 3,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            p: 2,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                mb: 2,
                                            }}
                                        >
                                            <Typography
                                                variant='subtitle1'
                                                sx={{
                                                    fontWeight: 'medium',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <PeopleIcon sx={{ mr: 1 }} />
                                                Лица, принимающие решения (ЛПР)
                                            </Typography>
                                            <Button
                                                variant='outlined'
                                                size='small'
                                                startIcon={<AddIcon />}
                                                onClick={() => {
                                                    setNewContact({
                                                        name: '',
                                                        lastName: '',
                                                        position: '',
                                                        email: '',
                                                        phone: '',
                                                    })
                                                    setIsEditMode(false)
                                                    setEditContactId(null)
                                                    setCreateContactDialogOpen(true)
                                                }}
                                            >
                                                Добавить ЛПР
                                            </Button>
                                        </Box>
                                        <Divider sx={{ mb: 2 }} />

                                        {isContactsLoading ? (
                                            <Box
                                                sx={{ display: 'flex', justifyContent: 'center', p: 3 }}
                                            >
                                                <CircularProgress size={30} />
                                            </Box>
                                        ) : contacts.length > 0 ? (
                                            <Grid container spacing={2}>
                                                {contacts.map(contact => (
                                                    <Grid item xs={12} md={6} key={contact.id}>
                                                        <Card variant='outlined' sx={{ height: '100%' }}>
                                                            <CardContent sx={{ pb: 1 }}>
                                                                <Box
                                                                    sx={{
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        mb: 1,
                                                                    }}
                                                                >
                                                                    <FormControlLabel
                                                                        control={
                                                                            <Checkbox
                                                                                checked={formValues.doctor_bitrix_id.includes(String(contact.id))}
                                                                                onChange={(e) => {
                                                                                    const isChecked = e.target.checked;
                                                                                    if (isChecked) {
                                                                                        setFormValues((prev) => ({
                                                                                            ...prev,
                                                                                            doctor_bitrix_id: [...prev.doctor_bitrix_id, String(contact.id)],
                                                                                        }));
                                                                                    } else {
                                                                                        setFormValues((prev) => ({
                                                                                            ...prev,
                                                                                            doctor_bitrix_id: prev.doctor_bitrix_id.filter(
                                                                                                (id: string) => id !== String(contact.id)
                                                                                            ),
                                                                                        }));
                                                                                    }
                                                                                }}
                                                                            />
                                                                        }
                                                                        label={
                                                                            <Typography variant='h6' sx={{ mb: 0.5 }}>
                                                                                {contact.name}
                                                                            </Typography>
                                                                        }
                                                                    />
                                                                </Box>

                                                                {contact.position && (
                                                                    <Typography
                                                                        variant='body2'
                                                                        color='textSecondary'
                                                                        sx={{ mb: 1 }}
                                                                    >
                                                                        <WorkIcon
                                                                            fontSize='small'
                                                                            sx={{
                                                                                mr: 0.5,
                                                                                verticalAlign: 'middle',
                                                                                fontSize: '1rem',
                                                                            }}
                                                                        />
                                                                        {contact.position}
                                                                    </Typography>
                                                                )}
                                                                {contact.email && (
                                                                    <Typography
                                                                        variant='body2'
                                                                        color='textSecondary'
                                                                        sx={{ mb: 0.5 }}
                                                                    >
                                                                        <EmailIcon
                                                                            fontSize='small'
                                                                            sx={{
                                                                                mr: 0.5,
                                                                                verticalAlign: 'middle',
                                                                                fontSize: '1rem',
                                                                            }}
                                                                        />
                                                                        {contact.email}
                                                                    </Typography>
                                                                )}
                                                                {contact.phone && (
                                                                    <Typography
                                                                        variant='body2'
                                                                        color='textSecondary'
                                                                    >
                                                                        <PhoneIcon
                                                                            fontSize='small'
                                                                            sx={{
                                                                                mr: 0.5,
                                                                                verticalAlign: 'middle',
                                                                                fontSize: '1rem',
                                                                            }}
                                                                        />
                                                                        {contact.phone}
                                                                    </Typography>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        ) : (
                                            <Box sx={{ py: 2, textAlign: 'center' }}>
                                                <Typography color='textSecondary'>
                                                    Нет добавленных контактов
                                                </Typography>
                                                <Typography
                                                    variant='body2'
                                                    color='textSecondary'
                                                    sx={{ mt: 0.5 }}
                                                >
                                                    Нажмите кнопку «Добавить ЛПР» для создания нового
                                                    контакта
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Grid>

                                {/* <Grid item xs={12}>
                                    <Box
                                        sx={{
                                            mb: 3,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            p: 2,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                mb: 2,
                                            }}
                                        >
                                            <Typography
                                                variant='subtitle1'
                                                sx={{
                                                    fontWeight: 'medium',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <PeopleIcon sx={{ mr: 1 }} />
                                                Лица, принимающие решения (ЛПР)
                                            </Typography>
                                            <Button
                                                variant='outlined'
                                                size='small'
                                                startIcon={<AddIcon />}
                                                onClick={() => {
                                                    setNewContact({
                                                        name: '',
                                                        lastName: '',
                                                        position: '',
                                                        email: '',
                                                        phone: '',
                                                    })
                                                    setIsEditMode(false)
                                                    setEditContactId(null)
                                                    setCreateContactDialogOpen(true)
                                                }}
                                            >
                                                Добавить ЛПР
                                            </Button>
                                        </Box>
                                        <Divider sx={{ mb: 2 }} />

                                        {isContactsLoading ? (
                                            <Box
                                                sx={{ display: 'flex', justifyContent: 'center', p: 3 }}
                                            >
                                                <CircularProgress size={30} />
                                            </Box>
                                        ) : contacts.length > 0 ? (
                                            <Grid container spacing={2}>
                                                {contacts.map(contact => (
                                                    <Grid item xs={12} md={6} key={contact.id}>
                                                        <Card variant='outlined' sx={{ height: '100%' }}>
                                                            <CardContent sx={{ pb: 1 }}>
                                                                <Box
                                                                    sx={{
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        mb: 1,
                                                                    }}
                                                                >
                                                                    <Typography variant='h6' sx={{ mb: 0.5 }}>
                                                                        {contact.name}
                                                                    </Typography>
                                                                    <Box>
                                                                        <IconButton
                                                                            size='small'
                                                                            onClick={() =>
                                                                                handleEditContact(contact.id)
                                                                            }
                                                                            sx={{ mr: 0.5 }}
                                                                        >
                                                                            <EditIcon fontSize='small' />
                                                                        </IconButton>
                                                                        <IconButton
                                                                            size='small'
                                                                            onClick={() => {
                                                                                setDeleteContactId(contact.id)
                                                                                setConfirmDialogOpen(true)
                                                                            }}
                                                                        >
                                                                            <DeleteIcon fontSize='small' />
                                                                        </IconButton>
                                                                    </Box>
                                                                </Box>
                                                                {contact.position && (
                                                                    <Typography
                                                                        variant='body2'
                                                                        color='textSecondary'
                                                                        sx={{ mb: 1 }}
                                                                    >
                                                                        <WorkIcon
                                                                            fontSize='small'
                                                                            sx={{
                                                                                mr: 0.5,
                                                                                verticalAlign: 'middle',
                                                                                fontSize: '1rem',
                                                                            }}
                                                                        />
                                                                        {contact.position}
                                                                    </Typography>
                                                                )}
                                                                {contact.email && (
                                                                    <Typography
                                                                        variant='body2'
                                                                        color='textSecondary'
                                                                        sx={{ mb: 0.5 }}
                                                                    >
                                                                        <EmailIcon
                                                                            fontSize='small'
                                                                            sx={{
                                                                                mr: 0.5,
                                                                                verticalAlign: 'middle',
                                                                                fontSize: '1rem',
                                                                            }}
                                                                        />
                                                                        {contact.email}
                                                                    </Typography>
                                                                )}
                                                                {contact.phone && (
                                                                    <Typography
                                                                        variant='body2'
                                                                        color='textSecondary'
                                                                    >
                                                                        <PhoneIcon
                                                                            fontSize='small'
                                                                            sx={{
                                                                                mr: 0.5,
                                                                                verticalAlign: 'middle',
                                                                                fontSize: '1rem',
                                                                            }}
                                                                        />
                                                                        {contact.phone}
                                                                    </Typography>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        ) : (
                                            <Box sx={{ py: 2, textAlign: 'center' }}>
                                                <DoctorSelect
                                                    companyId={clinic?.bitrixMainClinicID}
                                                    value={formValues.doctor_bitrix_id?.map((id: any) => String(id)) ?? []}
                                                    onChange={(doctorIds) =>
                                                        setFormValues((prev) => ({
                                                            ...prev,
                                                            doctor_bitrix_id: doctorIds?.map(id => String(id)) ?? [],
                                                        }))
                                                    }
                                                />

                                            </Box>
                                        )}
                                    </Box>
                                </Grid> */}




                                {/* Кнопка для добавления новой секции */}
                                {userProfile?.is_admin && (
                                    <Grid item xs={12}>
                                        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                                            <Button
                                                variant='contained'
                                                color='primary'
                                                startIcon={<AddIcon />}
                                                onClick={handleAddSection}
                                                fullWidth
                                            >
                                                Добавить новую секцию
                                            </Button>
                                        </Box>
                                    </Grid>
                                )}

                                {/* Остальные поля, не добавленные в секции */}
                                {(() => {

                                    const unusedFields = fieldMappings.filter(
                                        m =>
                                            m.app_field_name !== 'email' &&
                                            m.app_field_name !== 'phone' &&
                                            !customSections
                                                .flatMap(s => s.fields)
                                                .includes(m.id.toString()) &&
                                            !m.section
                                    )

                                    return (
                                        <>
                                            {/* Выводим неиспользуемые поля без секции */}
                                            {unusedFields.length > 0 && (
                                                <Grid item xs={12}>
                                                    <Box sx={{ mb: 3 }}>
                                                        <Typography
                                                            variant='subtitle1'
                                                            sx={{
                                                                fontWeight: 'medium',
                                                                mb: 2,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                borderBottom: '1px solid',
                                                                borderColor: 'divider',
                                                                pb: 1,
                                                            }}
                                                        >
                                                            <SubjectIcon sx={{ mr: 1 }} />
                                                            Другие поля
                                                        </Typography>



                                                        {/* === Основной список неиспользуемых полей === */}
                                                        <Grid container spacing={2}>
                                                            {unusedFields.map(mapping => {
                                                                // const fieldName = mapping.app_field_name
                                                                const fieldName = mapping.bitrix_field_id
                                                                const fieldValue = formValues.dynamic_fields?.[fieldName] || '';
                                                                // const fieldError = formErrors[fieldName]
                                                                const displayValue = fieldValue === null ? '' : fieldValue;
                                                                // Определяем иконку
                                                                let fieldIcon
                                                                if (
                                                                    fieldName.includes('address') ||
                                                                    mapping.field_type === 'address'
                                                                ) {
                                                                    fieldIcon = (
                                                                        <LocationOnIcon color='action' sx={{ mr: 1 }} />
                                                                    )
                                                                } else if (
                                                                    fieldName.includes('date') ||
                                                                    mapping.field_type === 'date'
                                                                ) {
                                                                    fieldIcon = <EventIcon color='action' sx={{ mr: 1 }} />
                                                                } else if (
                                                                    fieldName.includes('money') ||
                                                                    fieldName.includes('price')
                                                                ) {
                                                                    fieldIcon = (
                                                                        <MonetizationOnIcon color='action' sx={{ mr: 1 }} />
                                                                    )
                                                                } else if (
                                                                    mapping.field_type === 'list' ||
                                                                    mapping.field_type === 'enum'
                                                                ) {
                                                                    fieldIcon = <ListIcon color='action' sx={{ mr: 1 }} />
                                                                } else {
                                                                    fieldIcon = <SubjectIcon color='action' sx={{ mr: 1 }} />
                                                                }

                                                                return (
                                                                    <Grid
                                                                        item
                                                                        xs={12}
                                                                        md={6}
                                                                        key={mapping.id}
                                                                        draggable

                                                                    >
                                                                        {renderFieldByType(
                                                                            mapping,
                                                                            fieldName,
                                                                            displayValue,
                                                                            undefined,
                                                                            fieldIcon
                                                                        )}
                                                                    </Grid>
                                                                )
                                                            })}
                                                        </Grid>
                                                    </Box>
                                                </Grid>
                                            )}


                                        </>
                                    )
                                })()}
                            </Grid>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Мобильная кнопка сохранения */}
            {isMobile && (
                <Fab
                    color='primary'
                    sx={{
                        position: 'fixed',
                        bottom: 16,
                        right: 16,
                        zIndex: 1000,
                    }}
                    onClick={onSubmit}
                    disabled={Object.keys(formErrors).length > 0 || isSaving}
                >
                    {isSaving ? (
                        <CircularProgress size={24} color='inherit' />
                    ) : (
                        <SaveIcon />
                    )}
                </Fab>
            )}

            {bitrixId && (
                <PastVisitsDialog
                    open={pastVisitsDialogOpen}
                    onClose={() => setPastVisitsDialogOpen(false)}
                    companyId={Number(bitrixId)}
                    companyName={clinic?.name || 'Клиника'}
                    visits={pastVisits}
                    isLoading={isPastVisitsLoading}
                />
            )}


            <Dialog
                open={sectionDialogOpen}
                onClose={() => {
                    setSectionDialogOpen(false)
                    setCurrentSection(null)
                }}
                fullWidth
                maxWidth='sm'
            >
                <DialogTitle>
                    {currentSection && currentSection.id
                        ? 'Редактировать секцию'
                        : 'Создать новую секцию'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin='dense'
                        label='Название секции'
                        fullWidth
                        value={currentSection?.name || ''}
                        onChange={e =>
                            setCurrentSection(prev =>
                                prev ? { ...prev, name: e.target.value } : null
                            )
                        }
                        sx={{ mb: 3 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setSectionDialogOpen(false)
                            setCurrentSection(null)
                        }}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={() => currentSection && handleSaveSection(currentSection)}
                        variant='contained'
                        color='primary'
                        disabled={!currentSection?.name}
                    >
                        Сохранить
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={fieldSelectionDialogOpen}
                onClose={() => setFieldSelectionDialogOpen(false)}
                fullWidth
                maxWidth='md'
            >
                <DialogTitle>Выберите поля для добавления в секцию</DialogTitle>
                <DialogContent>
                    {availableFields.length === 0 ? (
                        <Typography variant='body1' sx={{ py: 2 }}>
                            Все доступные поля уже добавлены в секции
                        </Typography>
                    ) : (
                        <>
                            <Typography variant='body2' color='textSecondary' sx={{ mb: 2 }}>
                                Выберите поля, которые хотите добавить в секцию
                            </Typography>
                            <Grid container spacing={2}>
                                {availableFields.map(field => (
                                    <Grid item xs={12} sm={6} md={4} key={field.id}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={selectedFields.includes(field.id.toString())}
                                                    onChange={() =>
                                                        handleFieldSelectionChange(field.id.toString())
                                                    }
                                                />
                                            }
                                            label={
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    {field.field_type === 'address' ? (
                                                        <LocationOnIcon fontSize='small' sx={{ mr: 1 }} />
                                                    ) : field.field_type === 'date' ? (
                                                        <EventIcon fontSize='small' sx={{ mr: 1 }} />
                                                    ) : field.field_type === 'list' ||
                                                        field.field_type === 'enum' ? (
                                                        <ListIcon fontSize='small' sx={{ mr: 1 }} />
                                                    ) : field.field_type === 'boolean' ? (
                                                        <CheckBoxIcon fontSize='small' sx={{ mr: 1 }} />
                                                    ) : (
                                                        <SubjectIcon fontSize='small' sx={{ mr: 1 }} />
                                                    )}
                                                    <Typography variant='body2'>
                                                        {field.display_name}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFieldSelectionDialogOpen(false)}>
                        Отмена
                    </Button>
                    <Button
                        onClick={handleFieldSelection}
                        variant='contained'
                        color='primary'
                        disabled={selectedFields.length === 0}
                    >
                        Добавить выбранные поля
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
            >
                <Alert
                    onClose={() => setSnackbarOpen(false)}
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>

            <Dialog
                open={confirmDialogOpen}
                onClose={() => setConfirmDialogOpen(false)}
                maxWidth='xs'
                PaperProps={{
                    sx: {
                        borderRadius: { xs: '8px', sm: '12px' },
                        m: { xs: 1, sm: 2 },
                        width: { xs: 'calc(100% - 16px)', sm: 'auto' },
                    },
                }}
            >
                <DialogTitle>
                    <Box display='flex' alignItems='center'>
                        <DeleteIcon sx={{ mr: 1, color: 'error.main' }} />
                        Удаление контакта
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Typography variant='body2'>
                        Вы уверены, что хотите удалить этот контакт? Это действие нельзя
                        отменить.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setConfirmDialogOpen(false)}>Отмена</Button>
                    <LoadingButton
                        variant='contained'
                        color='error'
                        onClick={confirmDeleteContact}
                        fullWidth
                    >
                        Удалить
                    </LoadingButton>
                </DialogActions>
            </Dialog>
            {/* Диалог создания/редактирования контакта */}
            <Dialog
                open={createContactDialogOpen}
                onClose={() => {
                    setCreateContactDialogOpen(false)
                    setEditContactId(null)
                    setIsEditMode(false)
                }}
                fullWidth
                maxWidth='sm'
                PaperProps={{
                    sx: {
                        borderRadius: { xs: '8px', sm: '12px' },
                        m: { xs: 1, sm: 2 },
                        width: { xs: 'calc(100% - 16px)', sm: 'auto' },
                    },
                }}
            >
                {error && (
                    <Alert severity='error' sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}



                <DialogTitle>
                    <Box display='flex' alignItems='center'>

                        {isEditMode ? 'Редактирование ЛПР' : 'Создание ЛПР'}
                    </Box>
                </DialogTitle>
                {syncStatusContact && (
                    <Alert
                        severity={syncStatusContact?.type}
                        sx={{ mb: 3 }}
                        onClose={() => setSyncStatusContact(null)}
                    >
                        {syncStatusContact?.message}
                    </Alert>
                )}
                <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
                    <Typography variant='body2' color='textSecondary' paragraph>
                        {isEditMode
                            ? 'Отредактируйте данные контакта.'
                            : 'Заполните данные нового контакта.'}
                    </Typography>
                    <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mt: 1 }}>
                        {['name', 'lastName', 'position', 'email', 'phone'].map(field => (
                            <Grid
                                item
                                xs={12}
                                sm={field === 'name' || field === 'lastName' ? 6 : 12}
                                key={field}
                            >
                                <TextField
                                    label={
                                        field === 'name'
                                            ? 'Имя'
                                            : field === 'lastName'
                                                ? 'Фамилия'
                                                : field === 'position'
                                                    ? 'Должность'
                                                    : field === 'email'
                                                        ? 'Email'
                                                        : 'Телефон'
                                    }
                                    fullWidth
                                    variant='outlined'
                                    size='small'
                                    margin='dense'
                                    name={field}
                                    required={field === 'name' || field === 'lastName'}
                                    value={newContact[field as keyof typeof newContact]}
                                    onChange={handleNewContactChange}
                                    type={field === 'email' ? 'email' : 'text'}
                                    InputProps={{
                                        style: {
                                            fontSize: window.innerWidth < 600 ? '0.9rem' : '1rem',
                                        },
                                    }}
                                    InputLabelProps={{
                                        style: {
                                            fontSize: window.innerWidth < 600 ? '0.9rem' : '1rem',
                                        },
                                    }}
                                />
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
                <DialogActions
                    sx={{
                        px: { xs: 2, sm: 3 },
                        py: 2,
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: { xs: 1, sm: 2 },
                    }}
                >
                    <Button
                        onClick={() => {
                            setCreateContactDialogOpen(false)
                            setEditContactId(null)
                            setIsEditMode(false)
                        }}
                        color='inherit'
                        fullWidth
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                        Отмена
                    </Button>
                    <LoadingButton
                        color='primary'
                        variant='contained'
                        onClick={handleSaveContact}
                        loading={isCreatingContact}
                        size={window.innerWidth < 600 ? 'small' : 'medium'}
                        fullWidth
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                        {isEditMode ? 'Сохранить' : 'Создать'}
                    </LoadingButton>
                </DialogActions>
            </Dialog>
            <Dialog
                open={sectionDialogOpen}
                onClose={() => {
                    setSectionDialogOpen(false)
                    setCurrentSection(null)
                }}
                fullWidth
                maxWidth='sm'
            >
                <DialogTitle>
                    {currentSection && currentSection.id
                        ? 'Редактировать секцию'
                        : 'Создать новую секцию'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin='dense'
                        label='Название секции'
                        fullWidth
                        value={currentSection?.name || ''}
                        onChange={e =>
                            setCurrentSection(prev =>
                                prev ? { ...prev, name: e.target.value } : null
                            )
                        }
                        sx={{ mb: 3 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setSectionDialogOpen(false)
                            setCurrentSection(null)
                        }}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={() => currentSection && handleSaveSection(currentSection)}
                        variant='contained'
                        color='primary'
                        disabled={!currentSection?.name}
                    >
                        Сохранить
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={fieldSelectionDialogOpen}
                onClose={() => setFieldSelectionDialogOpen(false)}
                fullWidth
                maxWidth='md'
            >
                <DialogTitle>Выберите поля для добавления в секцию</DialogTitle>
                <DialogContent>
                    {availableFields.length === 0 ? (
                        <Typography variant='body1' sx={{ py: 2 }}>
                            Все доступные поля уже добавлены в секции
                        </Typography>
                    ) : (
                        <>
                            <Typography variant='body2' color='textSecondary' sx={{ mb: 2 }}>
                                Выберите поля, которые хотите добавить в секцию
                            </Typography>
                            <Grid container spacing={2}>
                                {availableFields.map(field => (
                                    <Grid item xs={12} sm={6} md={4} key={field.id}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={selectedFields.includes(field.id.toString())}
                                                    onChange={() =>
                                                        handleFieldSelectionChange(field.id.toString())
                                                    }
                                                />
                                            }
                                            label={
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    {field.field_type === 'address' ? (
                                                        <LocationOnIcon fontSize='small' sx={{ mr: 1 }} />
                                                    ) : field.field_type === 'date' ? (
                                                        <EventIcon fontSize='small' sx={{ mr: 1 }} />
                                                    ) : field.field_type === 'list' ||
                                                        field.field_type === 'enum' ? (
                                                        <ListIcon fontSize='small' sx={{ mr: 1 }} />
                                                    ) : field.field_type === 'boolean' ? (
                                                        <CheckBoxIcon fontSize='small' sx={{ mr: 1 }} />
                                                    ) : (
                                                        <SubjectIcon fontSize='small' sx={{ mr: 1 }} />
                                                    )}
                                                    <Typography variant='body2'>
                                                        {field.display_name}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFieldSelectionDialogOpen(false)}>
                        Отмена
                    </Button>
                    <Button
                        onClick={handleFieldSelection}
                        variant='contained'
                        color='primary'
                        disabled={selectedFields.length === 0}
                    >
                        Добавить выбранные поля
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
            >
                <Alert
                    onClose={() => setSnackbarOpen(false)}
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
            <Dialog open={isErrorModalOpen} onClose={handleCloseModal}>
                <DialogTitle>Ошибка</DialogTitle>
                <DialogContent>
                    <DialogContentText>{modalMessage}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal} color="primary">
                        Закрыть
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    )
}

export default NetworkClinicEditPage
