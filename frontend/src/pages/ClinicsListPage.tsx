import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
	Box,
	Card,
	CardContent,
	CircularProgress,
	Typography,
	TablePagination,
	IconButton,
	Button,
	Alert,
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Grid,
	SelectChangeEvent,
	Snackbar,
	useTheme,
	useMediaQuery,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	DialogContentText,
	Stack,
	Fab
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import TimelineIcon from '@mui/icons-material/Timeline'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DescriptionIcon from '@mui/icons-material/Description'
import CloseIcon from '@mui/icons-material/Close'
import { clinicService, Clinic, ClinicFilters, ClinicInput } from '../services/clinicService'
import { useAuth } from '../context/AuthContext'
import { cleanAddressString } from '../utils/addressUtils'
import OLMapModal from '../components/OLMapModal'
import { MapOutlined } from '@mui/icons-material'
import FilterForm from '../components/FilterForm'
import { generateColumns } from '../utils/filterColumns'

const ClinicsListPage: React.FC = () => {
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const { user } = useAuth()
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('md'))

	// State for filters, pagination and sorting
	const [filters, setFilters] = useState<ClinicFilters>({
		page: 1,
		page_size: 10,
		region: user?.regions?.length === 1 ? user.regions[0] : undefined,
		sort_by: 'name',
		sort_direction: 'asc',
	})

	const [isMapOpen, setIsMapOpen] = useState(false);


	const [loading, setLoading] = useState<number | null>(null)
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: 'success' | 'error' | 'info' | 'warning';
	}>({
		open: false,
		message: '',
		severity: 'info',
	})

	// Состояния для модального окна создания компании
	const [createModalOpen, setCreateModalOpen] = useState(false)
	const [newCompany, setNewCompany] = useState<{
		name: string;
		inn: string;
		kpp: string;
		address: string;
		region: string;
		company_type: string;
	}>({
		name: '',
		inn: '',
		kpp: '',
		address: '',
		region: '',
		company_type: 'CUSTOMER',
	})

	// Состояния для обработки результатов проверки и создания
	const [isInnChecking, setIsInnChecking] = useState(false)
	const [existingClinic, setExistingClinic] = useState<null | { id: number, name: string }>(null)
	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
	const [advancedFilters, setAdvancedFilters] = useState<any[]>([]);

	// Import/Export state
	const [importDialogOpen, setImportDialogOpen] = useState(false)
	const [importFile, setImportFile] = useState<File | null>(null)
	const [isImporting, setIsImporting] = useState(false)
	const [isExporting, setIsExporting] = useState(false)
	const [importResult, setImportResult] = useState<{
		imported: number;
		updated: number;
		errors: string[];
	} | null>(null)
	const [isDragOver, setIsDragOver] = useState(false)

	// Import/Export handlers
	const handleExport = async () => {
		try {
			setIsExporting(true)
			const blob = await clinicService.exportCompanies()
			const url = window.URL.createObjectURL(blob)
			const link = document.createElement('a')
			link.href = url
			const today = new Date().toISOString().slice(0, 10)
			link.download = `companies_${today}.xlsx`
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			window.URL.revokeObjectURL(url)
			setSnackbar({
				open: true,
				message: 'Файл экспортирован',
				severity: 'success',
			})
		} catch (error: any) {
			setSnackbar({
				open: true,
				message: `Ошибка экспорта: ${error?.response?.data?.detail || error.message || 'Неизвестная ошибка'}`,
				severity: 'error',
			})
		} finally {
			setIsExporting(false)
		}
	}

	const handleDownloadTemplate = async () => {
		try {
			const blob = await clinicService.downloadImportTemplate()
			const url = window.URL.createObjectURL(blob)
			const link = document.createElement('a')
			link.href = url
			link.download = 'import_template.xlsx'
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			window.URL.revokeObjectURL(url)
		} catch (error: any) {
			setSnackbar({
				open: true,
				message: `Ошибка загрузки шаблона: ${error?.response?.data?.detail || error.message || 'Неизвестная ошибка'}`,
				severity: 'error',
			})
		}
	}

	const handleImportSubmit = async () => {
		if (!importFile) return
		try {
			setIsImporting(true)
			const result = await clinicService.importCompanies(importFile)
			setImportResult(result)
			queryClient.invalidateQueries(['clinics'])
			setSnackbar({
				open: true,
				message: `Импорт завершен: добавлено ${result.imported}, обновлено ${result.updated}`,
				severity: result.errors.length > 0 ? 'warning' : 'success',
			})
		} catch (error: any) {
			setSnackbar({
				open: true,
				message: `Ошибка импорта: ${error?.response?.data?.detail || error.message || 'Неизвестная ошибка'}`,
				severity: 'error',
			})
		} finally {
			setIsImporting(false)
		}
	}

	const handleCloseImportDialog = () => {
		setImportDialogOpen(false)
		setImportFile(null)
		setImportResult(null)
		setIsDragOver(false)
	}

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			setImportFile(e.target.files[0])
			setImportResult(null)
		}
	}

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragOver(true)
	}

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragOver(false)
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragOver(false)
		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			const file = e.dataTransfer.files[0]
			if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
				setImportFile(file)
				setImportResult(null)
			} else {
				setSnackbar({
					open: true,
					message: 'Допустимы только файлы Excel (.xlsx, .xls)',
					severity: 'warning',
				})
			}
		}
	}

	// Update URL when filters change
	useEffect(() => {
		const urlParams = new URLSearchParams()

		if (filters.page && filters.page > 1)
			urlParams.set('page', filters.page.toString())
		if (filters.page_size && filters.page_size !== 10)
			urlParams.set('page_size', filters.page_size.toString())
		if (filters.region) urlParams.set('region', filters.region)
		if (filters.name) urlParams.set('name', filters.name)
		if (filters.inn) urlParams.set('inn', filters.inn)
		if (filters.sort_by) urlParams.set('sort_by', filters.sort_by)
		if (filters.sort_direction) urlParams.set('sort_direction', filters.sort_direction)

		const queryString = urlParams.toString()
		const newUrl = queryString ? `?${queryString}` : window.location.pathname

		window.history.replaceState({}, '', newUrl)
	}, [filters])

	// Fetch clinics with filters
	const { data, isLoading, isError } = useQuery(
		['clinics', JSON.stringify(filters), JSON.stringify(advancedFilters)],
		() => {
			console.log('🚀 Выполняем запрос к API');
			return clinicService.getClinics(filters, advancedFilters);
		},
		{
			keepPreviousData: true,
		}
	);

	// Мутация для создания новой компании
	const createClinicMutation = useMutation(
		async (clinicData: ClinicInput) => {
			return clinicService.createClinic(clinicData)
		},
		{
			onSuccess: (data) => {
				// Обновляем кэш запросов
				queryClient.invalidateQueries(['clinics'])

				// Показываем уведомление об успехе
				setSnackbar({
					open: true,
					message: 'Компания успешно создана',
					severity: 'success'
				})

				// Закрываем модальное окно
				handleCloseCreateModal()

				// Получаем полные данные клиники и используем handleEditClick для перехода
				clinicService.getClinic(data.id)
					.then((clinic: Clinic) => {
						handleEditClick(clinic);
					})
					.catch((error: any) => {
						console.error('Ошибка при получении данных новой клиники:', error);
						// Если не удалось получить данные, используем прямой переход
						navigate(`/companies/${data.id}/edit`, {
							state: {
								directOpen: true
							}
						});
					});
			},
			onError: (error: any) => {
				console.error('Ошибка при создании компании:', error)
				setSnackbar({
					open: true,
					message: `Ошибка при создании компании: ${error?.response?.data?.detail || error.message || 'Неизвестная ошибка'}`,
					severity: 'error'
				})
			}
		}
	)

	const handlePageChange = (event: unknown, newPage: number) => {
		setFilters({ ...filters, page: newPage + 1 })
	}

	// Функция для закрытия уведомлений
	const handleCloseSnackbar = () => {
		setSnackbar(prev => ({ ...prev, open: false }));
	}



	const columns = useMemo(() => generateColumns(data?.items || []), [data?.items]);

	const handleRowsPerPageChange = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		setFilters({
			...filters,
			page: 1,
			page_size: parseInt(event.target.value, 10),
		})
	}





	const handleSortRequest = (column: string) => {
		const isAsc = filters.sort_by === column && filters.sort_direction === 'asc'
		setFilters({
			...filters,
			sort_by: column,
			sort_direction: isAsc ? 'desc' : 'asc',
		})
	}


	// Функция форматирования даты из ISO в "дата месяц год"
	const formatDate = (isoDate: string | undefined): string => {
		if (!isoDate) return '-'

		try {
			const date = new Date(isoDate)
			return date.toLocaleDateString('ru-RU', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			})
		} catch (error) {
			console.error('Error formatting date:', error)
			return isoDate
		}
	}

	const handleEditClick = (clinic: Clinic) => {
		// Начинаем индикатор загрузки
		setLoading(clinic.id);


		// БЕЗУСЛОВНЫЙ ПЕРЕХОД к карточке клиники в первую очередь
		// Исправляем маршрут в соответствии с конфигурацией в App.tsx
		console.log('Выполняем навигацию к /companies/' + clinic.id + '/edit');
		navigate(`/companies/${clinic.id}/edit`, {
			state: {
				directOpen: true
			}
		});

		console.log('Навигация выполнена, проверяем необходимость синхронизации');


		if (!clinic.bitrix_id && clinic.inn) {
			console.log('Клиника требует синхронизации с Битрикс (нет bitrix_id, но есть inn)');
			setSnackbar({
				open: true,
				message: 'Поиск/создание компании...',
				severity: 'info'
			});

			// Запуск синхронизации
			clinicService.findOrCreateInBitrix(clinic.id)
				.then(result => {
					console.log('Результат синхронизации:', result);
					if (result.success) {
						// Успешная синхронизация
						console.log('Синхронизация успешна, обновляем UI');
						setSnackbar({
							open: true,
							message: result.message,
							severity: 'success'
						});

						// Принудительное обновление кэшей
						console.log('Инвалидируем кэши для списка клиник и текущей клиники');
						queryClient.invalidateQueries(['clinics']);
						queryClient.invalidateQueries(['clinic', clinic.id.toString()]);
					} else {
						// Ошибка при синхронизации
						setSnackbar({
							open: true,
							message: result.message || 'Ошибка синхронизации',
							severity: 'error'
						});
					}
				})
				.catch(error => {
					console.error('Ошибка при работе с Битрикс:', error);
					setSnackbar({
						open: true,
						message: 'Произошла ошибка при синхронизации',
						severity: 'error'
					});
				})
				.finally(() => {
					// Обязательно сбрасываем индикатор загрузки
					setLoading(null);
				});
		} else {
			// Если нет необходимости в синхронизации, сразу сбрасываем индикатор загрузки
		}
	}

	// Функция для создания компании
	const handleCreateCompany = () => {
		// Проверяем обязательные поля
		if (!newCompany.name || !newCompany.inn || !newCompany.region) {
			setSnackbar({
				open: true,
				message: 'Пожалуйста, заполните обязательные поля: Название, ИНН и Регион',
				severity: 'warning'
			});
			return;
		}

		// Создаем новый базовый объект для создания компании, только с полями, которые поддерживаются в бэкенде
		const createCompanyData = {
			name: newCompany.name,
			company_type: newCompany.company_type || 'CUSTOMER',
			address: cleanAddressString(newCompany.address),
			city: '',
			country: 'Россия',
			inn: newCompany.inn,
			kpp: newCompany.kpp || '',
			region: newCompany.region,
			dynamic_fields: {
				uf_crm_1741267701427: newCompany.inn,
				uf_crm_6679726eb1750: cleanAddressString(newCompany.address),
			}
		};

		// Выводим данные для отправки для отладки
		console.log('Отправка данных для создания компании:', createCompanyData);

		// Создаем компанию локально (без обязательной привязки к Bitrix24)
		createClinicMutation.mutate(createCompanyData as any);
	};

	// Обработчик перехода к редактированию для существующей компании
	const handleGoToExistingCompany = () => {
		if (existingClinic) {
			// Используем функцию handleEditClick для перехода к редактированию
			// чтобы сохранить всю логику синхронизации и обработки маршрута
			handleCloseCreateModal();

			// Получаем информацию о клинике для передачи в handleEditClick
			clinicService.getClinic(existingClinic.id)
				.then((clinic: Clinic) => {
					handleEditClick(clinic);
				})
				.catch((error: any) => {
					console.error('Ошибка при получении данных клиники:', error);
					// Если не удалось получить данные клиники, используем прямой переход
					navigate(`/companies/${existingClinic.id}/edit`, {
						state: {
							directOpen: true
						}
					});
				});
		}
	};

	// Функция для открытия модального окна создания компании
	const handleOpenCreateModal = () => {
		setNewCompany({
			name: '',
			inn: '',
			kpp: '',
			address: '',
			region: '',
			company_type: 'CUSTOMER',
		});
		setExistingClinic(null);
		setCreateModalOpen(true);
	};

	// Функция для закрытия модального окна
	const handleCloseCreateModal = () => {
		setCreateModalOpen(false);
		setExistingClinic(null);
		setConfirmDialogOpen(false);
	};

	// Обработка изменений в полях формы
	const handleNewCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setNewCompany({ ...newCompany, [name]: value });
	};

	// Обработчик изменения региона в выпадающем списке
	const handleRegionSelectChange = (e: SelectChangeEvent<string>) => {
		setNewCompany({ ...newCompany, region: e.target.value });
	};



	const handleApplyFilters = useCallback((filters: any[]) => {
		setAdvancedFilters(filters);
	}, []);

	// Функция для проверки наличия компании по ИНН
	const checkInnExists = async () => {
		try {
			setIsInnChecking(true);

			// Проверяем, что ИНН введен
			if (!newCompany.inn) {
				setSnackbar({
					open: true,
					message: 'Пожалуйста, введите ИНН компании',
					severity: 'warning'
				});
				setIsInnChecking(false);
				return;
			}

			// Проверяем существование компании локально
			const localResults = await clinicService.getClinics({ inn: newCompany.inn });

			if (localResults.items && localResults.items.length > 0) {
				// Компания найдена локально
				setExistingClinic({
					id: localResults.items[0].id,
					name: localResults.items[0].name
				});
				setConfirmDialogOpen(true);
				setIsInnChecking(false);
				return;
			}

			// Если компания не найдена локально, ищем в Bitrix24
			const bitrixResults = await clinicService.searchClinicsByInn(newCompany.inn);

			if (bitrixResults && bitrixResults.length > 0) {
				// Компания найдена в Bitrix24
				setSnackbar({
					open: true,
					message: `Компания с ИНН ${newCompany.inn} найдена, но не синхронизирована с локальной базой. Создаем новую запись.`,
					severity: 'info'
				});
			}

			// Если компания не найдена ни локально, ни в Bitrix24, продолжаем создание
			handleCreateCompany();

		} catch (error: any) {
			console.error('Ошибка при проверке ИНН:', error);
			setSnackbar({
				open: true,
				message: `Ошибка при проверке ИНН: ${error?.response?.data?.detail || error.message || 'Неизвестная ошибка'}`,
				severity: 'error'
			});
		} finally {
			setIsInnChecking(false);
		}
	};

	if (isLoading) {
		return (
			<Box
				display='flex'
				justifyContent='center'
				alignItems='center'
				minHeight='80vh'
			>
				<CircularProgress />
			</Box>
		)
	}

	if (isError) {
		return (
			<Box p={3}>
				<Alert severity='error'>
					Error loading clinics. Please try again later.
				</Alert>
			</Box>
		)
	}

	// Представление компании в виде iOS-style карточки
	const renderClinicCard = (clinic: Clinic) => (
		<Card
			sx={{
				position: 'relative',
				height: '100%',
				cursor: 'pointer',
				transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s',
				'&:active': {
					transform: 'scale(0.98)',
				},
				'&:hover': {
					boxShadow: (theme) => theme.palette.mode === 'light'
						? '0 4px 20px rgba(0, 0, 0, 0.08)'
						: '0 4px 20px rgba(0, 0, 0, 0.4)',
				},
			}}
			onClick={() => handleEditClick(clinic)}
		>
			<CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
					<Typography
						variant="subtitle1"
						sx={{ fontWeight: 600, lineHeight: 1.3, pr: 1 }}
					>
						{clinic.name}
					</Typography>
					{loading === clinic.id ? (
						<CircularProgress size={20} />
					) : (
						<IconButton
							size="small"
							onClick={(e) => { e.stopPropagation(); handleEditClick(clinic); }}
							sx={{ color: 'primary.main', ml: 0.5, flexShrink: 0 }}
						>
							<EditIcon fontSize="small" />
						</IconButton>
					)}
				</Box>

				{clinic.inn && (
					<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
						ИНН: {clinic.inn}
					</Typography>
				)}

				<Grid container spacing={1} sx={{ mb: 1 }}>
					<Grid item xs={6}>
						<Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
							<CalendarTodayIcon sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
							<Typography variant="caption" color="text.secondary">
								Последний визит
							</Typography>
						</Box>
						<Typography variant="body2" sx={{ fontWeight: 500 }}>
							{formatDate(clinic.last_visit_date)}
						</Typography>
					</Grid>

					<Grid item xs={6}>
						<Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
							<TimelineIcon sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
							<Typography variant="caption" color="text.secondary">
								Визиты
							</Typography>
						</Box>
						<Typography variant="body2" sx={{ fontWeight: 500 }}>
							{clinic.visits_count || '0'}
						</Typography>
					</Grid>

					{clinic.main_manager && (
						<Grid item xs={6}>
							<Typography variant="caption" color="text.secondary">
								Менеджер
							</Typography>
							<Typography variant="body2" sx={{ fontWeight: 500 }}>
								{clinic.main_manager}
							</Typography>
						</Grid>
					)}

					{(clinic.last_sale_date || clinic.document_amount) && (
						<Grid item xs={6}>
							<Typography variant="caption" color="text.secondary">
								Продажа
							</Typography>
							<Typography variant="body2" sx={{ fontWeight: 500 }}>
								{clinic.document_amount ? `${clinic.document_amount} \u20BD` : formatDate(clinic.last_sale_date)}
							</Typography>
						</Grid>
					)}
				</Grid>
			</CardContent>
		</Card>
	);

	return (


		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<FilterForm columns={columns} onApply={handleApplyFilters} />
			<OLMapModal open={isMapOpen} onClose={() => setIsMapOpen(false)} clinics={data.items} />

			<Card sx={{ mb: 2 }}>
				<CardContent sx={{ p: { xs: 2, md: 3 } }}>
					<Stack
						direction={{ xs: 'column', sm: 'row' }}
						spacing={1.5}
						alignItems={{ sm: 'center' }}
					>
						{!isMobile && (
							<Button
								variant="contained"
								color="primary"
								startIcon={<AddCircleOutlineIcon />}
								onClick={handleOpenCreateModal}
								data-testid="add-company-button"
								fullWidth={false}
							>
								Добавить компанию
							</Button>
						)}
						<Button
							variant="outlined"
							startIcon={<MapOutlined />}
							onClick={() => setIsMapOpen(true)}
							fullWidth={isMobile}
						>
							Показать на карте
						</Button>
						{(user?.role === 'org_admin' || user?.role === 'platform_admin') && (
							<>
								<Button
									variant="outlined"
									startIcon={isExporting ? <CircularProgress size={18} /> : <FileDownloadIcon />}
									onClick={handleExport}
									disabled={isExporting}
									fullWidth={isMobile}
								>
									Экспорт
								</Button>
								<Button
									variant="outlined"
									startIcon={<FileUploadIcon />}
									onClick={() => setImportDialogOpen(true)}
									fullWidth={isMobile}
								>
									Импорт
								</Button>
							</>
						)}
					</Stack>
				</CardContent>
			</Card>

			<Card>
				<CardContent sx={{ p: { xs: 2, md: 3 } }}>
					{data?.items?.length === 0 ? (
						<Alert severity='info'>
							Не найдено компаний с указанными параметрами фильтрации
						</Alert>
					) : (
						<>
							<Box>
								{/* Компонент сортировки для мобильной версии */}
								<Box sx={{ mb: 2 }}>
									<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
										Найдено: {data?.total} компаний
									</Typography>
									<FormControl variant="outlined" size="small" sx={{ width: '100%' }}>
										<InputLabel id="mobile-sort-label">Сортировка</InputLabel>
										<Select
											labelId="mobile-sort-label"
											value={`${filters.sort_by}|${filters.sort_direction}`}
											label="Сортировка"
											MenuProps={{
												PaperProps: {
													style: { maxHeight: 300 }
												},
												anchorOrigin: {
													vertical: 'bottom',
													horizontal: 'center',
												},
												transformOrigin: {
													vertical: 'top',
													horizontal: 'center',
												}
											}}
											onChange={(e) => {
												const [sortBy, sortDirection] = e.target.value.split('|');
												setFilters({
													...filters,
													sort_by: sortBy,
													sort_direction: sortDirection as 'asc' | 'desc'
												});
											}}
										>
											<MenuItem value="name|asc">Название (А-Я)</MenuItem>
											<MenuItem value="name|desc">Название (Я-А)</MenuItem>
											<MenuItem value="inn|asc">ИНН (по возрастанию)</MenuItem>
											<MenuItem value="inn|desc">ИНН (по убыванию)</MenuItem>
											<MenuItem value="last_visit_date|desc">Последний визит (сначала новые)</MenuItem>
											<MenuItem value="last_visit_date|asc">Последний визит (сначала старые)</MenuItem>
											<MenuItem value="visits_count|desc">Количество визитов (по убыванию)</MenuItem>
											<MenuItem value="visits_count|asc">Количество визитов (по возрастанию)</MenuItem>
											<MenuItem value="last_sale_date|desc">Последняя продажа (сначала новые)</MenuItem>
											<MenuItem value="last_sale_date|asc">Последняя продажа (сначала старые)</MenuItem>
										</Select>
									</FormControl>
								</Box>
								<Grid container spacing={2}>
									{data?.items?.map((clinic: Clinic) => (
										<Grid item xs={12} md={6} lg={4} key={clinic.id}>
											{renderClinicCard(clinic)}
										</Grid>
									))}
								</Grid>
							</Box>

							<TablePagination
								component='div'
								count={data?.total || 0}
								page={(filters.page || 1) - 1}
								rowsPerPage={filters.page_size || 10}
								onPageChange={handlePageChange}
								onRowsPerPageChange={handleRowsPerPageChange}
								rowsPerPageOptions={[5, 10, 25, 50, 100]}
								labelRowsPerPage={isMobile ? 'Строк:' : 'Строк на странице:'}
								labelDisplayedRows={({ from, to, count }) =>
									`${from}-${to} из ${count}`
								}
							/>
						</>
					)}
				</CardContent>
			</Card>

			{/* Snackbar для уведомлений */}
			<Snackbar
				open={snackbar.open}
				autoHideDuration={6000}
				onClose={handleCloseSnackbar}
				message={snackbar.message}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
			/>

			{/* Модальное окно создания компании */}
			<Dialog open={createModalOpen} onClose={handleCloseCreateModal} maxWidth="sm" fullWidth fullScreen={isMobile} data-testid="create-company-dialog">
				<DialogTitle>Создание новой компании</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							label="Название компании"
							name="name"
							value={newCompany.name}
							onChange={handleNewCompanyChange}
							fullWidth
							required
							data-testid="company-name-input"
						/>
						<TextField
							label="ИНН"
							name="inn"
							value={newCompany.inn}
							onChange={handleNewCompanyChange}
							fullWidth
							required
							data-testid="company-inn-input"
						/>
						<TextField
							label="КПП"
							name="kpp"
							value={newCompany.kpp}
							onChange={handleNewCompanyChange}
							fullWidth
							data-testid="company-kpp-input"
						/>
						<FormControl fullWidth required>
							<InputLabel id="company-type-select-label">Тип компании</InputLabel>
							<Select
								labelId="company-type-select-label"
								id="company-type-select"
								value={newCompany.company_type}
								label="Тип компании"
								onChange={(e: SelectChangeEvent<string>) => setNewCompany({ ...newCompany, company_type: e.target.value })}
								data-testid="company-type-select"
							>
								<MenuItem value="CUSTOMER">Клиент</MenuItem>
								<MenuItem value="SUPPLIER">Поставщик</MenuItem>
								<MenuItem value="PARTNER">Партнер</MenuItem>
								<MenuItem value="OTHER">Другое</MenuItem>
							</Select>
						</FormControl>
						<FormControl fullWidth required>
							<InputLabel id="region-select-label">Регион</InputLabel>
							<Select
								labelId="region-select-label"
								id="region-select"
								value={newCompany.region}
								label="Регион"
								onChange={handleRegionSelectChange}
								required
								data-testid="company-region-select"
							>
								<MenuItem value=""><em>Не выбрано</em></MenuItem>
								<MenuItem value="ДНР">ДНР</MenuItem>
								<MenuItem value="ДФО">ДФО</MenuItem>
								<MenuItem value="ЛНР">ЛНР</MenuItem>
								<MenuItem value="ПФО">ПФО</MenuItem>
								<MenuItem value="СЗФО">СЗФО</MenuItem>
								<MenuItem value="СКФО">СКФО</MenuItem>
								<MenuItem value="СФО">СФО</MenuItem>
								<MenuItem value="УФО">УФО</MenuItem>
								<MenuItem value="ЦФО">ЦФО</MenuItem>
								<MenuItem value="ЮФО">ЮФО</MenuItem>
							</Select>
						</FormControl>
						<TextField
							label="Адрес"
							name="address"
							value={newCompany.address}
							onChange={handleNewCompanyChange}
							fullWidth
							multiline
							rows={2}
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseCreateModal} color="inherit">
						Отмена
					</Button>
					<Button
						onClick={checkInnExists}
						color="primary"
						variant="contained"
						disabled={isInnChecking || !newCompany.name || !newCompany.inn || !newCompany.region}
						data-testid="create-company-submit"
					>
						{isInnChecking ? <CircularProgress size={24} /> : 'Создать'}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Диалог подтверждения, если компания с таким ИНН уже существует */}
			<Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
				<DialogTitle>Компания уже существует</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Компания с ИНН {newCompany.inn} уже существует в базе данных под названием "{existingClinic?.name}".
						Хотите перейти к редактированию существующей компании?
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseCreateModal} color="inherit">
						Отмена
					</Button>
					<Button onClick={handleGoToExistingCompany} color="primary" variant="contained">
						Перейти к редактированию
					</Button>
				</DialogActions>
			</Dialog>

			{/* Import dialog */}
			<Dialog open={importDialogOpen} onClose={handleCloseImportDialog} maxWidth="sm" fullWidth fullScreen={isMobile}>
				<DialogTitle>
					Импорт компаний из Excel
					<IconButton
						aria-label="close"
						onClick={handleCloseImportDialog}
						sx={{ position: 'absolute', right: 8, top: 8 }}
					>
						<CloseIcon />
					</IconButton>
				</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<Button
							variant="text"
							startIcon={<DescriptionIcon />}
							onClick={handleDownloadTemplate}
							sx={{ alignSelf: 'flex-start' }}
						>
							Скачать шаблон
						</Button>

						<Box
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
							sx={{
								border: '2px dashed',
								borderColor: isDragOver ? 'primary.main' : 'grey.400',
								borderRadius: 2,
								p: 3,
								textAlign: 'center',
								bgcolor: isDragOver ? 'action.hover' : 'transparent',
								cursor: 'pointer',
								transition: 'all 0.2s',
							}}
							onClick={() => document.getElementById('import-file-input')?.click()}
						>
							<input
								id="import-file-input"
								type="file"
								accept=".xlsx,.xls"
								hidden
								onChange={handleFileChange}
							/>
							<CloudUploadIcon sx={{ fontSize: 48, color: 'grey.500', mb: 1 }} />
							<Typography variant="body1" color="text.secondary">
								{importFile
									? importFile.name
									: 'Перетащите файл сюда или нажмите для выбора'}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Поддерживаются файлы .xlsx и .xls
							</Typography>
						</Box>

						{importResult && (
							<Box>
								<Alert severity={importResult.errors.length > 0 ? 'warning' : 'success'} sx={{ mb: 1 }}>
									Добавлено: {importResult.imported}, Обновлено: {importResult.updated}
								</Alert>
								{importResult.errors.length > 0 && (
									<Alert severity="error">
										<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
											Ошибки ({importResult.errors.length}):
										</Typography>
										{importResult.errors.slice(0, 10).map((err, i) => (
											<Typography key={i} variant="body2">
												{err}
											</Typography>
										))}
										{importResult.errors.length > 10 && (
											<Typography variant="body2" sx={{ mt: 0.5 }}>
												...и еще {importResult.errors.length - 10}
											</Typography>
										)}
									</Alert>
								)}
							</Box>
						)}
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseImportDialog} color="inherit">
						Закрыть
					</Button>
					<Button
						onClick={handleImportSubmit}
						color="primary"
						variant="contained"
						disabled={!importFile || isImporting}
						startIcon={isImporting ? <CircularProgress size={18} /> : <FileUploadIcon />}
					>
						{isImporting ? 'Загрузка...' : 'Загрузить'}
					</Button>
				</DialogActions>
			</Dialog>

			{isMobile && (
				<Fab color="primary" onClick={handleOpenCreateModal} sx={{ position: 'fixed', bottom: 84, right: 20 }}>
					<AddCircleOutlineIcon fontSize="large" />
				</Fab>
			)}
		</Box>
	)
}

export default ClinicsListPage
