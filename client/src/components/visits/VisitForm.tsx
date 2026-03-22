import React from 'react'
import { Box, TextField, Button, Stack } from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { CreateVisitData } from '../../types/visit'

interface VisitFormProps {
	onSubmit: (data: CreateVisitData) => void
	onCancel: () => void
	initialData?: Partial<CreateVisitData>
}

export const VisitForm: React.FC<VisitFormProps> = ({ onSubmit, onCancel, initialData }) => {
	const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateVisitData>({
		defaultValues: {
			companyId: initialData?.companyId ?? '',
			contactId: initialData?.contactId ?? '',
			date: initialData?.date ?? '',
			visitType: initialData?.visitType ?? '',
			comment: initialData?.comment ?? '',
			dynamicFields: initialData?.dynamicFields ?? {},
		},
	})

	return (
		<Box component='form' onSubmit={handleSubmit(onSubmit)} noValidate>
			<Stack spacing={2}>
				<Controller
					name='companyId'
					control={control}
					rules={{ required: 'Компания обязательна' }}
					render={({ field }) => (
						<TextField
							{...field}
							label='ID компании'
							fullWidth
							required
							error={!!errors.companyId}
							helperText={errors.companyId?.message}
						/>
					)}
				/>
				<Controller
					name='date'
					control={control}
					rules={{ required: 'Дата обязательна' }}
					render={({ field }) => (
						<TextField
							{...field}
							label='Дата и время'
							type='datetime-local'
							fullWidth
							required
							slotProps={{ inputLabel: { shrink: true } }}
							error={!!errors.date}
							helperText={errors.date?.message}
						/>
					)}
				/>
				<Controller
					name='visitType'
					control={control}
					render={({ field }) => (
						<TextField
							{...field}
							label='Тип визита'
							fullWidth
						/>
					)}
				/>
				<Controller
					name='comment'
					control={control}
					render={({ field }) => (
						<TextField
							{...field}
							label='Комментарий'
							fullWidth
							multiline
							rows={3}
						/>
					)}
				/>
				<Stack direction='row' spacing={1} justifyContent='flex-end'>
					<Button onClick={onCancel} disabled={isSubmitting}>
						Отмена
					</Button>
					<Button type='submit' variant='contained' disabled={isSubmitting}>
						{initialData?.companyId ? 'Сохранить' : 'Создать'}
					</Button>
				</Stack>
			</Stack>
		</Box>
	)
}
