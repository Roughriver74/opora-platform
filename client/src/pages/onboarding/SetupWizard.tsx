import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	Box,
	Button,
	Card,
	CardContent,
	Checkbox,
	Container,
	FormControl,
	FormControlLabel,
	FormGroup,
	FormHelperText,
	InputLabel,
	MenuItem,
	Select,
	Step,
	StepLabel,
	Stepper,
	Switch,
	TextField,
	Typography,
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import IndustryTemplates, { ModuleSelection } from './IndustryTemplates'

// ─── Types ───────────────────────────────────────────────────────────────────

interface WizardState {
	// Step 1
	orgName: string
	inn: string
	industry: string
	// Step 2
	modules: ModuleSelection
	// Step 3
	bitrix24Enabled: boolean
	bitrix24Webhook: string
}

const INITIAL_STATE: WizardState = {
	orgName: '',
	inn: '',
	industry: '',
	modules: { orders: true, visits: false },
	bitrix24Enabled: false,
	bitrix24Webhook: '',
}

const STEPS = [
	'Основная информация',
	'Выбор модулей',
	'Интеграции',
	'Готово!',
]

const INDUSTRIES = [
	{ value: 'pharma', label: 'Фарма' },
	{ value: 'fmcg', label: 'FMCG' },
	{ value: 'construction', label: 'Стройматериалы' },
	{ value: 'equipment', label: 'Оборудование' },
	{ value: 'service', label: 'Сервис' },
	{ value: 'other', label: 'Другое' },
]

// ─── Step components ──────────────────────────────────────────────────────────

interface StepOneProps {
	state: WizardState
	errors: Partial<Record<keyof WizardState, string>>
	onChange: (field: keyof WizardState, value: string) => void
}

