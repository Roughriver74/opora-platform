import React from 'react'
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import { Box, Chip, Typography } from '@mui/material'
import { FormField } from '../../../../types'
import { SectionSelector } from './SectionSelector'

interface FieldsTableProps {
	fields: FormField[]
	sections: FormField[]
	onFieldUpdate: (
		fieldId: string,
		updates: Partial<FormField>
	) => Promise<boolean>
	getSectionName: (field: FormField) => string
}

export const FieldsTable: React.FC<FieldsTableProps> = ({
	fields,
	sections,
	onFieldUpdate,
	getSectionName,
}) => {
	const handleProcessRowUpdate = async (newRow: FormField) => {
		const success = await onFieldUpdate(newRow._id!, newRow)
		if (success) {
			return newRow
		}
		throw new Error('Ошибка обновления поля')
	}

	const handleSectionChange = async (
		fieldId: string,
		sectionId: string | null
	) => {
		await onFieldUpdate(fieldId, { sectionId: sectionId || undefined })
	}

	const columns: GridColDef[] = [
		{
			field: '_id',
			headerName: 'ID',
			width: 80,
			renderCell: (params: GridRenderCellParams) => (
				<Typography variant='caption' sx={{ color: 'text.secondary' }}>
					{params.value?.slice(-4)}
				</Typography>
			),
		},
		{
			field: 'name',
			headerName: 'Имя поля',
			width: 200,
			editable: true,
		},
		{
			field: 'label',
			headerName: 'Название',
			width: 250,
			editable: true,
		},
		{
			field: 'type',
			headerName: 'Тип',
			width: 120,
			renderCell: (params: GridRenderCellParams) => {
				const typeColors: Record<string, string> = {
					header: '#e3f2fd',
					text: '#f3e5f5',
					number: '#e8f5e8',
					select: '#fff3e0',
					autocomplete: '#fce4ec',
					checkbox: '#f1f8e9',
					textarea: '#e0f2f1',
					date: '#fff8e1',
					divider: '#fafafa',
				}

				return (
					<Chip
						label={params.value}
						size='small'
						sx={{
							backgroundColor: typeColors[params.value] || '#f5f5f5',
							fontSize: '0.75rem',
						}}
					/>
				)
			},
		},
		{
			field: 'order',
			headerName: 'Порядок',
			width: 100,
			type: 'number',
			editable: true,
		},
		{
			field: 'sectionDisplay',
			headerName: 'Раздел',
			width: 200,
			renderCell: (params: GridRenderCellParams) => {
				const field = params.row as FormField
				if (field.type === 'header' || field.type === 'divider') {
					return (
						<Typography
							variant='body2'
							sx={{ color: 'text.secondary', fontStyle: 'italic' }}
						>
							{getSectionName(field)}
						</Typography>
					)
				}

				return (
					<SectionSelector
						field={field}
						sections={sections}
						onSectionChange={handleSectionChange}
					/>
				)
			},
		},
		{
			field: 'required',
			headerName: 'Обязательное',
			width: 120,
			type: 'boolean',
			editable: true,
		},
		{
			field: 'bitrixKey',
			headerName: 'Битрикс поле',
			width: 150,
			editable: true,
		},
	]

	return (
		<Box sx={{ height: 600, width: '100%' }}>
			<DataGrid
				rows={fields}
				columns={columns}
				getRowId={row => row._id!}
				pageSizeOptions={[25, 50, 100]}
				initialState={{
					pagination: {
						paginationModel: { pageSize: 25 },
					},
				}}
				processRowUpdate={handleProcessRowUpdate}
				disableRowSelectionOnClick
				sx={{
					'& .MuiDataGrid-cell': {
						paddingX: 1,
					},
					'& .MuiDataGrid-row:hover': {
						backgroundColor: 'rgba(0, 0, 0, 0.04)',
					},
				}}
			/>
		</Box>
	)
}
