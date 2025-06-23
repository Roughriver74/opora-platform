import React, { useState, useCallback } from 'react'
import {
	useReactTable,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	flexRender,
	ColumnDef,
} from '@tanstack/react-table'
import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	CircularProgress,
	Box,
	TextField,
	Chip,
	IconButton,
	Alert,
	Snackbar,
} from '@mui/material'
import {
	Save as SaveIcon,
	Edit as EditIcon,
	Cancel as CancelIcon,
	FilterList as FilterIcon,
} from '@mui/icons-material'

interface DatabaseTableProps {
	data: any[]
	columns: ColumnDef<any, any>[]
	isLoading?: boolean
	onUpdateRow: (id: string, updates: any) => Promise<void>
	tableName: string
}

interface EditingCell {
	rowId: string
	columnId: string
	value: any
}

export const DatabaseTable: React.FC<DatabaseTableProps> = ({
	data,
	columns,
	isLoading,
	onUpdateRow,
	tableName,
}) => {
	const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
	const [savingCells, setSavingCells] = useState<Set<string>>(new Set())
	const [successMessage, setSuccessMessage] = useState<string>('')
	const [errorMessage, setErrorMessage] = useState<string>('')
	const [globalFilter, setGlobalFilter] = useState('')

	// Защита от пустых данных
	const safeData = data || []

	// Функции для редактирования (объявляем перед useMemo)
	const startEditing = useCallback(
		(rowId: string, columnId: string, value: any) => {
			setEditingCell({ rowId, columnId, value })
		},
		[]
	)

	const handleSaveCell = useCallback(
		async (rowId: string, columnId: string) => {
			if (
				!editingCell ||
				editingCell.rowId !== rowId ||
				editingCell.columnId !== columnId
			) {
				return
			}

			const cellKey = `${rowId}-${columnId}`
			setSavingCells(prev => new Set(prev).add(cellKey))

			try {
				await onUpdateRow(rowId, { [columnId]: editingCell.value })
				setEditingCell(null)
				setSuccessMessage(`✅ Поле "${columnId}" успешно обновлено`)
			} catch (error: any) {
				setErrorMessage(`❌ Ошибка сохранения: ${error.message}`)
			} finally {
				setSavingCells(prev => {
					const newSet = new Set(prev)
					newSet.delete(cellKey)
					return newSet
				})
			}
		},
		[editingCell, onUpdateRow]
	)

	// Создаем колонки с возможностью редактирования
	const editableColumns = React.useMemo(() => {
		return columns.map((column: any) => ({
			...column,
			cell: ({ getValue, row, column: col }: any) => {
				const value = getValue()
				const rowId = row.original?._id
				if (!rowId) return value // Защита от undefined

				const cellKey = `${rowId}-${col.id}`
				const isEditing =
					editingCell?.rowId === rowId && editingCell?.columnId === col.id
				const isSaving = savingCells.has(cellKey)

				// Особая обработка для boolean значений
				if (col.id === 'required' && typeof value === 'boolean') {
					return isEditing ? (
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<TextField
								select
								size='small'
								value={editingCell?.value?.toString() || 'false'}
								onChange={e =>
									setEditingCell(prev =>
										prev
											? {
													...prev,
													value: e.target.value === 'true',
											  }
											: null
									)
								}
								onKeyDown={e => {
									if (e.key === 'Enter') {
										handleSaveCell(rowId, col.id)
									} else if (e.key === 'Escape') {
										setEditingCell(null)
									}
								}}
								SelectProps={{
									native: true,
								}}
								variant='outlined'
								autoFocus
							>
								<option value='false'>Нет</option>
								<option value='true'>Да</option>
							</TextField>
							<IconButton
								size='small'
								onClick={() => handleSaveCell(rowId, col.id)}
								disabled={isSaving}
							>
								{isSaving ? (
									<CircularProgress size={16} />
								) : (
									<SaveIcon fontSize='small' />
								)}
							</IconButton>
							<IconButton size='small' onClick={() => setEditingCell(null)}>
								<CancelIcon fontSize='small' />
							</IconButton>
						</Box>
					) : (
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<Chip
								label={value ? 'Да' : 'Нет'}
								color={value ? 'success' : 'default'}
								size='small'
							/>
							<IconButton
								size='small'
								onClick={() => startEditing(rowId, col.id, value)}
								sx={{
									opacity: 0,
									transition: 'opacity 0.2s',
									'.MuiTableRow-root:hover &': { opacity: 1 },
								}}
							>
								<EditIcon fontSize='small' />
							</IconButton>
						</Box>
					)
				}

				// Обычные текстовые/числовые поля
				return isEditing ? (
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
						<TextField
							size='small'
							value={editingCell?.value || ''}
							onChange={e =>
								setEditingCell(prev =>
									prev
										? {
												...prev,
												value:
													col.id === 'order'
														? parseInt(e.target.value) || 0
														: e.target.value,
										  }
										: null
								)
							}
							onKeyDown={e => {
								if (e.key === 'Enter') {
									handleSaveCell(rowId, col.id)
								} else if (e.key === 'Escape') {
									setEditingCell(null)
								}
							}}
							onBlur={() => handleSaveCell(rowId, col.id)}
							variant='outlined'
							type={col.id === 'order' ? 'number' : 'text'}
							autoFocus
							fullWidth
						/>
						<IconButton
							size='small'
							onClick={() => handleSaveCell(rowId, col.id)}
							disabled={isSaving}
						>
							{isSaving ? (
								<CircularProgress size={16} />
							) : (
								<SaveIcon fontSize='small' />
							)}
						</IconButton>
						<IconButton size='small' onClick={() => setEditingCell(null)}>
							<CancelIcon fontSize='small' />
						</IconButton>
					</Box>
				) : (
					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							gap: 1,
							cursor: 'pointer',
							padding: 1,
							borderRadius: 1,
							'&:hover': { backgroundColor: 'action.hover' },
						}}
						onDoubleClick={() => startEditing(rowId, col.id, value)}
					>
						<span>{column.cell ? column.cell({ getValue }) : value}</span>
						<IconButton
							size='small'
							onClick={() => startEditing(rowId, col.id, value)}
							sx={{
								opacity: 0,
								transition: 'opacity 0.2s',
								'.MuiTableRow-root:hover &': { opacity: 1 },
							}}
						>
							<EditIcon fontSize='small' />
						</IconButton>
					</Box>
				)
			},
		}))
	}, [columns, editingCell, savingCells, handleSaveCell, startEditing])

	const table = useReactTable({
		data: safeData,
		columns: editableColumns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		state: {
			globalFilter,
		},
		onGlobalFilterChange: setGlobalFilter,
	})

	if (isLoading) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
				<CircularProgress />
			</Box>
		)
	}

	return (
		<Box sx={{ p: 2 }}>
			{/* Поиск */}
			<Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
				<FilterIcon color='action' />
				<TextField
					placeholder={`Поиск по таблице ${tableName}...`}
					value={globalFilter}
					onChange={e => setGlobalFilter(e.target.value)}
					size='small'
					sx={{ minWidth: 300 }}
				/>
				<Chip
					label={`${safeData.length} записей`}
					color='primary'
					variant='outlined'
				/>
			</Box>

			{/* Таблица */}
			<TableContainer component={Paper} elevation={2}>
				<Table stickyHeader>
					<TableHead>
						{table.getHeaderGroups().map(headerGroup => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map(header => (
									<TableCell
										key={header.id}
										sx={{
											cursor: header.column.getCanSort()
												? 'pointer'
												: 'default',
											backgroundColor: 'grey.50',
											fontWeight: 'bold',
											userSelect: 'none',
										}}
										onClick={header.column.getToggleSortingHandler()}
									>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
											{flexRender(
												header.column.columnDef.header,
												header.getContext()
											)}
											{{
												asc: ' 🔼',
												desc: ' 🔽',
											}[header.column.getIsSorted() as string] ?? null}
										</Box>
									</TableCell>
								))}
							</TableRow>
						))}
					</TableHead>
					<TableBody>
						{table.getRowModel().rows.map(row => (
							<TableRow
								key={row.id}
								hover
								sx={{
									'&:hover .edit-button': {
										opacity: 1,
									},
								}}
							>
								{row.getVisibleCells().map(cell => (
									<TableCell key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>

			{/* Уведомления */}
			<Snackbar
				open={!!successMessage}
				autoHideDuration={3000}
				onClose={() => setSuccessMessage('')}
			>
				<Alert severity='success' onClose={() => setSuccessMessage('')}>
					{successMessage}
				</Alert>
			</Snackbar>

			<Snackbar
				open={!!errorMessage}
				autoHideDuration={5000}
				onClose={() => setErrorMessage('')}
			>
				<Alert severity='error' onClose={() => setErrorMessage('')}>
					{errorMessage}
				</Alert>
			</Snackbar>
		</Box>
	)
}