const StepOne: React.FC<StepOneProps> = ({ state, errors, onChange }) => (
	<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
		<TextField
			label='Название организации'
			value={state.orgName}
			onChange={(e) => onChange('orgName', e.target.value)}
			error={!!errors.orgName}
			helperText={errors.orgName}
			required
			fullWidth
			autoFocus
		/>
		<TextField
			label='ИНН'
			value={state.inn}
			onChange={(e) => onChange('inn', e.target.value)}
			fullWidth
			inputProps={{ maxLength: 12 }}
			helperText='Необязательно'
		/>
		<FormControl fullWidth>
			<InputLabel id='industry-label'>Отрасль</InputLabel>
			<Select
				labelId='industry-label'
				value={state.industry}
				label='Отрасль'
				onChange={(e) => onChange('industry', e.target.value)}
			>
				{INDUSTRIES.map((ind) => (
					<MenuItem key={ind.value} value={ind.value}>
						{ind.label}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	</Box>
)

// ─────────────────────────────────────────────────────────────────────────────

interface StepTwoProps {
	state: WizardState
	errors: Partial<Record<keyof WizardState, string>>
	onModulesChange: (modules: ModuleSelection) => void
	onIndustrySelect: (industryKey: string, modules: ModuleSelection) => void
}

const StepTwo: React.FC<StepTwoProps> = ({
	state,
	errors,
	onModulesChange,
	onIndustrySelect,
}) => {
	const toggleModule = (key: keyof ModuleSelection) => {
		onModulesChange({ ...state.modules, [key]: !state.modules[key] })
	}

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
			{state.industry && (
				<IndustryTemplates
					selectedIndustry={state.industry}
					onSelect={onIndustrySelect}
				/>
			)}

			<Box>
				<Typography variant='subtitle1' gutterBottom>
					Активные модули
				</Typography>
				<FormGroup>
					<FormControlLabel
						control={
							<Checkbox
								checked={state.modules.orders}
								onChange={() => toggleModule('orders')}
							/>
						}
						label={
							<Box>
								<Typography variant='body1'>Заказы</Typography>
								<Typography variant='caption' color='text.secondary'>
									Оформление и отслеживание заказов
								</Typography>
							</Box>
						}
					/>
					<FormControlLabel
						control={
							<Checkbox
								checked={state.modules.visits}
								onChange={() => toggleModule('visits')}
							/>
						}
						label={
							<Box>
								<Typography variant='body1'>Визиты</Typography>
								<Typography variant='caption' color='text.secondary'>
									Планирование и фиксация визитов к клиентам
								</Typography>
							</Box>
						}
						sx={{ mt: 1 }}
					/>
				</FormGroup>
				{errors.modules && (
					<FormHelperText error>{errors.modules}</FormHelperText>
				)}
			</Box>
		</Box>
	)
}

// ─────────────────────────────────────────────────────────────────────────────

interface StepThreeProps {
	state: WizardState
	onChange: (field: keyof WizardState, value: string | boolean) => void
}

const StepThree: React.FC<StepThreeProps> = ({ state, onChange }) => (
	<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
		<FormControlLabel
			control={
				<Switch
					checked={state.bitrix24Enabled}
					onChange={(e) => onChange('bitrix24Enabled', e.target.checked)}
				/>
			}
			label='Подключить Bitrix24?'
		/>

		{state.bitrix24Enabled && (
			<TextField
				label='Webhook URL'
				value={state.bitrix24Webhook}
				onChange={(e) => onChange('bitrix24Webhook', e.target.value)}
				fullWidth
				placeholder='https://your-domain.bitrix24.ru/rest/...'
				helperText='Формат: https://домен.bitrix24.ru/rest/ID/ключ/'
			/>
		)}

		<Typography variant='body2' color='text.secondary'>
			Можно настроить позже в разделе Настройки
		</Typography>
	</Box>
)

// ─────────────────────────────────────────────────────────────────────────────

interface StepFourProps {
	state: WizardState
}

const INDUSTRY_LABELS: Record<string, string> = {
	pharma: 'Фарма',
	fmcg: 'FMCG',
	construction: 'Стройматериалы',
	equipment: 'Оборудование',
	service: 'Сервис',
	other: 'Другое',
}

const SummaryRow: React.FC<{ label: string; value: React.ReactNode }> = ({
	label,
	value,
}) => (
	<Box sx={{ display: 'flex', gap: 1 }}>
		<Typography variant='body2' color='text.secondary' sx={{ minWidth: 160 }}>
			{label}
		</Typography>
		<Typography variant='body2' fontWeight={500}>
			{value}
		</Typography>
	</Box>
)

const StepFour: React.FC<StepFourProps> = ({ state }) => {
	const activeModules = [
		state.modules.orders && 'Заказы',
		state.modules.visits && 'Визиты',
	]
		.filter(Boolean)
		.join(', ')

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
				<CheckCircleOutlineIcon color='success' sx={{ fontSize: 40 }} />
				<Typography variant='h5'>Всё готово к работе!</Typography>
			</Box>

			<Card variant='outlined'>
				<CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
					<Typography variant='subtitle2' color='text.secondary' gutterBottom>
						Итог настройки
					</Typography>
					<SummaryRow label='Организация' value={state.orgName || '—'} />
					{state.inn && <SummaryRow label='ИНН' value={state.inn} />}
					{state.industry && (
						<SummaryRow
							label='Отрасль'
							value={INDUSTRY_LABELS[state.industry] ?? state.industry}
						/>
					)}
					<SummaryRow
						label='Активные модули'
						value={activeModules || '—'}
					/>
					<SummaryRow
						label='Bitrix24'
						value={state.bitrix24Enabled ? 'Подключён' : 'Не подключён'}
					/>
				</CardContent>
			</Card>

			<Typography variant='body2' color='text.secondary'>
				Вы можете изменить все настройки позже в разделе Настройки.
			</Typography>
		</Box>
	)
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

const SetupWizard: React.FC = () => {
	const navigate = useNavigate()
	const [activeStep, setActiveStep] = useState(0)
	const [state, setState] = useState<WizardState>(INITIAL_STATE)
	const [errors, setErrors] = useState<Partial<Record<keyof WizardState, string>>>({})

	const updateField = (field: keyof WizardState, value: string | boolean) => {
		setState((prev) => ({ ...prev, [field]: value }))
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }))
		}
	}

	const updateModules = (modules: ModuleSelection) => {
		setState((prev) => ({ ...prev, modules }))
		if (errors.modules) {
			setErrors((prev) => ({ ...prev, modules: undefined }))
		}
	}

	const handleIndustrySelect = (industryKey: string, modules: ModuleSelection) => {
		setState((prev) => ({ ...prev, industry: industryKey, modules }))
		setErrors((prev) => ({ ...prev, modules: undefined }))
	}

	const validateStep = (step: number): boolean => {
		const newErrors: Partial<Record<keyof WizardState, string>> = {}

		if (step === 0) {
			if (!state.orgName.trim()) {
				newErrors.orgName = 'Укажите название организации'
			}
		}

		if (step === 1) {
			if (!state.modules.orders && !state.modules.visits) {
				newErrors.modules = 'Выберите хотя бы один модуль'
			}
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleNext = () => {
		if (!validateStep(activeStep)) return
		setActiveStep((prev) => prev + 1)
	}

	const handleBack = () => {
		setActiveStep((prev) => prev - 1)
	}

	const handleFinish = () => {
		// No API call yet — just navigate to home
		navigate('/')
	}

	const isLastStep = activeStep === STEPS.length - 1

	return (
		<Container maxWidth='sm' sx={{ mt: { xs: 3, sm: 6 }, mb: 6, px: { xs: 2, sm: 3 } }}>
			<Typography variant='h4' component='h1' gutterBottom sx={{ mb: 3 }}>
				Настройка организации
			</Typography>

			<Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
				{STEPS.map((label) => (
					<Step key={label}>
						<StepLabel>{label}</StepLabel>
					</Step>
				))}
			</Stepper>

			<Card variant='outlined'>
				<CardContent sx={{ p: { xs: 2, sm: 3 } }}>
					<Typography variant='h6' gutterBottom sx={{ mb: 3 }}>
						{STEPS[activeStep]}
					</Typography>

					{activeStep === 0 && (
						<StepOne state={state} errors={errors} onChange={updateField} />
					)}
					{activeStep === 1 && (
						<StepTwo
							state={state}
							errors={errors}
							onModulesChange={updateModules}
							onIndustrySelect={handleIndustrySelect}
						/>
					)}
					{activeStep === 2 && (
						<StepThree state={state} onChange={updateField} />
					)}
					{activeStep === 3 && <StepFour state={state} />}
				</CardContent>
			</Card>

			<Box
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
					mt: 3,
				}}
			>
				<Button
					variant='outlined'
					onClick={handleBack}
					disabled={activeStep === 0}
				>
					Назад
				</Button>

				{isLastStep ? (
					<Button variant='contained' size='large' onClick={handleFinish}>
						Начать работу
					</Button>
				) : (
					<Button variant='contained' onClick={handleNext}>
						{activeStep === 2 ? 'Пропустить / Далее' : 'Далее'}
					</Button>
				)}
			</Box>
		</Container>
	)
}

export default SetupWizard
