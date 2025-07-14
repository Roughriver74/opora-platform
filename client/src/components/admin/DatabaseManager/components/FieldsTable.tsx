import React from 'react'
import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Typography,
	Chip,
	CircularProgress,
	Box,
} from '@mui/material'
import { FormField } from '../../../../types'

interface FieldsTableProps {
	fields: FormField[]
	onUpdateField: (id: string, updates: Partial<FormField>) => Promise<void>
	loading: boolean
}

export const FieldsTable: React.FC<FieldsTableProps> = ({
	fields,
	onUpdateField,
	loading,
}) => {
	if (loading) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
				<CircularProgress />
			</Box>
		)
	}

	if (!fields || fields.length === 0) {
		return (
			<Box sx={{ textAlign: 'center', py: 4 }}>
				<Typography variant='body1' color='text.secondary'>
					Нет данных для отображения
				</Typography>
			</Box>
		)
	}

	return (
		<TableContainer component={Paper}>
			<Table>
				<TableHead>
					<TableRow>
						<TableCell>Название</TableCell>
						<TableCell>Подпись</TableCell>
						<TableCell>Тип</TableCell>
						<TableCell>Порядок</TableCell>
						<TableCell>Обязательное</TableCell>
						<TableCell>ID секции</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{fields.map(field => (
						<TableRow key={field._id}>
							<TableCell>{field.name}</TableCell>
							<TableCell>{field.label}</TableCell>
							<TableCell>
								<Chip label={field.type} size='small' />
							</TableCell>
							<TableCell>{field.order}</TableCell>
							<TableCell>
								{field.required ? (
									<Chip label='Да' color='primary' size='small' />
								) : (
									<Chip label='Нет' color='default' size='small' />
								)}
							</TableCell>
							<TableCell>{field.sectionId || 'Без секции'}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	)
}
