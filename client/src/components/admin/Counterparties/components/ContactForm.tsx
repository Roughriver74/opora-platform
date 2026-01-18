import React, { useEffect, useState } from 'react'
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
	Autocomplete,
	FormControlLabel,
	Switch,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { Contact, ContactType, CreateContactDto } from '../../../../services/contactService'
import { CompanyService, Company } from '../../../../services/companyService'
import { useCreateContact, useUpdateContact } from '../hooks/useContacts'

interface ContactFormProps {
	open: boolean
	onClose: () => void
	contact?: Contact | null
}

const contactTypes = [
	{ value: ContactType.DECISION_MAKER, label: 'ЛПР' },
	{ value: ContactType.DIRECTOR, label: 'Директор' },
	{ value: ContactType.MANAGER, label: 'Менеджер' },
	{ value: ContactType.ACCOUNTANT, label: 'Бухгалтер' },
	{ value: ContactType.DISPATCHER, label: 'Диспетчер' },
	{ value: ContactType.OTHER, label: 'Другое' },
]

export const ContactForm: React.FC<ContactFormProps> = ({
	open,
	onClose,
	contact,
}) => {
	const isEditing = !!contact
	const [companies, setCompanies] = useState<Company[]>([])
	const [companiesLoading, setCompaniesLoading] = useState(false)

	const { control, handleSubmit, reset, formState: { errors } } = useForm<CreateContactDto & { isPrimary?: boolean }>({
		defaultValues: {
			firstName: '',
			lastName: '',
			middleName: '',
			phone: '',
			email: '',
			position: '',
			contactType: ContactType.MANAGER,
			companyId: '',
			description: '',
			isPrimary: false,
		},
	})

	const createContact = useCreateContact()
	const updateContact = useUpdateContact()

	// Load companies for autocomplete
	useEffect(() => {
		if (open) {
			setCompaniesLoading(true)
			CompanyService.getAll({ limit: 100 })
				.then(response => {
					setCompanies(response.data)
				})
				.catch(console.error)
				.finally(() => setCompaniesLoading(false))
		}
	}, [open])

	useEffect(() => {
		if (contact) {
			reset({
				firstName: contact.firstName || '',
				lastName: contact.lastName || '',
				middleName: contact.middleName || '',
				phone: contact.phone || '',
				email: contact.email || '',
				position: contact.position || '',
				contactType: contact.contactType || ContactType.MANAGER,
				companyId: contact.companyId || '',
				description: contact.description || '',
				isPrimary: contact.isPrimary || false,
			})
		} else {
			reset({
				firstName: '',
				lastName: '',
				middleName: '',
				phone: '',
				email: '',
				position: '',
				contactType: ContactType.MANAGER,
				companyId: '',
				description: '',
				isPrimary: false,
			})
		}
	}, [contact, reset])

	const onSubmit = async (data: CreateContactDto & { isPrimary?: boolean }) => {
		try {
			const { isPrimary, ...contactData } = data
			if (isEditing && contact) {
				await updateContact.mutateAsync({ id: contact.id, data: { ...contactData, isPrimary } })
			} else {
				await createContact.mutateAsync(contactData)
			}
			onClose()
		} catch (error: any) {
			alert(`Ошибка: ${error.message}`)
		}
	}

	const isSubmitting = createContact.isPending || updateContact.isPending

	return (
		<Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
			<DialogTitle>
				{isEditing ? 'Редактирование контакта' : 'Добавление контакта'}
			</DialogTitle>
			<form onSubmit={handleSubmit(onSubmit)}>
				<DialogContent>
					<Grid container spacing={2}>
						<Grid size={{ xs: 12, sm: 4 }}>
							<Controller
								name='lastName'
								control={control}
								rules={{ required: 'Фамилия обязательна' }}
								render={({ field }) => (
									<TextField
										{...field}
										label='Фамилия'
										fullWidth
										required
										error={!!errors.lastName}
										helperText={errors.lastName?.message}
									/>
								)}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 4 }}>
							<Controller
								name='firstName'
								control={control}
								rules={{ required: 'Имя обязательно' }}
								render={({ field }) => (
									<TextField
										{...field}
										label='Имя'
										fullWidth
										required
										error={!!errors.firstName}
										helperText={errors.firstName?.message}
									/>
								)}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 4 }}>
							<Controller
								name='middleName'
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label='Отчество'
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
						<Grid size={{ xs: 12, sm: 6 }}>
							<Controller
								name='position'
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label='Должность'
										fullWidth
									/>
								)}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 6 }}>
							<Controller
								name='contactType'
								control={control}
								render={({ field }) => (
									<FormControl fullWidth>
										<InputLabel>Тип контакта</InputLabel>
										<Select {...field} label='Тип контакта'>
											{contactTypes.map(type => (
												<MenuItem key={type.value} value={type.value}>
													{type.label}
												</MenuItem>
											))}
										</Select>
									</FormControl>
								)}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 8 }}>
							<Controller
								name='companyId'
								control={control}
								render={({ field }) => (
									<Autocomplete
										options={companies}
										loading={companiesLoading}
										getOptionLabel={(option) => option.name}
										value={companies.find(c => c.id === field.value) || null}
										onChange={(_, newValue) => {
											field.onChange(newValue?.id || '')
										}}
										renderInput={(params) => (
											<TextField
												{...params}
												label='Компания'
												InputProps={{
													...params.InputProps,
													endAdornment: (
														<>
															{companiesLoading ? (
																<CircularProgress color='inherit' size={20} />
															) : null}
															{params.InputProps.endAdornment}
														</>
													),
												}}
											/>
										)}
									/>
								)}
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 4 }}>
							<Controller
								name='isPrimary'
								control={control}
								render={({ field }) => (
									<FormControlLabel
										control={
											<Switch
												checked={field.value}
												onChange={(e) => field.onChange(e.target.checked)}
											/>
										}
										label='Основной контакт'
										sx={{ mt: 1 }}
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
