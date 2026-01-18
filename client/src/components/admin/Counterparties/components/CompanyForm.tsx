import React, { useEffect } from 'react'
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
	Grid,
	CircularProgress,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { Company, CompanyType, CreateCompanyDto } from '../../../../services/companyService'
import { useCreateCompany, useUpdateCompany } from '../hooks/useCompanies'

interface CompanyFormProps {
	open: boolean
	onClose: () => void
	company?: Company | null
}

const companyTypes = [
	{ value: CompanyType.CUSTOMER, label: 'Клиент' },
	{ value: CompanyType.SUPPLIER, label: 'Поставщик' },
	{ value: CompanyType.PARTNER, label: 'Партнер' },
	{ value: CompanyType.CONTRACTOR, label: 'Подрядчик' },
	{ value: CompanyType.OTHER, label: 'Другое' },
]

export const CompanyForm: React.FC<CompanyFormProps> = ({
	open,
	onClose,
	company,
}) => {
	const isEditing = !!company

	const { control, handleSubmit, reset, formState: { errors } } = useForm<CreateCompanyDto>({
		defaultValues: {
			name: '',
			shortName: '',
			inn: '',
			kpp: '',
			ogrn: '',
			companyType: CompanyType.CUSTOMER,
			legalAddress: '',
			actualAddress: '',
			phone: '',
			email: '',
			website: '',
			industry: '',
			bankName: '',
			bankBik: '',
			bankAccount: '',
			corrAccount: '',
			description: '',
		},
	})

	const createCompany = useCreateCompany()
	const updateCompany = useUpdateCompany()

	useEffect(() => {
		if (company) {
			reset({
				name: company.name || '',
				shortName: company.shortName || '',
				inn: company.inn || '',
				kpp: company.kpp || '',
				ogrn: company.ogrn || '',
				companyType: company.companyType || CompanyType.CUSTOMER,
				legalAddress: company.legalAddress || '',
				actualAddress: company.actualAddress || '',
				phone: company.phone || '',
				email: company.email || '',
				website: company.website || '',
				industry: company.industry || '',
				bankName: company.bankName || '',
				bankBik: company.bankBik || '',
				bankAccount: company.bankAccount || '',
				corrAccount: company.corrAccount || '',
				description: company.description || '',
			})
		} else {
			reset({
				name: '',
				shortName: '',
				inn: '',
				kpp: '',
				ogrn: '',
				companyType: CompanyType.CUSTOMER,
				legalAddress: '',
				actualAddress: '',
				phone: '',
				email: '',
				website: '',
				industry: '',
				bankName: '',
				bankBik: '',
				bankAccount: '',
				corrAccount: '',
				description: '',
			})
		}
	}, [company, reset])

	const onSubmit = async (data: CreateCompanyDto) => {
		try {
			if (isEditing && company) {
				await updateCompany.mutateAsync({ id: company.id, data })
			} else {
				await createCompany.mutateAsync(data)
			}
			onClose()
		} catch (error: any) {
			alert(`Ошибка: ${error.message}`)
		}
	}

	const isSubmitting = createCompany.isPending || updateCompany.isPending

	return (
		<Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
			<DialogTitle>
				{isEditing ? 'Редактирование компании' : 'Добавление компании'}
			</DialogTitle>
			<form onSubmit={handleSubmit(onSubmit)}>
				<DialogContent>
					<Grid container spacing={2}>
						<Grid size={{ xs: 12, sm: 8 }}>
							<Controller
								name='name'
								control={control}
								rules={{ required: 'Название обязательно' }}
								render={({ field }) => (
									<TextField
										{...field}
										label='Название компании'
										fullWidth
										required
										error={!!errors.name}
										helperText={errors.name?.message}
									/>
								)}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 4 }}>
							<Controller
								name='shortName'
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label='Краткое название'
										fullWidth
									/>
								)}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 4 }}>
							<Controller
								name='inn'
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label='ИНН'
										fullWidth
									/>
								)}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 4 }}>
							<Controller
								name='kpp'
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label='КПП'
										fullWidth
									/>
								)}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 4 }}>
							<Controller
								name='ogrn'
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label='ОГРН'
										fullWidth
									/>
								)}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 6 }}>
							<Controller
								name='companyType'
								control={control}
								render={({ field }) => (
									<FormControl fullWidth>
										<InputLabel>Тип компании</InputLabel>
										<Select {...field} label='Тип компании'>
											{companyTypes.map(type => (
												<MenuItem key={type.value} value={type.value}>
													{type.label}
												</MenuItem>
											))}
										</Select>
									</FormControl>
								)}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 6 }}>
							<Controller
								name='industry'
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label='Отрасль'
										fullWidth
									/>
								)}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 6 }}>
							<Controller
								name='phone'
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label='Телефон'
										fullWidth
									/>
								)}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 6 }}>
							<Controller
								name='email'
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label='Email'
										type='email'
										fullWidth
									/>
								)}
							/>
						</Grid>
						<Grid size={12}>
							<Controller
								name='legalAddress'
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label='Юридический адрес'
										fullWidth
										multiline
										rows={2}
									/>
								)}
							/>
						</Grid>
						<Grid size={12}>
							<Controller
								name='actualAddress'
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label='Фактический адрес'
										fullWidth
										multiline
										rows={2}
									/>
								)}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 6 }}>
							<Controller
								name='bankName'
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label='Банк'
										fullWidth
									/>
								)}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 6 }}>
							<Controller
								name='bankBik'
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label='БИК'
										fullWidth
									/>
								)}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 6 }}>
							<Controller
								name='bankAccount'
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label='Расчетный счет'
										fullWidth
									/>
								)}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 6 }}>
							<Controller
								name='corrAccount'
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label='Корр. счет'
										fullWidth
									/>
								)}
							/>
						</Grid>
						<Grid size={12}>
							<Controller
								name='description'
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label='Примечание'
										fullWidth
										multiline
										rows={3}
									/>
								)}
							/>
						</Grid>
					</Grid>
				</DialogContent>
				<DialogActions>
					<Button onClick={onClose} disabled={isSubmitting}>
						Отмена
					</Button>
					<Button
						type='submit'
						variant='contained'
						disabled={isSubmitting}
						startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
					>
						{isEditing ? 'Сохранить' : 'Создать'}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	)
}
