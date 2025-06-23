import React from 'react'
import {
	Box,
	Paper,
	Typography,
	Alert,
	CircularProgress,
	Button,
	Stack,
} from '@mui/material'
import { Refresh } from '@mui/icons-material'
import { FieldsTable } from './components/FieldsTable'
import { useSimpleFields } from './hooks/useSimpleFields'

export const SimpleDatabase: React.FC = () => {
	const {
		fields,
		loading,
		error,
		updateField,
		getSections,
		getSectionName,
		reload,
	} = useSimpleFields()

	const sections = getSections()

	if (loading) {
		return (
			<Box
				display='flex'
				justifyContent='center'
				alignItems='center'
				height={400}
			>
				<CircularProgress />
			</Box>
		)
	}

	return (
		<Box>
			<Paper sx={{ p: 3 }}>
				<Stack
					direction='row'
					justifyContent='space-between'
					alignItems='center'
					mb={3}
				>
					<div>
						<Typography variant='h5' component='h2' gutterBottom>
							🗄️ Управление базой данных
						</Typography>
						<Typography variant='body2' color='text.secondary'>
							Простое редактирование полей формы и управление разделами
						</Typography>
					</div>
					<Button
						variant='outlined'
						startIcon={<Refresh />}
						onClick={reload}
						disabled={loading}
					>
						Обновить
					</Button>
				</Stack>

				{error && (
					<Alert severity='error' sx={{ mb: 3 }}>
						{error}
					</Alert>
				)}

				<Box mb={2}>
					<Typography variant='h6' gutterBottom>
						📊 Статистика
					</Typography>
					<Stack direction='row' spacing={3}>
						<Typography variant='body2'>
							Всего полей: <strong>{fields.length}</strong>
						</Typography>
						<Typography variant='body2'>
							Разделов: <strong>{sections.length}</strong>
						</Typography>
						<Typography variant='body2'>
							Обычных полей:{' '}
							<strong>
								{
									fields.filter(
										f => f.type !== 'header' && f.type !== 'divider'
									).length
								}
							</strong>
						</Typography>
					</Stack>
				</Box>

				<FieldsTable
					fields={fields}
					sections={sections}
					onFieldUpdate={updateField}
					getSectionName={getSectionName}
				/>
			</Paper>
		</Box>
	)
}
