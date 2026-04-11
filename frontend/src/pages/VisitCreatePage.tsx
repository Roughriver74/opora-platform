import React, { useState, useEffect, useCallback } from 'react'
import {
	Box,
	Typography,
	Card,
	CardContent,
	Button,
	Grid,
	CircularProgress,
	Alert,
	IconButton,
	Fab,
	useTheme,
	useMediaQuery,
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	FormControlLabel,
	Switch,
	SelectChangeEvent,
	Autocomplete,
} from '@mui/material'
import {
	ChevronLeft as ChevronLeftIcon,
	Save as SaveIcon,
	Business as BusinessIcon,
	Search as SearchIcon,
} from '@mui/icons-material'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { clinicService, Clinic } from '../services/clinicService'
import { DynamicFields } from '../components/DynamicFields'

// --------------- Types ---------------

interface FieldDefinition {
	key: string
	label: string
	type: string
	required: boolean
	options?: string[]
}

interface VisitFormTemplate {
	id?: number
	organization_id?: number
	fields: FieldDefinition[]
}

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
	contacts: number[]
	[key: string]: any
}

// --------------- Component ---------------

export const VisitCreatePage: React.FC = () => {
	const navigate = useNavigate()
	const location = useLocation()
	const { companyId: companyIdFromPath } = useParams<{ companyId: string }>()
	const clinicFromState = location.state?.clinic

	const searchParams = new URLSearchParams(location.search)
	const companyIdFromUrl = searchParams.get('companyId')
	const companyIdFromState = location.state?.companyId
	const companyId =
		companyIdFromPath || companyIdFromUrl || companyIdFromState || ''

	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

	const [formError, setFormError] = useState<string | null>(null)
	const [isLoadingCompany, setIsLoadingCompany] = useState(false)

	// Company search state (used when no companyId provided)
	const [companySearchTerm, setCompanySearchTerm] = useState('')
	const [selectedCompany, setSelectedCompany] = useState<Clinic | null>(null)
	const [companyOptions, setCompanyOptions] = useState<Clinic[]>([])
	const [isSearchingCompanies, setIsSearchingCompanies] = useState(false)

	// Debounced company search
	const searchCompanies = useCallback(
		async (term: string) => {
			if (!term || term.length < 2) {
				setCompanyOptions([])
				return
			}
			setIsSearchingCompanies(true)
			try {
				const result = await clinicService.getClinics({ name: term, page: 1, page_size: 20 })
				setCompanyOptions(result.items || [])
			} catch (error) {
				console.error('Error searching companies:', error)
				setCompanyOptions([])
			} finally {
				setIsSearchingCompanies(false)
			}
		},
		[]
	)

	// Debounce timer for company search
	useEffect(() => {
		if (!companyId && companySearchTerm.length >= 2) {
			const timer = setTimeout(() => {
				searchCompanies(companySearchTerm)
			}, 300)
			return () => clearTimeout(timer)
		}
	}, [companySearchTerm, companyId, searchCompanies])

	// Load initial list of companies if no companyId
	useEffect(() => {
		if (!companyId && companyOptions.length === 0 && !selectedCompany) {
			clinicService.getClinics({ page: 1, page_size: 50, sort_by: 'name', sort_direction: 'asc' })
				.then(result => {
					setCompanyOptions(result.items || [])
				})
				.catch(error => {
					console.error('Error loading initial companies:', error)
				})
		}
	}, [companyId])

	// Handle company selection from autocomplete
	const handleCompanySelect = (company: Clinic | null) => {
		setSelectedCompany(company)
		if (company) {
			setVisit(prev => ({
				...prev,
				company_id: company.id,
				company_name: company.name,
				dynamic_bitrix_company_id: company.bitrix_id?.toString() || '',
			}))
		} else {
			setVisit(prev => ({
				...prev,
				company_id: 0,
				company_name: '',
				dynamic_bitrix_company_id: '',
			}))
		}
	}

	// Custom field values (stored separately, merged into dynamic_fields on submit)
	const [customValues, setCustomValues] = useState<Record<string, any>>({})

	const formatDateForAPI = (dateStr?: string | null): string => {
		const date = dateStr ? new Date(dateStr) : new Date()
		if (isNaN(date.getTime())) {
			return formatDateForAPI()
		}
		const year = date.getFullYear()
		const month = String(date.getMonth() + 1).padStart(2, '0')
		const day = String(date.getDate()).padStart(2, '0')
		const hours = String(date.getHours()).padStart(2, '0')
		const minutes = String(date.getMinutes()).padStart(2, '0')
		const seconds = String(date.getSeconds()).padStart(2, '0')
		return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
	}

	// Form state
	const [visit, setVisit] = useState<Visit>({
		company_id: companyId ? parseInt(companyId.toString()) : 0,
		visit_type: 'first_visit',
		date: formatDateForAPI(),
		status: 'planned',
		comment: '',
		with_distributor: false,
		sansus: false,
		contacts: [],
		dynamic_bitrix_company_id: '',
		ufCrm18Comment: '123123213',
	})

	// --------------- Load form template ---------------

	const { data: formTemplate, isLoading: isLoadingTemplate } = useQuery<VisitFormTemplate>(
		['formTemplate', 'visit'],
		async () => {
			const res = await api.get('/form-templates/visit')
			return res.data
		},
		{
			staleTime: 300000, // 5 minutes
		}
	)

	// --------------- Load company data ---------------

	useEffect(() => {
		const fetchCompanyData = async () => {
			if (companyId) {
				try {
					setIsLoadingCompany(true)
					if (location.state?.companyName) {
						setVisit(prev => ({
							...prev,
							company_id: parseInt(companyId.toString()),
							company_name: location.state.companyName,
							ufCrm18Comment: clinicFromState?.name || '213123',
						}))
					} else {
						try {
							const localCompany = await clinicService.getClinic(parseInt(companyId.toString()), false)
							if (localCompany && localCompany.bitrix_id) {
								const companyData = await clinicService.getClinicById(localCompany.bitrix_id)
								const companyName = 'TITLE' in companyData
									? companyData.TITLE
									: companyData.name || `Компания #${companyId}`
								setVisit(prev => ({
									...prev,
									company_id: parseInt(companyId.toString()),
									company_name: companyName,
									dynamic_bitrix_company_id: localCompany.bitrix_id?.toString() || '',
								}))
							} else {
								setVisit(prev => ({
									...prev,
									company_id: parseInt(companyId.toString()),
									company_name: localCompany.name || `Компания #${companyId}`,
								}))
							}
						} catch (error) {
							console.error('Error fetching company data from API:', error)
							setVisit(prev => ({
								...prev,
								company_id: parseInt(companyId.toString()),
								company_name: `Компания #${companyId}`,
							}))
						}
					}
				} catch (error) {
					console.error('Error loading company data:', error)
					setFormError('Не удалось загрузить данные компании')
				} finally {
					setIsLoadingCompany(false)
				}
			}
		}
		fetchCompanyData()
	}, [companyId, location.state])

	// --------------- Create visit mutation ---------------

	const createVisitMutation = useMutation({
		mutationFn: async (newVisit: Visit) => {
			const response = await api.post('/visits/', newVisit)
			return response.data
		},
		onSuccess: (data) => {
			navigate(`/visits/${data.id}`)
		},
		onError: (error: any) => {
			let errorMessage = 'Ошибка при создании визита'
			if (error.response?.data?.detail) {
				const detail = error.response.data.detail
				if (typeof detail === 'object' && detail !== null) {
					if (Array.isArray(detail)) {
						errorMessage = detail
							.map((err: any) => (typeof err === 'string' ? err : err.msg || JSON.stringify(err)))
							.join(', ')
					} else if (detail.msg) {
						errorMessage = detail.msg
					} else {
						try {
							errorMessage = JSON.stringify(detail)
						} catch {
							errorMessage = 'Неизвестная ошибка валидации'
						}
					}
				} else if (typeof detail === 'string') {
					errorMessage = detail
				}
			}
			setFormError(errorMessage)
		},
	})

	const handleDynamicFieldChange = (name: string, value: any) => {
		setVisit(prev => ({ ...prev, [name]: value }))
	}

	const handleCustomFieldChange = (key: string, value: any) => {
		setCustomValues(prev => ({ ...prev, [key]: value }))
	}

	const ensureValidDate = (dateValue: string | null | undefined): string => {
		return formatDateForAPI(dateValue)
	}

	// --------------- Submit ---------------

	const handleSubmit = (e?: React.FormEvent) => {
		if (e) e.preventDefault()

		// Validate required template fields
		if (formTemplate?.fields) {
			for (const field of formTemplate.fields) {
				if (field.required) {
					const val = customValues[field.key]
					if (val === undefined || val === null || val === '') {
						setFormError(`Поле "${field.label}" обязательно для заполнения`)
						return
					}
				}
			}
		}

		const visitData = { ...visit }
		if (visitData.status && typeof visitData.status === 'string') {
			visitData.status = visitData.status.toLowerCase()
		}

		const dynamicFields: Record<string, any> = {}
		let dateFromDynamicField: string | null = null

		Object.keys(visit).forEach(key => {
			if (key.startsWith('dynamic_')) {
				const fieldName = key.substring(8)
				let fieldValue = visit[key]

				if (
					fieldName === '1732026275473' &&
					fieldValue &&
					typeof fieldValue === 'string'
				) {
					if (fieldValue.includes('T')) {
						dateFromDynamicField = formatDateForAPI(fieldValue)
					} else {
						dateFromDynamicField = fieldValue
					}
				}

				if (
					fieldValue &&
					typeof fieldValue === 'string' &&
					(fieldName.includes('date') || fieldName.includes('time') || fieldName === 'date')
				) {
					try {
						if (!fieldValue.includes('T')) {
							const now = new Date()
							const timeStr = `T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`
							fieldValue = `${fieldValue}${timeStr}`
						}
						const dateObj = new Date(fieldValue)
						if (!isNaN(dateObj.getTime())) {
							fieldValue = formatDateForAPI(fieldValue)
						}
					} catch (error) {
						console.error(`Error formatting dynamic date field ${fieldName}:`, error)
					}
				}

				dynamicFields[fieldName] = fieldValue
			} else if (
				!['company_id', 'visit_type', 'date', 'status', 'comment', 'with_distributor', 'sansus', 'contacts'].includes(key)
			) {
				dynamicFields[key] = visit[key]
			}
		})

		// Merge custom template field values into dynamic_fields
		if (formTemplate?.fields) {
			for (const field of formTemplate.fields) {
				const val = customValues[field.key]
				if (val !== undefined && val !== null && val !== '') {
					dynamicFields[field.key] = val

					// Also map well-known keys to top-level visit properties
					if (field.key === 'visit_type') {
						visitData.visit_type = val
					} else if (field.key === 'comment') {
						visitData.comment = val
					} else if (field.key === 'with_distributor') {
						visitData.with_distributor = !!val
					}
				}
			}
		}

		dynamicFields['date'] = dateFromDynamicField ?? ensureValidDate(visitData.date)
		dynamicFields['1732026990932'] = dateFromDynamicField ?? ensureValidDate(visitData.date)
		dynamicFields['1732026275473'] = dateFromDynamicField ?? ensureValidDate(visitData.date)
		visitData.date = ensureValidDate(visitData.date)

		if (Object.keys(dynamicFields).length > 0) {
			visitData.dynamic_fields = dynamicFields
		}

		createVisitMutation.mutate(visitData)
	}

	// --------------- Render ---------------

	if (isLoadingCompany || isLoadingTemplate) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
				<CircularProgress />
			</Box>
		)
	}

	const templateFields = formTemplate?.fields || []

	return (
		<Box sx={{ pb: 10, minHeight: '100%', bgcolor: 'background.default' }}>
			{/* Mobile Header */}
			<Box
				sx={{
					px: 1,
					pt: 1,
					pb: 1,
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					position: 'sticky',
					top: 0,
					zIndex: 100,
					bgcolor: 'background.paper',
					boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
					mb: 2,
				}}
			>
				<IconButton onClick={() => navigate(-1)} sx={{ color: 'primary.main' }}>
					<ChevronLeftIcon fontSize="large" />
				</IconButton>
				<Typography variant="h6" sx={{ fontWeight: 600 }}>
					Новый визит
				</Typography>
				<Box sx={{ width: 48 }} />
			</Box>

			<Box sx={{ px: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
				{formError && (
					<Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
						{formError}
					</Alert>
				)}

				<form onSubmit={handleSubmit}>
					<Grid container spacing={3}>
						{/* Company card / company selector */}
						<Grid item xs={12}>
							{companyId ? (
								<Card
									variant="outlined"
									sx={{
										borderRadius: 3,
										border: 'none',
										boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
									}}
								>
									<CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
										<Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
											<BusinessIcon color="action" fontSize="small" sx={{ mr: 1 }} />
											<Typography variant="subtitle2" color="text.secondary">
												Компания
											</Typography>
										</Box>
										<Typography variant="body1" sx={{ fontWeight: 500, ml: 3.5 }}>
											{visit.company_name}
										</Typography>
										<Typography variant="caption" color="text.secondary" sx={{ ml: 3.5, display: 'block' }}>
											ID: {visit.company_id}
										</Typography>
									</CardContent>
								</Card>
							) : (
								<Card
									variant="outlined"
									sx={{
										borderRadius: 3,
										border: 'none',
										boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
									}}
								>
									<CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
										<Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
											<SearchIcon color="action" fontSize="small" sx={{ mr: 1 }} />
											<Typography variant="subtitle2" color="text.secondary">
												Выберите компанию
											</Typography>
										</Box>
										<Autocomplete
											options={companyOptions}
											getOptionLabel={(option) => `${option.name}${option.inn ? ` (ИНН: ${option.inn})` : ''}`}
											value={selectedCompany}
											onChange={(_event, newValue) => handleCompanySelect(newValue)}
											onInputChange={(_event, newInputValue) => setCompanySearchTerm(newInputValue)}
											loading={isSearchingCompanies}
											noOptionsText={companySearchTerm.length < 2 ? 'Введите минимум 2 символа для поиска' : 'Компании не найдены'}
											loadingText="Поиск компаний..."
											isOptionEqualToValue={(option, value) => option.id === value.id}
											renderOption={(props, option) => (
												<li {...props} key={option.id}>
													<Box>
														<Typography variant="body1">{option.name}</Typography>
														<Typography variant="caption" color="text.secondary">
															{option.inn ? `ИНН: ${option.inn}` : ''}
															{option.region ? ` | ${option.region}` : ''}
														</Typography>
													</Box>
												</li>
											)}
											renderInput={(params) => (
												<TextField
													{...params}
													label="Поиск компании"
													placeholder="Введите название или ИНН компании"
													size="small"
													data-testid="company-search-input"
													InputProps={{
														...params.InputProps,
														endAdornment: (
															<>
																{isSearchingCompanies ? <CircularProgress color="inherit" size={20} /> : null}
																{params.InputProps.endAdornment}
															</>
														),
													}}
												/>
											)}
											fullWidth
										/>
										{selectedCompany && (
											<Box sx={{ mt: 1.5, ml: 0.5 }}>
												<Typography variant="body2" color="text.secondary">
													Выбрана: <strong>{selectedCompany.name}</strong>
													{selectedCompany.inn && ` (ИНН: ${selectedCompany.inn})`}
												</Typography>
											</Box>
										)}
										{!selectedCompany && (
											<Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }}>
												Найдите и выберите компанию для создания визита
											</Alert>
										)}
									</CardContent>
								</Card>
							)}
						</Grid>

						{/* Template-driven custom fields */}
						{templateFields.length > 0 && (
							<Grid item xs={12}>
								<Card
									variant="outlined"
									sx={{
										borderRadius: 3,
										border: 'none',
										boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
									}}
								>
									<CardContent>
										<Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
											Данные визита
										</Typography>
										<Grid container spacing={2}>
											{templateFields.map((field) => (
												<Grid item xs={12} md={6} key={field.key}>
													{renderTemplateField(field, customValues[field.key], handleCustomFieldChange)}
												</Grid>
											))}
										</Grid>
									</CardContent>
								</Card>
							</Grid>
						)}

						{/* Bitrix24 dynamic fields from admin field-mapping */}
						<Grid item xs={12}>
							<Card
								variant="outlined"
								sx={{
									borderRadius: 3,
									border: 'none',
									boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
								}}
							>
								<CardContent>
									<Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
										Дополнительные поля
									</Typography>
									<DynamicFields
										entityType="visit"
										formData={visit}
										onChange={handleDynamicFieldChange}
										gridSize={{ xs: 12, md: 6 }}
									/>
								</CardContent>
							</Card>
						</Grid>

						{/* Desktop Save Button */}
						{!isMobile && (
							<Grid item xs={12}>
								<Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
									<Button variant="outlined" onClick={() => navigate(-1)} sx={{ borderRadius: 2 }}>
										Отмена
									</Button>
									<Button
										type="submit"
										variant="contained"
										color="primary"
										sx={{ borderRadius: 2 }}
										disabled={createVisitMutation.isLoading || !visit.company_id}
									>
										{createVisitMutation.isLoading ? (
											<CircularProgress size={24} color="inherit" />
										) : (
											'Создать визит'
										)}
									</Button>
								</Box>
							</Grid>
						)}
					</Grid>
				</form>
			</Box>

			{/* Mobile FAB */}
			{isMobile && (
				<Fab
					color="primary"
					sx={{
						position: 'fixed',
						bottom: 24,
						right: 24,
						zIndex: 1000,
					}}
					onClick={handleSubmit}
					disabled={createVisitMutation.isLoading || !visit.company_id}
				>
					{createVisitMutation.isLoading ? (
						<CircularProgress size={24} color="inherit" />
					) : (
						<SaveIcon />
					)}
				</Fab>
			)}
		</Box>
	)
}

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
			)
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
			)
		case 'select':
			return (
				<FormControl fullWidth size="small" required={field.required}>
					<InputLabel>{field.label}</InputLabel>
					<Select
						label={field.label}
						value={value || ''}
						onChange={(e: SelectChangeEvent) => onChange(field.key, e.target.value)}
					>
						{(field.options || []).map(opt => (
							<MenuItem key={opt} value={opt}>
								{opt}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			)
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
			)
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
			)
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
			)
		default:
			return (
				<TextField
					fullWidth
					label={field.label}
					size="small"
					value={value || ''}
					onChange={(e) => onChange(field.key, e.target.value)}
				/>
			)
	}
}
