import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
	MultiFieldDisplay,
	prepareDataForBitrix,
} from '../components/MultiFieldDisplay'

import PastVisitsDialog from '../components/PastVisitsDialog'
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
import { clinicService, ClinicInput, Clinic } from '../services/clinicService'
import { visitService } from '../services/visitService'
import { adminApi, FieldMapping } from '../services/adminApi'
import { Contact } from '../services/contactService'
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
	Person as PersonIcon,
	Phone as PhoneIcon,
	Email as EmailIcon,
	Work as WorkIcon,
	Info as InfoIcon,
	Label as LabelIcon,
	LocationOn as LocationOnIcon,
	Event as EventIcon,
	MonetizationOn as MonetizationOnIcon,
	List as ListIcon,
	Subject as SubjectIcon,
	DragIndicator as DragIndicatorIcon,
	CheckBox as CheckBoxIcon,
	People as PeopleIcon,
} from '@mui/icons-material'
import { api } from '../services/api'
import { getBitrixApiUrl } from '../constants/api'
import { QuantityLoader } from './QuantityLoader'
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
	[key: string]: any
}

// Helper: find bitrix_field_id by semantic app_field_name from fieldMappings
const findBitrixFieldId = (mappings: FieldMapping[], appFieldName: string): string | undefined => {
	return mappings.find(m => m.app_field_name === appFieldName)?.bitrix_field_id
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



const isAddressField = (fieldName: string): boolean => {
	if (fieldName.toLowerCase() === 'address') return true
	const addressKeywords = ['address', 'адрес', 'location']
	return addressKeywords.some(keyword =>
		fieldName.toLowerCase().includes(keyword)
	)
}

export interface CustomSection {
	id: string
	name: string
	order: number
	fields: string[] // ID полей, которые находятся в этой секции
}

const ClinicEditPage: React.FC = () => {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const location = useLocation()
	const queryClient = useQueryClient()
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
	const initialLoadRef = useRef(false)
	const [modalMessage, setModalMessage] = useState('');
	const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

	const syncDoneRef = useRef(false)
	const isNetworkRef = useRef<boolean>(false);
	const [contacts, setContacts] = useState<Contact[]>([])
	const [isContactsLoading, setIsContactsLoading] = useState(false)
	const [createContactDialogOpen, setCreateContactDialogOpen] = useState(false)
	const [editContactId, setEditContactId] = useState<number | null>(null)
	const [newContact, setNewContact] = useState({
		name: '',
		lastName: '',
		position: '',
		email: '',
		phone: '',
	})
	const [isCreatingContact, setIsCreatingContact] = useState(false)
	const [isEditMode, setIsEditMode] = useState(false)
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
	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
	const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
	const [dataFullyLoaded, setDataFullyLoaded] = useState(false)
	const [initialBitrixLoading, setInitialBitrixLoading] = useState(true) // Начинаем с true при первой загрузке

	const [customSections, setCustomSections] = useState<CustomSection[]>([])
	const [sectionDialogOpen, setSectionDialogOpen] = useState(false)
	const [currentSection, setCurrentSection] = useState<CustomSection | null>(
		null
	)
	const [availableFields, setAvailableFields] = useState<FieldMapping[]>([])
	const [draggingField, setDraggingField] = useState<string | null>(null)
	const [snackbarOpen, setSnackbarOpen] = useState(false)
	const [snackbarMessage, setSnackbarMessage] = useState('')
	const [snackbarSeverity, setSnackbarSeverity] = useState<
		'success' | 'error' | 'warning' | 'info'
	>('info')
	const [fieldSelectionDialogOpen, setFieldSelectionDialogOpen] =
		useState(false)
	const [currentSectionForFields, setCurrentSectionForFields] =
		useState<string>('')
	const [selectedFields, setSelectedFields] = useState<string[]>([])
	const [deleteContactId, setDeleteContactId] = useState<number | null>(null)
	const [addressString, setAddressString] = useState<string>('');
	const [addressObject, setAddressObject] = useState<AddressData | null>(null);

	const [snackbar, setSnackbar] = useState<{
		open: boolean
		message: string
		severity: 'success' | 'error'
	}>({
		open: false,
		message: '',
		severity: 'success',
	})

	const showSnackbar = (message: string) => {
		setSnackbarMessage(message);
		setSnackbarOpen(true);
	};



	useEffect(() => {
		isNetworkRef.current = !!formValues.is_network;
	}, [formValues.is_network]);

	const locationState = location.state as {
		bitrixId?: string
		bitrixData?: any
		fromSearch?: boolean
		newBitrixId?: number | string
		directOpen?: boolean
	} | null



	// Унифицированная функция для получения данных клиники из всех источников
	const fetchClinicData = async (forceBitrixSync: boolean = false) => {
		if (locationState?.bitrixData) {
			const bitrixCompany = locationState.bitrixData
			const innBitrixFieldId = findBitrixFieldId(fieldMappings, 'inn')
			const addressBitrixFieldId = findBitrixFieldId(fieldMappings, 'address')

			// Extract INN from bitrix data using dynamic field mapping
			let innValue = bitrixCompany.inn || ''
			if (innBitrixFieldId && innBitrixFieldId in bitrixCompany) {
				innValue = bitrixCompany[innBitrixFieldId] || innValue
			}

			const formattedData: BitrixClinicData = {
				bitrix_id: bitrixCompany.ID,
				name: bitrixCompany.TITLE || '',
				company_type: bitrixCompany.COMPANY_TYPE || '',
				address: cleanAddressString(bitrixCompany.ADDRESS) || '',
				city: bitrixCompany.CITY || '',
				country: bitrixCompany.COUNTRY || '',
				inn: innValue,
				bitrix_data: bitrixCompany,
				dynamic_fields: {},
				sync_status: 'synced',
				last_synced: new Date().toISOString(),
			}
			for (const [key, value] of Object.entries(bitrixCompany)) {
				if (key.startsWith('UF_CRM_')) {
					// Skip the INN field - it is handled as a top-level field
					if (innBitrixFieldId && key === innBitrixFieldId) continue

					const fieldId = key.replace('UF_CRM_', '').toLowerCase()
					const fieldMapping = fieldMappings.find(
						m =>
							m.bitrix_field_id.toLowerCase() === fieldId.toLowerCase() ||
							m.bitrix_field_id === key
					)
					formattedData.dynamic_fields[fieldId] =
						(isAddressField(key) || fieldMapping?.field_type === 'address') &&
							typeof value === 'string'
							? cleanAddressString(value)
							: value
					// If this is the address field from mapping, set the top-level address
					if (
						(addressBitrixFieldId && key === addressBitrixFieldId || !formattedData.address) &&
						typeof value === 'string'
					) {
						formattedData.address = cleanAddressString(value)
					}
				}
				if (key === 'EMAIL' || key === 'PHONE') {
					formattedData.dynamic_fields[key.toLowerCase()] = value
				}
				if (
					isAddressField(key) &&
					typeof value === 'string' &&
					key !== 'ADDRESS' &&
					!formattedData.address
				) {
					formattedData.address = cleanAddressString(value)
				}
			}
			return formattedData
		}

		// Если у нас нет готовых данных, запрашиваем из API с помощью унифицированной функции
		try {
			// Load custom sections if they haven't been loaded yet
			if (customSections.length === 0) {
				await loadGlobalCustomSections()
			}

			// Принудительная синхронизация с Битрикс если:
			// 1. Передан флаг forceBitrixSync или
			// 2. Переход был со страницы поиска с новым ID Битрикса
			const shouldSyncWithBitrix =
				forceBitrixSync ||
				(locationState?.fromSearch && locationState?.newBitrixId)

			// Получаем унифицированные данные клиники
			// Всегда пропускаем запрос к Bitrix, если не требуется принудительная синхронизация
			const skipBitrixValue = !shouldSyncWithBitrix && !forceBitrixSync

			const unifiedData = await clinicService.getUnifiedClinicData(Number(id), {
				forceBitrixSync: !!shouldSyncWithBitrix,
				skipBitrix: true, // Всегда пропускаем запрос к Bitrix, если не указано явно
			})

			const clinicData = unifiedData.localData
			const bitrixData = unifiedData.bitrixData

			if (bitrixData) {
				try {
					// Определим, в каком формате пришли данные (Bitrix или local)
					const isBitrixFormat = bitrixData && 'TITLE' in bitrixData

					// Преобразуем данные из Bitrix в формат BitrixClinicData
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
						inn: '', // Будет установлено ниже после проверки всех возможных источников
						bitrix_data: bitrixData,
						dynamic_fields: {},
						sync_status: 'synced',
						last_synced: new Date().toISOString(),
					}

					// Проверяем все возможные источники для поля ИНН
					let innValue = ''
					const innFieldId = findBitrixFieldId(fieldMappings, 'inn')

					if (isBitrixFormat) {
						// Проверяем наличие ИНН в данных из Bitrix через dynamic mapping
						if (innFieldId && innFieldId in bitrixData && (bitrixData as any)[innFieldId]) {
							innValue = (bitrixData as any)[innFieldId] || ''
						} else if ('inn' in bitrixData) {
							innValue = (bitrixData as any).inn || ''
						}
					} else {
						// Проверяем наличие ИНН в локальных данных
						innValue = (bitrixData as Clinic).inn || ''
					}

					// Если ИНН не найден в данных Bitrix, используем значение из локальных данных
					if (!innValue && clinicData.inn) {
						innValue = clinicData.inn
					}

					// Устанавливаем значение ИНН в основные поля
					formattedData.inn = innValue

					// Сохраняем ИНН в динамических полях using the mapping field ID
					if (innFieldId) {
						formattedData.dynamic_fields[innFieldId] = innValue
						const shortId = innFieldId.replace('UF_CRM_', '').toLowerCase()
						formattedData.dynamic_fields[shortId] = innValue
					}

					return formattedData
				} catch (error) {
					console.error('Ошибка при получении данных из Bitrix:', error)
					return clinicData
				}
			}
			return clinicData
		} catch (error) {
			console.error('Ошибка при получении данных клиники:', error)
			// Возвращаем пустой объект со структурой клиники вместо null
			return {
				bitrix_id: null,
				name: '',
				company_type: '',
				address: '',
				city: '',
				country: '',
				inn: '',
				bitrix_data: {},
				dynamic_fields: {}, // Добавляем пустой объект dynamic_fields
				sync_status: 'error',
				last_synced: new Date().toISOString(),
			} as BitrixClinicData
		}
	}
	const {
		data: clinic,
		isLoading,
		refetch: refetchClinic,
	} = useQuery(['clinic', id, 'static'], () => fetchClinicData(false), {
		enabled: !!id,
		onSuccess: data => {
			if (!data) {
				setError('Не удалось загрузить данные компании')
				return
			}

			const initialValues = { ...data }
			const isNetworkFieldId = findBitrixFieldId(fieldMappings, 'is_network')

			formValues.is_network = (isNetworkFieldId && data.dynamic_fields?.[isNetworkFieldId]) || data.is_network || false
			initialValues.is_network = Boolean(
				data.is_network ||
				(isNetworkFieldId && data.dynamic_fields?.[isNetworkFieldId] === 1)
			)

			// Очищаем адресные поля от служебных данных Bitrix24
			if (initialValues.address) {
				initialValues.address = cleanAddressString(initialValues.address)
			}

			// Создаем копию динамических полей, чтобы не потерять их структуру
			initialValues.dynamic_fields = data.dynamic_fields
				? { ...data.dynamic_fields }
				: {}

			// Очищаем адресные поля в динамических полях
			if (initialValues.dynamic_fields) {
				const addressBitrixId = findBitrixFieldId(fieldMappings, 'address')
				// Build address field keys dynamically from field mapping
				const addressFields = [
					'address',
					'ADDRESS',
					...(addressBitrixId ? [
						addressBitrixId,
						addressBitrixId.toLowerCase(),
						addressBitrixId.replace('UF_CRM_', '').toLowerCase(),
					] : []),
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
			const innBitrixId = findBitrixFieldId(fieldMappings, 'inn')
			const innShortId = innBitrixId ? innBitrixId.replace('UF_CRM_', '').toLowerCase() : ''
			const innFromDynamicFields =
				initialValues.dynamic_fields &&
				(innBitrixId && initialValues.dynamic_fields[innBitrixId] ||
					innShortId && initialValues.dynamic_fields[innShortId])

			// Определяем финальное значение ИНН из всех возможных источников
			const finalInn = initialValues.inn || innFromDynamicFields || ''

			// Сохраняем ИНН в основной структуре данных
			initialValues.inn = finalInn

			// Сохраняем ИНН в динамических полях через mapping
			if (innBitrixId) {
				initialValues.dynamic_fields[innBitrixId] = finalInn
				initialValues.dynamic_fields[innShortId] = finalInn
			}

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
			// Получаем Битрикс ID из текущих данных клиники
			const bitrixId = clinic?.bitrix_id || null


			// Если нет Bitrix ID, не можем получить данные
			if (!bitrixId) {
				console.warn('Не удалось получить Bitrix ID для клиники')
				return null
			}

			// Запрашиваем данные из Bitrix24 напрямую, а не через refetchClinic
			const bitrixData = await clinicService.getClinicById(Number(bitrixId))
			return bitrixData
		} catch (error) {
			console.error('Ошибка при обновлении данных из Bitrix24:', error)
			return null
		} finally {
			setIsBitrixLoading(false)
		}
	}

	const { data: pastVisits, isLoading: isPastVisitsLoading } = useQuery(
		['past_visits', id],
		() => (id ? visitService.getVisitsByCompanyId(Number(id)) : []),
		{ enabled: !!id && pastVisitsDialogOpen, staleTime: 30000 }
	)

	// Создаем специальную функцию для обновления клиники без изменения ИНН
	const updateClinicWithoutInn = async (
		id: number,
		data: Record<string, any>
	) => {

		try {
			// Сначала получаем текущие данные клиники из базы
			const existingClinic = await clinicService.getClinic(id, false)

			// Удаляем все поля, связанные с ИНН из данных
			const { inn, ...dataWithoutInn } = data

			// Чистим динамические поля от всего, что связано с ИНН
			let cleanDynamicFields: Record<string, any> = {}

			// Взять динамические поля из существующих данных в базе
			if (existingClinic.dynamic_fields) {
				// Сохранить только поля ИНН из существующих динамических полей
				const innBitrixId = findBitrixFieldId(fieldMappings, 'inn')
				const innShortId = innBitrixId ? innBitrixId.replace('UF_CRM_', '').toLowerCase() : ''
				const innFields = [
					...(innBitrixId ? [innBitrixId, innBitrixId.toLowerCase()] : []),
					...(innShortId ? [innShortId] : []),
				]
				for (const field of innFields) {
					if (existingClinic.dynamic_fields[field]) {
						cleanDynamicFields[field] = existingClinic.dynamic_fields[field]
					}
				}
			}

			if (data.dynamic_fields) {
				const innBitrixId = findBitrixFieldId(fieldMappings, 'inn')
				const innShortId = innBitrixId ? innBitrixId.replace('UF_CRM_', '').toLowerCase() : ''
				Object.entries(data.dynamic_fields).forEach(([key, value]) => {
					if (
						key !== innBitrixId &&
						key !== innShortId &&
						key !== innBitrixId?.toLowerCase() &&
						!key.includes('inn') &&
						key !== 'inn'
					) {
						cleanDynamicFields[key] = value
					}
				})
			}
			console.log('dataWithoutInn=', dataWithoutInn.address)
			const updateData = {
				name: dataWithoutInn.name || '',
				company_type: dataWithoutInn.company_type || '',
				address: cleanAddressString(dataWithoutInn.address) || '',
				city: dataWithoutInn.city || '',
				country: dataWithoutInn.country || '',
				working_mode: dataWithoutInn.working_mode,
				uses_tokuama: dataWithoutInn.uses_tokuama,
				dynamic_fields: cleanDynamicFields,
				is_network: formValues.is_network
			}

			console.log('update_data=', updateData)

			const response = await api.put(`/clinics/${id}`, updateData)
			return response.data
		} catch (error) {
			console.error('Ошибка при обновлении клиники:', error)
			throw error
		}
	}

	const updateMutation = useMutation(
		async (data: Record<string, any>) => {
			return await updateClinicWithoutInn(Number(id), data)
		},
		{ onSuccess: () => queryClient.invalidateQueries(['clinic', id]) }
	)

	const updateBitrixMutation = useMutation(
		async (data: Record<string, any>) => {
			if (!clinic?.bitrix_id) throw new Error('Bitrix ID not found')
			console.log('DATA in mutations=', data)
			// Очищаем адрес от служебных данных Bitrix24
			const cleanedAddress = data.address
				? cleanAddressString(data.address)
				: ''

			const innBitrixId = findBitrixFieldId(fieldMappings, 'inn')
			const addressBitrixId = findBitrixFieldId(fieldMappings, 'address')
			const addressShortId = addressBitrixId ? addressBitrixId.replace('UF_CRM_', '').toLowerCase() : ''

			const fields: Record<string, any> = {
				TITLE: data.name || '',
				EMAIL: prepareDataForBitrix(data.email || []),
				PHONE: prepareDataForBitrix(data.phone || []),
				id: clinic?.bitrix_id,
				// Жестко задаем тип компании как CUSTOMER
				COMPANY_TYPE: 'CUSTOMER',
				ADDRESS: cleanedAddress,
				...(data.city && { CITY: data.city }),
				...(data.country && { COUNTRY: data.country }),
				// Добавляем ИНН через mapping
				...(innBitrixId && { [innBitrixId]: data.inn || '' }),
				// Добавляем адрес через mapping (short id for backend prefix handling)
				...(addressShortId && { [addressShortId]: cleanedAddress }),
				...Object.fromEntries(
					fieldMappings
						.filter(
							m =>
								m.field_type !== 'crm_multifield' &&
								![
									'name',
									'company_type',
									'address',
									'city',
									'country',
									'inn',
								].includes(m.app_field_name) &&
								m.bitrix_field_id?.startsWith('UF_CRM_')
						)
						.map(m => {
							// Преобразуем значение для enum/list полей
							let value = data[m.app_field_name]


							// Если это списочное поле, ищем соответствующий код в value_options
							if (
								(m.field_type === 'list' || m.field_type === 'enum') &&
								m.value_options
							) {
								try {
									const validJsonString = m.value_options.replace(/'/g, '"');
									const parsedOptions = JSON.parse(validJsonString);



									// Преобразуем значение в строку для корректного сравнения
									const stringValue = String(value)

									const option = parsedOptions.find(
										(opt: any) => String(opt.app_value) === stringValue
									)

									if (option) {
										value = option.bitrix_value

										// Добавляем логи для отладки полей типа enum/list
										console.log(
											`Найдено соответствие для поля ${m.display_name}: ${stringValue} -> ${value}`
										)
									} else {
										// Если не нашли соответствие, пробуем найти по числовому значению
										const numericValue = Number(value)
										if (!isNaN(numericValue)) {
											const numericOption = parsedOptions.find(
												(opt: any) => Number(opt.app_value) === numericValue
											)

											if (numericOption) {
												value = numericOption.bitrix_value


											}
										}
									}
								} catch (error) {
									console.error(
										`Ошибка при парсинге value_options для поля ${m.display_name}:`,
										error
									)
								}
							}

							return [m.bitrix_field_id, value]
						})
						.filter(([_, v]) => v !== undefined && v !== null && v !== '')
				),
			}

			// Добавляем адрес в поле из mapping
			if (cleanedAddress && addressBitrixId) {
				fields[addressBitrixId] = cleanedAddress
			}

			console.log('Отправка данных для обновления в Bitrix24:', {
				id: clinic.bitrix_id,
				fields,
			})



			return clinicService.updateClinicInBitrix({
				id: clinic?.id,
				fields,

			}, isNetworkRef.current)
		}
	)


	// Обработчик успешной загрузки маппингов
	const handleFieldMappingsLoaded = useCallback((data: FieldMapping[]) => {

		// Сохраняем маппинги
		setFieldMappings(data)
	}, [])

	// Загружаем маппинги полей для клиники
	const { isLoading: isFieldMappingsLoading } =
		useQuery(
			['fieldMappings', 'clinic'],
			() => adminApi.getPublicFieldMappings('clinic'),
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

	// Хук для загрузки контактов компании
	const loadContactsForCompany = useCallback(
		async (companyId: number) => {
			setIsContactsLoading(true)
			try {
				const bitrixId = clinic?.bitrix_id
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

	// Обработчик синхронизации с Bitrix24
	const handleBitrixSync = useCallback(
		async (forceRefresh: boolean = true): Promise<void> => {
			if (!clinic?.bitrix_id) {
				alert(
					'Не найден ID компании для синхронизации. Сначала сохраните компанию.'
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


				// Получаем свежие данные из Bitrix24 с принудительным обновлением кэша
				const freshData = await clinicService.getClinicById(
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
						!m.bitrix_field_id?.startsWith('UF_CRM_') &&
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
				const syncInnFieldId = findBitrixFieldId(fieldMappings, 'inn')
				for (const [key, value] of Object.entries(freshData as any)) {
					// Обработка динамических полей UF_CRM_*
					if (key.startsWith('UF_CRM_')) {
						// Skip INN field - handled as top-level field
						if (syncInnFieldId && key === syncInnFieldId) {
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
							// Обработка мультиполей (email, телефон)
							else if (
								mapping.field_type === 'crm_multifield' ||
								(Array.isArray(value) &&
									(key.includes('EMAIL') || key.includes('PHONE')))
							) {
								processedValue = Array.isArray(value)
									? value.map((item: any) => ({
										ID: item.ID,
										VALUE: item.VALUE || '',
										VALUE_TYPE: item.VALUE_TYPE || item.TYPE || 'WORK',
										TYPE_ID: key.includes('EMAIL') ? 'EMAIL' : 'PHONE',
									}))
									: []
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
					// Обработка полей EMAIL и PHONE
					else if (
						(key === 'EMAIL' || key === 'PHONE') &&
						Array.isArray(value)
					) {
						const normalizedValue = value.map(item => ({
							ID: item.ID,
							VALUE: item.VALUE || '',
							VALUE_TYPE: item.VALUE_TYPE || item.TYPE || 'WORK',
							TYPE_ID: key === 'EMAIL' ? 'EMAIL' : 'PHONE',
						}))

						if (
							JSON.stringify(normalizedValue) !==
							JSON.stringify(formValues[key.toLowerCase()])
						) {
							updatedValues[key.toLowerCase()] = normalizedValue
							dynamicFields[key.toLowerCase()] = normalizedValue
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

					const mergeInnFieldId = findBitrixFieldId(fieldMappings, 'inn')
					const mergeInnShortId = mergeInnFieldId ? mergeInnFieldId.replace('UF_CRM_', '').toLowerCase() : ''
					// Проверяем наличие ИНН в разных форматах
					const innFromDynamicFields =
						mergedDynamicFields &&
						(mergedDynamicFields['inn'] || (mergeInnShortId && mergedDynamicFields[mergeInnShortId]))

					// Приоритет: 1) ИНН из обновленных значений, 2) ИНН из динамических полей
					const finalInn = updatedValues.inn || innFromDynamicFields || ''

					// Сохраняем ИНН в основной структуре данных
					updatedValues.inn = finalInn

					// Сохраняем ИНН в динамических полях через mapping
					if (mergeInnFieldId) {
						mergedDynamicFields[mergeInnFieldId] = finalInn
						mergedDynamicFields[mergeInnShortId] = finalInn
					}

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
					'Не удалось получить данные. Пожалуйста, попробуйте позже.'
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
	useEffect(() => {
		// Используем реф для отслеживания первой загрузки
		const isFirstLoad = initialLoadRef.current
		if (id && (isFirstLoad || isLoading === false)) {
			loadContactsForCompany(Number(id))
		}
	}, [id, loadContactsForCompany, isLoading])

	// Dedicated effect for loading custom sections
	const loadGlobalCustomSections = async (forceReload = false) => {
		try {
			const sections = await customSectionService.getCustomSections()

			if (sections && sections.length > 0) {
				setCustomSections(sections)
				return true
			} else {
				// Create default sections if none exist
				const defaultSections = [
					{
						id: 'default-section-' + Date.now(), // Уникальный ID для предотвращения конфликтов
						name: 'Основная информация',
						order: 1,
						fields: [],
					},
					{
						id: 'contacts-section-' + Date.now(), // Уникальный ID для предотвращения конфликтов
						name: 'Потенциал',
						order: 2,
						fields: [],
					},
				]

				// Сохраняем стандартные секции
				const result = await customSectionService.saveCustomSections(
					defaultSections
				)
				if (result) {
					setCustomSections(defaultSections)
					return true
				} else {
					setCustomSections(defaultSections) // Всё равно установим в интерфейсе
					return false
				}
			}
		} catch (error) {
			console.error('Error loading global custom sections:', error)
			// Fallback to default section
			const fallbackSection = [
				{
					id: 'fallback-section-' + Date.now(), // Уникальный ID
					name: 'Основная информация',
					order: 1,
					fields: [],
				},
			]
			setCustomSections(fallbackSection)
			return false
		}
	}

	// Эффект для загрузки глобальных секций
	useEffect(() => {
		const loadSections = async () => {
			setIsSaving(true) // Update loading state for sections
			try {
				const success = await loadGlobalCustomSections()
				if (!success) {
					console.warn('Failed to load custom sections, using defaults')
				}
			} catch (error) {
				console.error('Error in custom sections loading effect:', error)
			} finally {
				setIsSaving(false) // Reset loading state for sections
			}
		}

		loadSections()
	}, [])

	// Эффект для автоматической синхронизации с Bitrix24 при загрузке данных клиники
	useEffect(() => {
		if (
			clinic?.bitrix_id &&
			!isLoading &&
			!isFieldMappingsLoading &&
			fieldMappings.length > 0 &&
			!syncDoneRef.current
		) {
			syncDoneRef.current = true // Устанавливаем флаг, чтобы не запускать повторно
			handleBitrixSync()
		}
	}, [
		clinic?.bitrix_id,
		handleBitrixSync,
		isLoading,
		isFieldMappingsLoading,
		fieldMappings,
	])

	// Эффект для обработки перехода с новым ID Битрикса
	useEffect(() => {
		// При первом монтировании компонента инвалидируем кэш для принудительной загрузки
		if (id && !initialLoadRef.current) {
			queryClient.removeQueries(['clinic', id.toString()])
			queryClient.removeQueries(['clinic', id.toString(), 'static'])
			queryClient.removeQueries(['clinic', id.toString(), 'bitrix'])
			initialLoadRef.current = true
		}

		if (locationState?.fromSearch && locationState?.newBitrixId && id) {
			// Устанавливаем флаг, что нужно принудительно загрузить данные из Битрикса
			// Принудительно запрашиваем данные клиники заново и инвалидируем кэш
			queryClient.removeQueries(['clinic', id.toString()])
			setTimeout(() => refetchClinic(), 100)
		} else if (locationState?.directOpen && id) {
			// Принудительно инвалидируем кэш и запрашиваем данные клиники заново
			queryClient.removeQueries(['clinic', id.toString()])
			setTimeout(() => refetchClinic(), 100)
		}

		// Функция очистки, которая выполнится при размонтировании компонента
		return () => {
			// Полностью удаляем кэш для данных клиники при уходе со страницы
			if (id) {
				// Используем removeQueries вместо invalidateQueries для полного удаления кэша
				queryClient.removeQueries(['clinic', id.toString()])
				queryClient.removeQueries(['clinic', id.toString(), 'static'])
				queryClient.removeQueries(['clinic', id.toString(), 'bitrix'])
				// Сбрасываем флаг синхронизации
				syncStarted.current = false
			}
		}
	}, [id, locationState, refetchClinic, queryClient])

	// Флаг для отслеживания, была ли уже запущена синхронизация
	const syncStarted = useRef(false)

	// Эффект для настройки и запуска загрузки данных из Bitrix
	useEffect(() => {
		if (id && clinic) {
			// Если у клиники есть bitrix_id и синхронизация еще не запущена
			if (clinic.bitrix_id && !syncStarted.current && !dataFullyLoaded) {
				// Устанавливаем флаг, что синхронизация была запущена
				syncStarted.current = true

				// Установка таймаута для кнопки "Продолжить без ожидания"
				setTimeout(() => {
					setBitrixTimeout(true)
				}, 5000) // 5 секунд

				// Запускаем загрузку данных из Bitrix через оптимизированную функцию
				refetchBitrix()
					.then(bitrixData => {
						// Проверяем, что получены данные из Bitrix24
						if (bitrixData) {
							console.log('Получены данные из Bitrix24:', bitrixData)
							// Проверяем наличие поля ИНН через mapping
							const loadInnFieldId = findBitrixFieldId(fieldMappings, 'inn')
							const loadInnShortId = loadInnFieldId ? loadInnFieldId.replace('UF_CRM_', '').toLowerCase() : ''
							if (loadInnFieldId && loadInnFieldId in bitrixData) {
								const innValue = (bitrixData as any)[loadInnFieldId] || ''

								// Обновляем только поле ИНН, не переписывая всю форму
								setFormValues(prev => ({
									...prev,
									inn: innValue,
									dynamic_fields: {
										...prev.dynamic_fields,
										...(loadInnFieldId && { [loadInnFieldId]: innValue }),
										...(loadInnShortId && { [loadInnShortId]: innValue }),
									},
								}))
							}

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
				// Если нет bitrix_id, просто устанавливаем dataFullyLoaded в true
				setDataFullyLoaded(true)
				setInitialBitrixLoading(false)
			}
		} else {
			// При первой загрузке страницы показываем лоадер
			setInitialBitrixLoading(true)
		}
	}, [id, clinic, dataFullyLoaded, refetchBitrix])

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
					'Не найден ID компании для синхронизации. Сначала сохраните компанию.',
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
			const freshData = await clinicService.getClinicById(clinic.bitrix_id)

			if (!freshData) {
				throw new Error('Не удалось получить данные из Bitrix24')
			}

			const updatedValues = { ...formValues }
			let hasChanges = false
			const dynamicFields: Record<string, any> = {}

			// Обработка полей из маппинга, которые не являются динамическими
			fieldMappings.forEach(m => {
				if (
					!m.bitrix_field_id?.startsWith('UF_CRM_') &&
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
			const sync2InnFieldId = findBitrixFieldId(fieldMappings, 'inn')
			for (const [key, value] of Object.entries(freshData as any)) {
				// Обработка динамических полей UF_CRM_*
				if (key.startsWith('UF_CRM_')) {
					// Skip INN field - handled as top-level field
					if (sync2InnFieldId && key === sync2InnFieldId) {
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
						// Обработка мультиполей (email, телефон)
						else if (
							mapping.field_type === 'crm_multifield' ||
							(Array.isArray(value) &&
								(key.includes('EMAIL') || key.includes('PHONE')))
						) {
							processedValue = Array.isArray(value)
								? value.map((item: any) => ({
									ID: item.ID,
									VALUE: item.VALUE || '',
									VALUE_TYPE: item.VALUE_TYPE || item.TYPE || 'WORK',
									TYPE_ID: key.includes('EMAIL') ? 'EMAIL' : 'PHONE',
								}))
								: []
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
				// Обработка полей EMAIL и PHONE
				else if ((key === 'EMAIL' || key === 'PHONE') && Array.isArray(value)) {
					const normalizedValue = value.map(item => ({
						ID: item.ID,
						VALUE: item.VALUE || '',
						VALUE_TYPE: item.VALUE_TYPE || item.TYPE || 'WORK',
						TYPE_ID: key === 'EMAIL' ? 'EMAIL' : 'PHONE',
					}))

					if (
						JSON.stringify(normalizedValue) !==
						JSON.stringify(formValues[key.toLowerCase()])
					) {
						updatedValues[key.toLowerCase()] = normalizedValue
						dynamicFields[key.toLowerCase()] = normalizedValue
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

				const sync2MergeInnId = findBitrixFieldId(fieldMappings, 'inn')
				const sync2MergeInnShortId = sync2MergeInnId ? sync2MergeInnId.replace('UF_CRM_', '').toLowerCase() : ''
				// Проверяем наличие ИНН в разных форматах
				const innFromDynamicFields =
					mergedDynamicFields &&
					(mergedDynamicFields['inn'] || (sync2MergeInnShortId && mergedDynamicFields[sync2MergeInnShortId]))

				// Приоритет: 1) ИНН из обновленных значений, 2) ИНН из динамических полей
				const finalInn = updatedValues.inn || innFromDynamicFields || ''

				// Сохраняем ИНН в основной структуре данных
				updatedValues.inn = finalInn

				// Сохраняем ИНН в динамических полях через mapping
				if (sync2MergeInnId) {
					mergedDynamicFields[sync2MergeInnId] = finalInn
					mergedDynamicFields[sync2MergeInnShortId] = finalInn
				}

				// Устанавливаем обновленные динамические поля
				updatedValues.dynamic_fields = mergedDynamicFields

				// Обновляем форму
				setFormValues(updatedValues)
				setIsBitrixSyncSuccess(true)
				setTimeout(() => setIsBitrixSyncSuccess(false), 3000)
			}

			setSyncStatus({
				type: 'success',
				message: 'Синхронизация выполнена успешно',
			})
		} catch (err) {
			console.error('Ошибка при синхронизации с Bitrix24:', err)
			setSyncStatus({
				type: 'error',
				message:
					'Не удалось синхронизировать данные. Пожалуйста, попробуйте позже.',
			})
		} finally {
			setIsSyncing(false)
		}
	}, [clinic?.bitrix_id, fieldMappings, formValues, refetchBitrix])
	// Эффект для инициализации при первом рендере
	useEffect(() => {
		if (id && !clinic) {
			// При первой загрузке страницы показываем лоадер
			setInitialBitrixLoading(true)
		}
	}, [id, clinic, dataFullyLoaded, syncWithBitrix])

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



	const handleNewContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setNewContact(prev => ({ ...prev, [e.target.name]: e.target.value }))
	}

	const handleSaveContact = async () => {
		setIsCreatingContact(true)
		try {
			if (!clinic?.bitrix_id) throw new Error('Clinic Bitrix ID missing')
			const contactData = {
				fields: {
					NAME: newContact.name,
					LAST_NAME: newContact.lastName,
					POST: newContact.position,
					COMPANY_ID: clinic.bitrix_id,
					EMAIL: newContact.email
						? [{ VALUE: newContact.email, VALUE_TYPE: 'WORK' }]
						: [],
					PHONE: newContact.phone
						? [{ VALUE: newContact.phone, VALUE_TYPE: 'WORK' }]
						: [],
				},
			}
			const response = await fetch(
				`${process.env.REACT_APP_BITRIX_URL || '/api/bitrix/'}crm.contact.${isEditMode && editContactId ? 'update' : 'add'
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
				await loadContactsForCompany(Number(id))
				setCreateContactDialogOpen(false)
				setEditContactId(null)
				setIsEditMode(false)
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

	const handleEditContact = (contactId: number) => {
		const contact = contacts.find(c => c.id === contactId)
		if (contact) {
			const nameParts = contact.name.split(' ')
			setNewContact({
				name: nameParts[0] || '',
				lastName: nameParts.slice(1).join(' ') || '',
				position: contact.position || '',
				email: contact.email || '',
				phone: contact.phone || '',
			})
			setEditContactId(contactId)
			setIsEditMode(true)
			setCreateContactDialogOpen(true)
		}
	}

	const handleFieldChange = (fieldName: string, value: any) => {
		// Очистка адресных полей от служебных данных Bitrix24
		let processedValue = value
		// Проверяем, является ли поле адресным
		if (
			fieldName === 'address' ||
			isAddressField(fieldName) ||
			fieldName.includes('address')
		) {
			// Очищаем адрес от служебных данных Bitrix24
			processedValue = cleanAddressString(value)

		}

		// Специальная обработка для поля ИНН
		if (fieldName === 'inn') {
			const innFieldId = findBitrixFieldId(fieldMappings, 'inn')
			const innShortId = innFieldId ? innFieldId.replace('UF_CRM_', '').toLowerCase() : ''
			// Обновляем значение в форме с обновлением динамических полей
			setFormValues(prev => {
				const dynamic_fields = prev.dynamic_fields
					? { ...prev.dynamic_fields }
					: {}

				// Сохраняем ИНН в динамических полях через mapping
				if (innFieldId) {
					dynamic_fields[innFieldId] = processedValue
					dynamic_fields[innShortId] = processedValue
				}

				return { ...prev, [fieldName]: processedValue, dynamic_fields }
			})
		} else if (fieldName === 'address') {
			const addrFieldId = findBitrixFieldId(fieldMappings, 'address')
			const addrShortId = addrFieldId ? addrFieldId.replace('UF_CRM_', '').toLowerCase() : ''
			// Специальная обработка для адресных полей
			setFormValues(prev => {
				const dynamic_fields = prev.dynamic_fields
					? { ...prev.dynamic_fields }
					: {}

				// Обновляем адрес в стандартных форматах
				dynamic_fields['address'] = processedValue
				dynamic_fields['ADDRESS'] = processedValue

				// Обновляем адрес через mapping
				if (addrFieldId) {
					dynamic_fields[addrFieldId] = processedValue
					dynamic_fields[addrFieldId.toLowerCase()] = processedValue
					dynamic_fields[addrShortId] = processedValue
				}

				return {
					...prev,
					[fieldName]: processedValue,
					ADDRESS: processedValue,
					dynamic_fields,
				}
			})
		} else {
			// Стандартная обработка для других полей
			setFormValues(prev => ({ ...prev, [fieldName]: processedValue }))
		}

		// Удаляем ошибки после изменения поля
		if (formErrors[fieldName]) {
			setFormErrors(prev => {
				const newErrors = { ...prev }
				delete newErrors[fieldName]
				return newErrors
			})
		}
	}

	const renderFieldByType = (
		mapping: FieldMapping,
		fieldName: string,
		displayValue: any,
		fieldError: string | undefined,
		fieldIcon: React.ReactNode,
		isReadonly = false
	) => {
		// Мультиполе (телефон/email)
		if (mapping.field_type === 'address') {
			return (
				<AddressAutocomplete
					value={{
						object: addressObject,
						string: addressString || displayValue,
					}}
					onChange={handleChange}
				// onChange={(newValue) => addressChanged(fieldName, newValue)}
				/>
			);
		}
		// Check if this is the is_network field by app_field_name from mapping
		if (mapping.app_field_name === 'is_network' || mapping.display_name?.includes('Сетевая')) {
			const isNetworkBitrixId = mapping.bitrix_field_id
			return (
				<FormControlLabel
					control={
						<Switch
							checked={!!formValues.is_network}
							onChange={(e) => {
								const newValue = e.target.checked;
								setFormValues((prev) => ({
									...prev,
									is_network: newValue,
									dynamic_fields: {
										...prev.dynamic_fields,
										...(isNetworkBitrixId && { [isNetworkBitrixId]: newValue ? 1 : 0 }),
									},
								}));
								if (clinic?.id) {
									clinicService.updateNetworkClinicStatus().catch((error) => {
										console.error('Ошибка при обновлении статуса сети клиники:', error);
									});
								}
							}}
						/>
					}
					label={mapping.display_name}
					sx={{ marginLeft: 0 }}
				/>
			)
		}
		// Check for the branch count field by display_name
		if (mapping.display_name === 'Количество филиалов') {
			return (
				<Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
					{/* QuantityLoader */}
					<QuantityLoader clinicId={clinic?.id} />

					{/* Кнопка "Филиалы" */}
					<Button
						variant="contained"
						color="primary"
						onClick={() => navigate(`/networkClinics/${clinic?.id}`)}
						disabled={!formValues.is_network}
						fullWidth
						sx={{
							mt: 1,
							alignSelf: 'stretch',
							whiteSpace: 'nowrap',
							maxWidth: '100%',
						}}
					>
						Филиалы
					</Button>
				</Box>)
		}
		if (mapping.field_type === 'crm_multifield') {
			return (
				<MultiFieldDisplay
					fieldName={fieldName}
					displayName={mapping.display_name}
					values={displayValue || []}
					onChange={(name, value) => handleFieldChange(name, value)}
					typeId={fieldName.includes('email') ? 'EMAIL' : 'PHONE'}
					icon={fieldIcon}
				/>
			)
		}

		// Строка или адрес
		if ((mapping.field_type === 'string' || mapping.field_type === 'address') && !fieldName.includes('Количество фил')) {
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
					disabled={isReadonly}
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
		if (mapping.field_type === 'number' && !fieldName.includes('Количество фил')) {
			return (
				<TextField
					label={mapping.display_name}
					value={displayValue}
					disabled={isReadonly}
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
			let options = []
			if (mapping.value_options) {
				try {
					const validJsonString = mapping.value_options.replace(/'/g, '"');
					const parsedOptions = JSON.parse(validJsonString);
					options = parsedOptions.map((opt: any) => ({
						label: opt.VALUE,
						value: opt.ID,
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
		const submitAddrFieldId = findBitrixFieldId(fieldMappings, 'address')
		const checkedAddress = formValues.address || (submitAddrFieldId && formValues.dynamic_fields?.[submitAddrFieldId]) || ''
		if (checkedAddress) {
			const result = await validateAddress(checkedAddress);
			if (!result.success) {

				setModalMessage(
					'Ошибка при валидации адреса. Пожалуйста, проверьте данные и попробуйте еще раз.'
				);
				setIsErrorModalOpen(true);
				return
			}
		}
		await saveCompanyAddress()
		setIsSaving(true)
		try {
			await updateMutation.mutateAsync(formValues)


			const sectionsToSave = customSections
				.filter(section => section.name && section.name.trim() !== '')
				.map((section, index) => ({
					...section,
					name: section.name.trim(),
					order: index + 1,
					id: section.id || `section-${Date.now()}-${index}`,
				}))

			if (sectionsToSave.length > 0) {
				await saveGlobalCustomSections(sectionsToSave)
			}

			if (clinic?.bitrix_id) await onSubmitToBitrix()

			setSyncStatus({
				type: 'success',
				message: 'Компания успешно обновлена',
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

	const onSubmitToBitrix = async () => {
		const newErrors: Record<string, string> = {};
		fieldMappings.forEach(m => {
			if (m.is_required && !formValues[m.app_field_name]) {
				newErrors[m.app_field_name] = `Field ${m.display_name} is required`;
			}
		});
		if (Object.keys(newErrors).length) {
			setFormErrors(newErrors);
			return;
		}
		if (!clinic?.bitrix_id) return;

		const dataToSend = { ...formValues };
		console.log("DATATOSEND=", dataToSend)
		const dynamicFields: Record<string, any> = {};

		// Use field mappings to populate dynamic fields
		const btxAddrId = findBitrixFieldId(fieldMappings, 'address')
		const btxAddrShortId = btxAddrId ? btxAddrId.replace('UF_CRM_', '').toLowerCase() : ''
		const btxInnId = findBitrixFieldId(fieldMappings, 'inn')
		const btxInnShortId = btxInnId ? btxInnId.replace('UF_CRM_', '').toLowerCase() : ''
		const btxNetworkId = findBitrixFieldId(fieldMappings, 'is_network')
		const btxNetworkShortId = btxNetworkId ? btxNetworkId.replace('UF_CRM_', '').toLowerCase() : ''

		const cleanedAddress =
			(btxAddrShortId && dataToSend[btxAddrShortId]) ||
			dataToSend.address ||
			(btxAddrShortId && dataToSend.dynamic_fields?.[btxAddrShortId]) ||
			'';
		if (btxAddrShortId) dynamicFields[btxAddrShortId] = cleanedAddress;
		if (btxAddrId) dynamicFields[btxAddrId] = cleanedAddress;

		const innValue = dataToSend.inn || (btxInnShortId && dataToSend.dynamic_fields?.[btxInnShortId]) || '';
		if (btxInnShortId) dynamicFields[btxInnShortId] = innValue;
		if (btxInnId) dynamicFields[btxInnId] = innValue;

		// Populate all other UF_CRM fields from fieldMappings dynamically
		fieldMappings.forEach(m => {
			if (m.bitrix_field_id?.startsWith('UF_CRM_') &&
				m.app_field_name !== 'inn' &&
				m.app_field_name !== 'address' &&
				m.app_field_name !== 'is_network') {
				const shortId = m.bitrix_field_id.replace('UF_CRM_', '').toLowerCase()
				const val = dataToSend[m.app_field_name]
				if (val !== undefined) {
					dynamicFields[shortId] = val
					dynamicFields[m.bitrix_field_id] = val
				}
			}
		})

		if (dataToSend.is_network !== undefined) {
			if (btxNetworkShortId) dynamicFields[btxNetworkShortId] = dataToSend.is_network ? 1 : 0;
			if (btxNetworkId) dynamicFields[btxNetworkId] = dataToSend.is_network ? 1 : 0;
		}

		dataToSend.dynamic_fields = dynamicFields;

		console.log('✅ dataToSend for Bitrix:', dataToSend);

		setIsSaving(true);
		await saveAddressToLocalDB()
		try {
			await updateBitrixMutation.mutateAsync(dataToSend);
			await new Promise(resolve => setTimeout(resolve, 2000));
			syncDoneRef.current = false;
			await handleBitrixSync(true);
		} catch (error: any) {
			console.error('Ошибка при сохранении данных в Bitrix24:', error);
			alert(`Ошибка при сохранении данных: ${error?.message || 'Неизвестная ошибка'}`);
		} finally {
			setIsSaving(false);
		}
	};

	// Функция для очистки динамических полей перед отправкой в Bitrix24
	const cleanDynamicFields = (dynamicFields: Record<string, any> = {}) => {
		// Создаем копию объекта, чтобы не изменять оригинал
		const cleanedFields = { ...dynamicFields }

		// Build list of fields to remove dynamically
		const fieldsToRemove: string[] = [
			'ADDRESS', // Поле ADDRESS
			'UF_CRM_ADDRESS', // Поле UF_CRM_ADDRESS

		]

		// Удаляем указанные поля
		fieldsToRemove.forEach(field => {
			if (field in cleanedFields) {
				delete cleanedFields[field]
			}
		})

		return cleanedFields
	}

	// Функция для сохранения адреса из Bitrix в локальную базу данных
	const saveAddressToLocalDB = async () => {
		// Проверяем наличие ID клиники и адреса в форме

		try {
			// Получаем текущие данные клиники для сохранения всех динамических полей
			const currentClinicData = await clinicService.getClinic(Number(id))
			console.log('Текущие данные клиники:', currentClinicData)

			// Создаем копию всех динамических полей из текущих данных
			const existingDynamicFields = currentClinicData?.dynamic_fields || {}
			const formDynamicFields = formValues.dynamic_fields || {}

			// Очищаем динамические поля от ненужных значений
			const cleanedFormDynamicFields = cleanDynamicFields(formDynamicFields)

			// Создаем новый объект динамических полей, полностью заменяющий старый
			const mergedDynamicFields = {
				// Базовые поля из существующих данных
				...existingDynamicFields,
				// Новые поля из формы (очищенные)
				...cleanedFormDynamicFields,
			}

			// Подготавливаем данные для обновления
			const updateData: ClinicInput = {
				name: formValues.name || '',
				company_type: formValues.company_type || '',
				address: cleanAddressString(formValues.address) || '',
				city: formValues.city || '',
				country: formValues.country || '',
				// Принудительно устанавливаем новый объект, чтобы SQLAlchemy заметил изменения
				dynamic_fields: JSON.parse(JSON.stringify(mergedDynamicFields)),
			}
			console.log('Подготовленные данные для обновления:', updateData)

			// Если есть ИНН, добавляем его
			if (formValues.inn) {
				updateData.inn = formValues.inn
			}

			// Добавляем адрес в динамические поля в всех необходимых форматах
			if (updateData.address) {
				// Добавляем _force_update_ ключ для принудительного обновления JSONB в PostgreSQL
				// Это обходное решение для проблемы с SQLAlchemy
				const timestampKey = `_force_update_${new Date().getTime()}`

				// Создаем полностью новый объект dynamic_fields
				const tempDynamicFields = {
					// Копируем существующие поля
					...(updateData.dynamic_fields || {}),
					// Добавляем временный ключ для принудительного обновления
					[timestampKey]: true,
				}

				const cleanedAddress = cleanAddressString(updateData.address)

				// Создаем список всех необходимых ключей для адреса
				// Ищем все возможные адресные ключи — без хардкода UF_CRM_ ID
				const addressKeys = [
					'address',
					'ADDRESS',
					// Динамически добавляем Bitrix-ключи из fieldMappings
					...fieldMappings
						.filter(m => m.app_field_name?.toLowerCase().includes('address') || m.display_name?.toLowerCase().includes('адрес'))
						.map(m => m.bitrix_field_id)
						.filter(Boolean),
				]

				// Ищем специальное поле адреса в маппинге
				const addressFieldMapping = fieldMappings.find(
					(m: any) =>
						m.field_type === 'address' || isAddressField(m.app_field_name)
				)

				// Если найдено специальное поле адреса, добавляем его в список ключей
				if (addressFieldMapping && addressFieldMapping.bitrix_field_id) {
					const fieldId = addressFieldMapping.bitrix_field_id
						.replace('UF_CRM_', '')
						.toLowerCase()
					addressKeys.push(fieldId) // ID без префикса
					addressKeys.push(`uf_crm_${fieldId}`) // ID с префиксом в нижнем регистре
					addressKeys.push(addressFieldMapping.bitrix_field_id) // Оригинальный ID с префиксом
				}

				// Устанавливаем адрес для всех ключей
				addressKeys.forEach(key => {
					tempDynamicFields[key] = cleanedAddress
				})

				// Добавляем формат Bitrix с разделителем |;| для адресных полей из маппинга
				const bitrixFormat = `${cleanedAddress}|;|12882`
				const addressBitrixMapping = fieldMappings.find(
					m => m.app_field_name?.toLowerCase().includes('address') && m.bitrix_field_id
				)
				if (addressBitrixMapping?.bitrix_field_id) {
					tempDynamicFields[addressBitrixMapping.bitrix_field_id] = bitrixFormat
				}

				// Принудительно создаем новый объект с использованием JSON.stringify/parse
				// для гарантированного разрыва связи с оригинальным объектом
				updateData.dynamic_fields = JSON.parse(
					JSON.stringify(tempDynamicFields)
				)

				// Дополнительно обновляем основные поля
				updateData.address = cleanedAddress // Существует вероятность, что изменение базового поля вызовет обновление
			}



			// Проверяем, что dynamic_fields присутствует и не пуст
			if (
				!updateData.dynamic_fields ||
				Object.keys(updateData.dynamic_fields).length === 0
			) {
				console.warn('Динамические поля пусты или отсутствуют!')
			}

			// Выполняем обновление
			const updatedClinic = await clinicService.updateClinic(
				Number(id),
				updateData
			)

			// Проверяем результат обновления
			console.log('Результат обновления клиники:', updatedClinic)


			// Обновляем форму с новыми данными, чтобы сохранить динамические поля
			setFormValues(prev => ({
				...prev,
				dynamic_fields: updatedClinic.dynamic_fields || prev.dynamic_fields,
			}))
		} catch (error) {
			console.error('Ошибка при сохранении адреса в локальную БД:', error)
			if (error instanceof Error) {
				console.error('Детали ошибки:', error.message)
			}
		}
	}



	const confirmDeleteContact = async () => {
		if (!clinic?.bitrix_id) return

		try {
			const response = await fetch(
				`${process.env.REACT_APP_BITRIX_URL || '/api/bitrix/'}crm.contact.delete`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ id: deleteContactId }),
				}
			)
			if (!response.ok) throw new Error('Failed to delete contact')
			const data = await response.json()
			if (data.result) {
				await loadContactsForCompany(Number(id))
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
						Загрузка данных компании...
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

	const handleEditSection = (section: CustomSection) => {
		// Проверяем, является ли пользователь администратором
		if (!userProfile?.is_admin) {
			// Если пользователь не администратор, показываем сообщение
			setSnackbarMessage('Только администраторы могут редактировать разделы')
			setSnackbarSeverity('warning')
			setSnackbarOpen(true)
			return
		}

		setCurrentSection(section)
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

	const handleDeleteSection = (sectionId: string) => {
		// Проверяем, является ли пользователь администратором
		if (!userProfile?.is_admin) {
			// Если пользователь не администратор, показываем сообщение
			setSnackbarMessage('Только администраторы могут удалять разделы')
			setSnackbarSeverity('warning')
			setSnackbarOpen(true)
			return
		}

		setCustomSections(prev => prev.filter(s => s.id !== sectionId))
	}

	const handleAddFieldToSection = (sectionId: string, fieldId: string) => {
		// Проверяем, является ли пользователь администратором
		if (!userProfile?.is_admin) {
			// Если пользователь не администратор, показываем сообщение
			setSnackbarMessage('Только администраторы могут добавлять поля в разделы')
			setSnackbarSeverity('warning')
			setSnackbarOpen(true)
			return
		}

		setCustomSections(prev =>
			prev.map(section => {
				if (section.id === sectionId) {
					return {
						...section,
						fields: [...section.fields, fieldId],
					}
				}
				return section
			})
		)
	}

	const handleRemoveFieldFromSection = (sectionId: string, fieldId: string) => {
		// Проверяем, является ли пользователь администратором
		if (!userProfile?.is_admin) {
			// Если пользователь не администратор, показываем сообщение
			setSnackbarMessage('Только администраторы могут удалять поля из разделов')
			setSnackbarSeverity('warning')
			setSnackbarOpen(true)
			return
		}

		setCustomSections(prev =>
			prev.map(section => {
				if (section.id === sectionId) {
					return {
						...section,
						fields: section.fields.filter(id => id !== fieldId),
					}
				}
				return section
			})
		)
	}

	const handleDragStart = (fieldId: string) => {
		// Проверяем, является ли пользователь администратором
		if (!userProfile?.is_admin) {
			// Если пользователь не администратор, показываем сообщение
			setSnackbarMessage('Только администраторы могут перемещать поля')
			setSnackbarSeverity('warning')
			setSnackbarOpen(true)
			return
		}

		setDraggingField(fieldId)
	}

	const handleDrop = (sectionId: string) => {
		if (draggingField) {
			// Проверяем, является ли пользователь администратором
			if (!userProfile?.is_admin) {
				// Если пользователь не администратор, показываем сообщение
				setSnackbarMessage('Только администраторы могут перемещать поля')
				setSnackbarSeverity('warning')
				setSnackbarOpen(true)
				setDraggingField(null)
				return
			}

			// Удаляем поле из всех секций
			setCustomSections(prev =>
				prev.map(section => ({
					...section,
					fields: section.fields.filter(id => id !== draggingField),
				}))
			)

			// Добавляем в новую секцию
			handleAddFieldToSection(sectionId, draggingField)
			setDraggingField(null)
		}
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

	const saveCompanyAddress = async () => {
		if (!addressObject) return;
		addressObject.company_id = clinic?.id
		addressObject.clinic_id = clinic?.company_id
		clinicService.updateClinicAddress(addressObject)
	}

	const handleChange = ({ object, string }: { object: AddressData | null; string: string }) => {
		addressChanged('6679726eb1750', string)
		setAddressString(string);
		setAddressObject(object);

	};


	const addressChanged = (name: string, value: string | null) => {
		handleFieldChange(name, value);
		// Обновляем адрес в семантическом ключе, бэкенд маппит на Bitrix поле через FormTemplate
		setFormValues((prev) => ({
			...prev,
			[name]: value,
			address: value,
			dynamic_fields: {
				...prev.dynamic_fields,
				address: value,
			},
		}));
	};


	const handleOpenFieldSelectionDialog = (sectionId: string) => {
		// Проверяем, является ли пользователь администратором
		if (!userProfile?.is_admin) {
			// Если пользователь не администратор, показываем сообщение
			setSnackbarMessage('Только администраторы могут добавлять поля в разделы')
			setSnackbarSeverity('warning')
			setSnackbarOpen(true)
			return
		}

		// Получаем все поля, которые уже добавлены в секции
		const fieldsInSections = customSections
			.filter(s => s.id !== sectionId) // Исключаем текущую секцию
			.flatMap(s => s.fields)

		// Фильтруем поля
		const available = filterAvailableFields(fieldMappings, fieldsInSections)

		setAvailableFields(available)
		setSelectedFields([])
		setCurrentSectionForFields(sectionId)
		setFieldSelectionDialogOpen(true)
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
						Загрузка данных...
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
							formValues.name || 'Новая компания'
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
					{id && (
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
									onClick={() => navigate(`/visits/new/${id}`)}
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

			{
				error && (
					<Alert severity='error' sx={{ mb: 3 }}>
						{error}
					</Alert>
				)
			}

			{
				syncStatus && (
					<Alert
						severity={syncStatus.type}
						sx={{ mb: 3 }}
						onClose={() => setSyncStatus(null)}
					>
						{syncStatus.message}
					</Alert>
				)
			}

			{
				isLoading ? (
					<Card>
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
														label='Название компании'
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
												<Grid item xs={12} md={6}>
													<MultiFieldDisplay
														fieldName='email'
														displayName='Email'
														values={formValues.email || []}
														onChange={handleFieldChange}
														typeId='EMAIL'
														icon={<EmailIcon color='action' sx={{ mr: 1 }} />}
													/>
												</Grid>
												<Grid item xs={12} md={6}>
													<MultiFieldDisplay
														fieldName='phone'
														displayName='Телефон'
														values={formValues.phone || []}
														onChange={handleFieldChange}
														typeId='PHONE'
														icon={<PhoneIcon color='action' sx={{ mr: 1 }} />}
													/>
												</Grid>
											</Grid>
										</Box>
									</Grid>

									{/* Раздел Контакты */}
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
													Контакты
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
													Добавить контакт
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
													<Typography color='textSecondary'>
														Нет добавленных контактов
													</Typography>
													<Typography
														variant='body2'
														color='textSecondary'
														sx={{ mt: 0.5 }}
													>
														Нажмите кнопку «Добавить контакт» для создания нового
														контакта
													</Typography>
												</Box>
											)}
										</Box>
									</Grid>

									{/* Пользовательские секции удалены, все поля отправляются в Дополнительные поля */}



									{/* Остальные поля */}
									{(() => {
										const unusedFields = fieldMappings.filter(
											m =>
												m.app_field_name !== 'email' &&
												m.app_field_name !== 'phone' &&
												m.app_field_name !== 'name' &&
												m.app_field_name !== 'company_type' &&
												m.app_field_name !== 'address' &&
												m.app_field_name !== 'inn' &&
												m.app_field_name !== 'city' &&
												m.app_field_name !== 'country'
										)

										return (
											<>
												{unusedFields.length > 0 && (
													<Grid item xs={12}>
														<Box sx={{ mb: 3, mt: 2 }}>
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
																Дополнительные поля
															</Typography>

															<Grid container spacing={2}>
																{unusedFields.map(mapping => {
																	const fieldName = mapping.app_field_name;
																	const fieldValue = formValues[fieldName] || '';
																	const fieldError = formErrors[fieldName];
																	const displayValue = fieldValue === null ? '' : fieldValue;

																	let fieldIcon;
																	if (fieldName.includes('address') || mapping.field_type === 'address') {
																		fieldIcon = <LocationOnIcon color='action' sx={{ mr: 1 }} />;
																	} else if (fieldName.includes('date') || mapping.field_type === 'date') {
																		fieldIcon = <EventIcon color='action' sx={{ mr: 1 }} />;
																	} else if (fieldName.includes('money') || fieldName.includes('price')) {
																		fieldIcon = <MonetizationOnIcon color='action' sx={{ mr: 1 }} />;
																	} else if (mapping.field_type === 'list' || mapping.field_type === 'enum') {
																		fieldIcon = <ListIcon color='action' sx={{ mr: 1 }} />;
																	} else {
																		fieldIcon = <SubjectIcon color='action' sx={{ mr: 1 }} />;
																	}

																	return (
																		<Grid
																			item
																			xs={12}
																			md={6}
																			key={mapping.id}
																			draggable
																			onDragStart={() => handleDragStart(mapping.id.toString())}
																		>
																			{/* Если это поле "Количество филиалов", добавляем кнопку под ним */}
																			{mapping.display_name === 'Количество филиалов' ? (
																				<Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
																					<QuantityLoader clinicId={clinic?.id} />

																					<Button
																						variant="contained"
																						color="primary"
																						onClick={() => navigate(`/networkClinics/${clinic?.id}`)}
																						disabled={!formValues?.is_network}
																						sx={{
																							mt: 1,
																							alignSelf: 'stretch',
																							whiteSpace: 'nowrap',
																							maxWidth: '100%',
																						}}
																					>
																						Филиалы
																					</Button>
																				</Box>
																			) : mapping.display_name.includes('Сетевая') ? (
																				<FormControlLabel
																					control={
																						<Switch
																							checked={!!formValues.is_network}
																							onChange={(e) => {
																								const newValue = e.target.checked;


																								const clinicId = clinic?.id;

																								setFormValues((prev) => ({
																									...prev,
																									is_network: newValue,
																									dynamic_fields: {
																										...prev.dynamic_fields,
																										is_network: newValue ? 1 : 0,
																									},
																								}));
																								if (clinicId) {
																									clinicService.updateNetworkClinicStatus().catch((error) => {
																										console.error('Ошибка при обновлении статуса сети клиники:', error);
																									});
																								}
																							}}
																						/>
																					}
																					label={mapping.display_name}
																					sx={{ marginLeft: 0 }} // Убираем лишний отступ
																				/>
																			) : (
																				// Все остальные поля рендерятся стандартно
																				renderFieldByType(
																					mapping,
																					fieldName,
																					displayValue,
																					fieldError,
																					fieldIcon
																				)
																			)}
																		</Grid>
																	);
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
				)
			}

			{/* Мобильная кнопка сохранения */}
			{
				isMobile && (
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
				)
			}

			{
				id && (
					<PastVisitsDialog
						open={pastVisitsDialogOpen}
						onClose={() => setPastVisitsDialogOpen(false)}
						companyId={Number(id)}
						companyName={clinic?.name || 'Компания'}
						visits={pastVisits}
						isLoading={isPastVisitsLoading}
					/>
				)
			}
			{/* Диалог подтверждения удаления контакта */}
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
				<DialogTitle>
					<Box display='flex' alignItems='center'>
						<PersonIcon sx={{ mr: 1 }} />
						{isEditMode ? 'Редактирование контакта' : 'Создание контакта'}
					</Box>
				</DialogTitle>
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
			{/* Модальное окно с ошибкой */}
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
		</Container >

	)
}

export default ClinicEditPage
