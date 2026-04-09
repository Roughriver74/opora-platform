import React, { useState, useEffect } from 'react'
import {
	Box,
	Typography,
	Paper,
	Button,
	Grid,
	CircularProgress,
	Alert,
	Breadcrumbs,
	Link as MuiLink,
} from '@mui/material'
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../services/api'
import { clinicService } from '../services/clinicService'
import { DynamicFields } from '../components/DynamicFields'

// Типы для визита
interface Visit {
	id?: number
	company_id: number
	company_name?: string
	visit_type: string
	date: string
	status: string
	comment: string
	with_distributor: boolean
	sansus: boolean

	doctors: number[]
	contacts: number[] // Добавляем контакты (ЛПР)
	[key: string]: any // Для динамических полей
}



export const VisitCreatePage: React.FC = () => {
	const navigate = useNavigate()
	const location = useLocation()
	const { companyId: companyIdFromPath } = useParams<{ companyId: string }>()
	const clinicFromState = location.state?.clinic

	// Получаем ID компании из параметров URL или из состояния
	const searchParams = new URLSearchParams(location.search)
	const companyIdFromUrl = searchParams.get('companyId')
	const companyIdFromState = location.state?.companyId
	const companyId =
		companyIdFromPath || companyIdFromUrl || companyIdFromState || ''

	const [formError, setFormError] = useState<string | null>(null)
	const [isLoadingCompany, setIsLoadingCompany] = useState(false)

	const formatDateForAPI = (dateStr?: string | null): string => {
		const date = dateStr ? new Date(dateStr) : new Date();

		if (isNaN(date.getTime())) {
			return formatDateForAPI();
		}

		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		const hours = String(date.getHours()).padStart(2, "0");
		const minutes = String(date.getMinutes()).padStart(2, "0");
		const seconds = String(date.getSeconds()).padStart(2, "0");

		return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
	};

	// Состояние формы
	const [visit, setVisit] = useState<Visit>({
		company_id: companyId ? parseInt(companyId.toString()) : 0,
		visit_type: 'first_visit',
		date: formatDateForAPI(), // Используем локальное время с правильным форматированием
		status: 'planned',
		comment: '',
		with_distributor: false,
		sansus: false,
		doctors: [],
		contacts: [], // Добавляем пустой массив контактов
		dynamic_bitrix_company_id: '', // Храним Bitrix ID компании как динамическое поле
		ufCrm18Comment: '123123213'

	})

	// Загрузка данных компании, если указан ID
	useEffect(() => {
		const fetchCompanyData = async () => {
			if (companyId) {
				try {
					setIsLoadingCompany(true)
					// Получаем данные компании из состояния или из API
					if (location.state?.companyName) {
						console.log(location.state)
						// Если данные компании переданы в состоянии, используем их
						setVisit(prev => ({
							...prev,
							company_id: parseInt(companyId.toString()),
							company_name: location.state.companyName,
							ufCrm18Comment: clinicFromState.name || '213123',

						}))
					} else {
						// Иначе запрашиваем данные компании из API
						try {
							// Сначала получаем данные из локальной БД, чтобы узнать bitrix_id
							const localCompany = await clinicService.getClinic(parseInt(companyId.toString()), false);

							// Проверяем наличие bitrix_id
							if (localCompany && localCompany.bitrix_id) {
								// Используем bitrix_id для запроса данных из Bitrix
								const companyData = await clinicService.getClinicById(localCompany.bitrix_id);

								console.log('Получены данные компании:', companyData);

								// Проверяем, в каком формате пришли данные (Bitrix или локальная БД)
								const companyName = 'TITLE' in companyData
									? companyData.TITLE
									: companyData.name || `Компания #${companyId}`;

								setVisit(prev => ({
									...prev,
									company_id: parseInt(companyId.toString()),
									company_name: companyName,
									dynamic_bitrix_company_id: localCompany.bitrix_id?.toString() || '', // Преобразуем в строку
								}))
							} else {
								// Если bitrix_id отсутствует, используем данные из локальной БД
								setVisit(prev => ({
									...prev,
									company_id: parseInt(companyId.toString()),
									company_name: localCompany.name || `Компания #${companyId}`,
								}))
							}
						} catch (error) {
							console.error('Ошибка при получении данных компании из API:', error)
							// Используем ID как имя компании в случае ошибки
							setVisit(prev => ({
								...prev,
								company_id: parseInt(companyId.toString()),
								company_name: `Компания #${companyId}`,
							}))
						}
					}
				} catch (error) {
					console.error('Ошибка при загрузке данных компании:', error)
					setFormError('Не удалось загрузить данные компании')
				} finally {
					setIsLoadingCompany(false)
				}
			}
		}

		fetchCompanyData()
	}, [companyId, location.state])



	// Мутация для создания визита
	const createVisitMutation = useMutation({
		mutationFn: async (newVisit: Visit) => {
			const response = await api.post('/visits/', newVisit)
			return response.data
		},
		onSuccess: (data) => {
			// Переходим на страницу деталей визита
			navigate(`/visits/${data.id}`)
		},
		onError: (error: any) => {
			// Обрабатываем объекты ошибок валидации
			let errorMessage = 'Ошибка при создании визита'

			if (error.response?.data?.detail) {
				const detail = error.response.data.detail

				// Проверяем, является ли detail объектом или массивом
				if (typeof detail === 'object' && detail !== null) {
					if (Array.isArray(detail)) {
						// Если это массив ошибок
						errorMessage = detail
							.map(err => {
								if (typeof err === 'string') return err
								return err.msg || JSON.stringify(err)
							})
							.join(', ')
					} else if (detail.msg) {
						// Если это объект с полем msg
						errorMessage = detail.msg
					} else {
						// Пробуем преобразовать объект в строку
						try {
							errorMessage = JSON.stringify(detail)
						} catch (e) {
							errorMessage = 'Неизвестная ошибка валидации'
						}
					}
				} else if (typeof detail === 'string') {
					// Если это просто строка
					errorMessage = detail
				}
			}

			setFormError(errorMessage)
		},
	})


	const handleDynamicFieldChange = (name: string, value: any) => {
		setVisit(prev => ({ ...prev, [name]: value }))
	}




	const ensureValidDate = (dateValue: string | null | undefined): string => {

		return formatDateForAPI(dateValue);
	};

	// Обработчик отправки формы
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		const visitData = { ...visit };

		// Гарантируем, что статус всегда в нижнем регистре
		if (visitData.status && typeof visitData.status === 'string') {
			visitData.status = visitData.status.toLowerCase();
		}


		const dynamicFields: Record<string, any> = {};
		let dateFromDynamicField: string | null = null;

		Object.keys(visit).forEach(key => {
			if (key.startsWith('dynamic_')) {
				const fieldName = key.substring(8);
				let fieldValue = visit[key];

				if (
					fieldName === '1732026275473' &&
					fieldValue &&
					typeof fieldValue === 'string'
				) {
					if (fieldValue.includes('T')) {
						dateFromDynamicField = formatDateForAPI(fieldValue);
					} else {
						dateFromDynamicField = fieldValue;
					}
				}

				if (
					fieldValue &&
					typeof fieldValue === 'string' &&
					(fieldName.includes('date') ||
						fieldName.includes('time') ||
						fieldName === 'date')
				) {
					try {


						if (!fieldValue.includes('T')) {

							const now = new Date();
							const timeStr = `T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
							fieldValue = `${fieldValue}${timeStr}`;
						}

						// Создаем объект даты и форматируем строго в правильном формате
						const dateObj = new Date(fieldValue);
						if (!isNaN(dateObj.getTime())) {
							// Используем форматированную версию с локальным временем
							const formattedDate = formatDateForAPI(fieldValue);
							fieldValue = formattedDate;

						}
					} catch (error) {
						console.error(
							`Error formatting dynamic date field ${fieldName}:`,
							error
						);
					}
				}

				dynamicFields[fieldName] = fieldValue;
			} else if (!['company_id', 'visit_type', 'date', 'status', 'comment', 'with_distributor', 'sansus', 'doctors', 'contacts'].includes(key)) {
				dynamicFields[key] = visit[key];
			}
		});
		// console.log('ААААААААААА=', 'Филиал:' + clinicFromState.name + '</br>' + 'Адрес:' + clinicFromState.dynamic_fields['ufCrm31_1744890745'])

		dynamicFields['date'] = dateFromDynamicField ?? ensureValidDate(visitData.date);
		dynamicFields['1732026990932'] = dateFromDynamicField ?? ensureValidDate(visitData.date);
		dynamicFields['1732026275473'] = dateFromDynamicField ?? ensureValidDate(visitData.date)
		visitData.date = ensureValidDate(visitData.date);


		if (Object.keys(dynamicFields).length > 0) {
			visitData.dynamic_fields = dynamicFields
		}

		createVisitMutation.mutate(visitData)
	}

	if (isLoadingCompany) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
				<CircularProgress />
			</Box>
		)
	}

	return (
		<Box sx={{ p: 3 }}>
			{/* Хлебные крошки */}
			<Breadcrumbs aria-label='breadcrumb' sx={{ mb: 3 }}>
				<MuiLink component={Link} to='/visits' color='inherit'>
					Визиты
				</MuiLink>
				<Typography color='text.primary'>Создать</Typography>
			</Breadcrumbs>

			<Typography variant='h4' gutterBottom>
				Создание нового визита
			</Typography>

			{formError && (
				<Alert severity='error' sx={{ mb: 2 }}>
					{formError}
				</Alert>
			)}

			<Paper sx={{ p: 3 }}>
				<form onSubmit={handleSubmit}>
					<Grid container spacing={3}>
						<Grid item xs={12} md={6}>
							{companyId ? (
								<Box sx={{ mb: 2 }}>
									<Typography variant='subtitle1'>Клиника:</Typography>
									<Typography variant='body1'>{visit.company_name}</Typography>
									<Typography variant='body2' color='text.secondary'>
										ID: {visit.company_id}
									</Typography>
								</Box>
							) : (
								<Alert severity='warning' sx={{ mb: 2 }}>
									Клиника не выбрана. Пожалуйста, вернитесь на страницу визитов
									и выберите клинику.
								</Alert>
							)}
						</Grid>

						{/* Динамические поля из админ-панели */}
						<Grid item xs={12}>
							<Typography variant='h6' sx={{ mb: 2 }}>
								Данные визита
							</Typography>
							<DynamicFields
								entityType='visit'
								formData={visit}
								onChange={handleDynamicFieldChange}
								gridSize={{ xs: 12, md: 6 }}
							/>
						</Grid>
						<Grid item xs={12}>
							<Box
								sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}
							>
								<Button variant='outlined' onClick={() => navigate('/visits')}>
									Отмена
								</Button>
								<Button
									type='submit'
									variant='contained'
									color='primary'
									disabled={createVisitMutation.isLoading || !visit.company_id}
								>
									{createVisitMutation.isLoading
										? 'Создание...'
										: 'Создать визит'}
								</Button>
							</Box>
						</Grid>
					</Grid>
				</form>
			</Paper>
		</Box>
	)
}
