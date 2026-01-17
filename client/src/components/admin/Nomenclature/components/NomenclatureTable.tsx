import React, { useState, useCallback } from 'react'
import {
	Box,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	IconButton,
	Button,
	TextField,
	Stack,
	Chip,
	Tooltip,
	CircularProgress,
	Alert,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	InputAdornment,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
	useNomenclatureList,
	useDeleteNomenclature,
	useCategories,
} from '../hooks/useNomenclature'
import {
	NomenclatureType,
	NomenclatureSyncStatus,
	NomenclatureListParams,
	NomenclatureService,
} from '../../../../services/nomenclatureService'
import { NomenclatureForm } from './NomenclatureForm'
import { NomenclatureImportDialog } from './NomenclatureImportDialog'

const typeLabels: Record<NomenclatureType, string> = {
	[NomenclatureType.PRODUCT]: 'Товар',
	[NomenclatureType.SERVICE]: 'Услуга',
	[NomenclatureType.MATERIAL]: 'Материал',
}

const syncStatusLabels: Record<NomenclatureSyncStatus, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
	[NomenclatureSyncStatus.SYNCED]: { label: 'Синхронизировано', color: 'success' },
	[NomenclatureSyncStatus.PENDING]: { label: 'Ожидание', color: 'warning' },
	[NomenclatureSyncStatus.ERROR]: { label: 'Ошибка', color: 'error' },
	[NomenclatureSyncStatus.LOCAL_ONLY]: { label: 'Только локально', color: 'default' },
}

export const NomenclatureTable: React.FC = () => {
	const [params, setParams] = useState<NomenclatureListParams>({
		page: 1,
		limit: 20,
		sortBy: 'name',
		sortOrder: 'ASC',
	})
	const [searchInput, setSearchInput] = useState('')
	const [formOpen, setFormOpen] = useState(false)
	const [editingId, setEditingId] = useState<string | undefined>()
	const [importOpen, setImportOpen] = useState(false)

	const { data, isLoading, error, refetch } = useNomenclatureList(params)
	const { data: categories } = useCategories()
	const deleteMutation = useDeleteNomenclature()

	const handleSearch = useCallback(() => {
		setParams(prev => ({
			...prev,
			page: 1,
			search: searchInput || undefined,
		}))
	}, [searchInput])

	const handleSearchKeyPress = useCallback((e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSearch()
		}
	}, [handleSearch])

	const handleFilterChange = useCallback((key: keyof NomenclatureListParams, value: any) => {
		setParams(prev => ({
			...prev,
			page: 1,
			[key]: value || undefined,
		}))
	}, [])

	const handlePageChange = useCallback((_: unknown, newPage: number) => {
		setParams(prev => ({ ...prev, page: newPage + 1 }))
	}, [])

	const handleRowsPerPageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setParams(prev => ({
			...prev,
			page: 1,
			limit: parseInt(e.target.value, 10),
		}))
	}, [])

	const handleEdit = useCallback((id: string) => {
		setEditingId(id)
		setFormOpen(true)
	}, [])

	const handleAdd = useCallback(() => {
		setEditingId(undefined)
		setFormOpen(true)
	}, [])

	const handleDelete = useCallback(async (id: string, name: string) => {
		if (window.confirm(`Удалить "${name}"?`)) {
			await deleteMutation.mutateAsync(id)
		}
	}, [deleteMutation])

	const handleExport = useCallback(async () => {
		try {
			const blob = await NomenclatureService.exportExcel({
				categoryId: params.categoryId,
				type: params.type,
				syncStatus: params.syncStatus,
				isActive: params.isActive,
			})
			NomenclatureService.downloadFile(blob, `nomenclature_${new Date().toISOString().split('T')[0]}.xlsx`)
		} catch (err) {
			console.error('Export error:', err)
		}
	}, [params])

	const handleDownloadTemplate = useCallback(async () => {
		try {
			const blob = await NomenclatureService.downloadTemplate()
			NomenclatureService.downloadFile(blob, 'nomenclature_template.xlsx')
		} catch (err) {
			console.error('Download template error:', err)
		}
	}, [])

	return (
		<Box>
			{/* Toolbar */}
			<Stack
				direction={{ xs: 'column', md: 'row' }}
				spacing={2}
				mb={3}
				justifyContent='space-between'
				alignItems={{ xs: 'stretch', md: 'center' }}
			>
				<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexGrow={1}>
					<TextField
						size='small'
						placeholder='Поиск по названию, артикулу...'
						value={searchInput}
						onChange={e => setSearchInput(e.target.value)}
						onKeyPress={handleSearchKeyPress}
						sx={{ minWidth: 250 }}
						InputProps={{
							startAdornment: (
								<InputAdornment position='start'>
									<SearchIcon />
								</InputAdornment>
							),
						}}
					/>
					<Button variant='outlined' onClick={handleSearch}>
						Найти
					</Button>

					<FormControl size='small' sx={{ minWidth: 150 }}>
						<InputLabel>Категория</InputLabel>
						<Select
							label='Категория'
							value={params.categoryId || ''}
							onChange={e => handleFilterChange('categoryId', e.target.value)}
						>
							<MenuItem value=''>Все</MenuItem>
							{categories?.map(cat => (
								<MenuItem key={cat.id} value={cat.id}>
									{cat.name}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					<FormControl size='small' sx={{ minWidth: 120 }}>
						<InputLabel>Тип</InputLabel>
						<Select
							label='Тип'
							value={params.type || ''}
							onChange={e => handleFilterChange('type', e.target.value)}
						>
							<MenuItem value=''>Все</MenuItem>
							{Object.entries(typeLabels).map(([value, label]) => (
								<MenuItem key={value} value={value}>
									{label}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					<FormControl size='small' sx={{ minWidth: 150 }}>
						<InputLabel>Статус синх.</InputLabel>
						<Select
							label='Статус синх.'
							value={params.syncStatus || ''}
							onChange={e => handleFilterChange('syncStatus', e.target.value)}
						>
							<MenuItem value=''>Все</MenuItem>
							{Object.entries(syncStatusLabels).map(([value, { label }]) => (
								<MenuItem key={value} value={value}>
									{label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Stack>

				<Stack direction='row' spacing={1}>
					<Tooltip title='Обновить'>
						<IconButton onClick={() => refetch()}>
							<RefreshIcon />
						</IconButton>
					</Tooltip>
					<Tooltip title='Скачать шаблон'>
						<IconButton onClick={handleDownloadTemplate}>
							<FileDownloadIcon />
						</IconButton>
					</Tooltip>
					<Button
						variant='outlined'
						startIcon={<FileUploadIcon />}
						onClick={() => setImportOpen(true)}
					>
						Импорт
					</Button>
					<Button
						variant='outlined'
						startIcon={<FileDownloadIcon />}
						onClick={handleExport}
					>
						Экспорт
					</Button>
					<Button
						variant='contained'
						startIcon={<AddIcon />}
						onClick={handleAdd}
					>
						Добавить
					</Button>
				</Stack>
			</Stack>

			{error && (
				<Alert severity='error' sx={{ mb: 2 }}>
					{(error as Error).message}
				</Alert>
			)}

			{deleteMutation.error && (
				<Alert severity='error' sx={{ mb: 2 }}>
					Ошибка удаления: {(deleteMutation.error as Error).message}
				</Alert>
			)}

			{/* Table */}
			<TableContainer>
				<Table size='small'>
					<TableHead>
						<TableRow>
							<TableCell>Артикул</TableCell>
							<TableCell>Наименование</TableCell>
							<TableCell>Категория</TableCell>
							<TableCell>Тип</TableCell>
							<TableCell align='right'>Цена</TableCell>
							<TableCell>Ед. изм.</TableCell>
							<TableCell>Статус</TableCell>
							<TableCell>Bitrix ID</TableCell>
							<TableCell align='right'>Действия</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={9} align='center'>
									<CircularProgress size={24} />
								</TableCell>
							</TableRow>
						) : data?.data.length === 0 ? (
							<TableRow>
								<TableCell colSpan={9} align='center'>
									Номенклатура не найдена
								</TableCell>
							</TableRow>
						) : (
							data?.data.map(item => (
								<TableRow key={item.id} hover>
									<TableCell>
										<Chip label={item.sku} size='small' variant='outlined' />
									</TableCell>
									<TableCell>
										{item.name}
										{!item.isActive && (
											<Chip
												label='Неактивен'
												size='small'
												color='default'
												sx={{ ml: 1 }}
											/>
										)}
									</TableCell>
									<TableCell>{item.category?.name || '-'}</TableCell>
									<TableCell>
										<Chip
											label={typeLabels[item.type]}
											size='small'
											variant='outlined'
										/>
									</TableCell>
									<TableCell align='right'>
										{item.price
											? `${item.price.toLocaleString()} ${item.currency}`
											: '-'}
									</TableCell>
									<TableCell>{item.unit?.shortName || '-'}</TableCell>
									<TableCell>
										<Chip
											label={syncStatusLabels[item.syncStatus].label}
											size='small'
											color={syncStatusLabels[item.syncStatus].color}
										/>
									</TableCell>
									<TableCell>
										{item.bitrixProductId || '-'}
									</TableCell>
									<TableCell align='right'>
										<Tooltip title='Редактировать'>
											<IconButton
												size='small'
												onClick={() => handleEdit(item.id)}
											>
												<EditIcon fontSize='small' />
											</IconButton>
										</Tooltip>
										<Tooltip title='Удалить'>
											<IconButton
												size='small'
												color='error'
												onClick={() => handleDelete(item.id, item.name)}
												disabled={deleteMutation.isPending}
											>
												<DeleteIcon fontSize='small' />
											</IconButton>
										</Tooltip>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</TableContainer>

			{/* Pagination */}
			{data && (
				<TablePagination
					component='div'
					count={data.total}
					page={(params.page || 1) - 1}
					rowsPerPage={params.limit || 20}
					onPageChange={handlePageChange}
					onRowsPerPageChange={handleRowsPerPageChange}
					rowsPerPageOptions={[10, 20, 50, 100]}
					labelRowsPerPage='Строк на странице:'
					labelDisplayedRows={({ from, to, count }) =>
						`${from}-${to} из ${count !== -1 ? count : `более ${to}`}`
					}
				/>
			)}

			{/* Dialogs */}
			<NomenclatureForm
				open={formOpen}
				onClose={() => setFormOpen(false)}
				editingId={editingId}
			/>

			<NomenclatureImportDialog
				open={importOpen}
				onClose={() => setImportOpen(false)}
			/>
		</Box>
	)
}
