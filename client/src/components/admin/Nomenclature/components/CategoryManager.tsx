import React, { useState, useCallback } from 'react'
import {
	Box,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	IconButton,
	Button,
	TextField,
	Stack,
	Tooltip,
	CircularProgress,
	Alert,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	FormControlLabel,
	Switch,
	Chip,
	Grid,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useCategories, useCategoryMutations } from '../hooks/useNomenclature'
import { NomenclatureCategory, CreateCategoryDto, UpdateCategoryDto } from '../../../../services/nomenclatureService'
import { useForm, Controller } from 'react-hook-form'

interface CategoryFormData {
	code: string
	name: string
	description: string
	parentId: string
	sortOrder: number
	isActive: boolean
}

export const CategoryManager: React.FC = () => {
	const [formOpen, setFormOpen] = useState(false)
	const [editingCategory, setEditingCategory] = useState<NomenclatureCategory | null>(null)

	const { data: categories, isLoading, error, refetch } = useCategories()
	const { createCategory, updateCategory, deleteCategory } = useCategoryMutations()

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<CategoryFormData>({
		defaultValues: {
			code: '',
			name: '',
			description: '',
			parentId: '',
			sortOrder: 0,
			isActive: true,
		},
	})

	const handleAdd = useCallback(() => {
		setEditingCategory(null)
		reset({
			code: '',
			name: '',
			description: '',
			parentId: '',
			sortOrder: 0,
			isActive: true,
		})
		setFormOpen(true)
	}, [reset])

	const handleEdit = useCallback((category: NomenclatureCategory) => {
		setEditingCategory(category)
		reset({
			code: category.code,
			name: category.name,
			description: category.description || '',
			parentId: category.parentId || '',
			sortOrder: category.sortOrder,
			isActive: category.isActive,
		})
		setFormOpen(true)
	}, [reset])

	const handleDelete = useCallback(async (category: NomenclatureCategory) => {
		if (window.confirm(`Удалить категорию "${category.name}"?`)) {
			await deleteCategory.mutateAsync(category.id)
		}
	}, [deleteCategory])

	const onSubmit = async (data: CategoryFormData) => {
		try {
			const cleanData = {
				...data,
				parentId: data.parentId || undefined,
				description: data.description || undefined,
			}

			if (editingCategory) {
				await updateCategory.mutateAsync({
					id: editingCategory.id,
					data: cleanData as UpdateCategoryDto,
				})
			} else {
				await createCategory.mutateAsync(cleanData as CreateCategoryDto)
			}
			setFormOpen(false)
		} catch (err) {
			console.error('Save category error:', err)
		}
	}

	const mutationError = createCategory.error || updateCategory.error || deleteCategory.error

	return (
		<Box>
			{/* Toolbar */}
			<Stack
				direction='row'
				spacing={2}
				mb={3}
				justifyContent='space-between'
				alignItems='center'
			>
				<Alert severity='info' sx={{ flexGrow: 1 }}>
					Категории используются для группировки номенклатуры. Вы можете создавать иерархию категорий.
				</Alert>
				<Stack direction='row' spacing={1}>
					<Tooltip title='Обновить'>
						<IconButton onClick={() => refetch()}>
							<RefreshIcon />
						</IconButton>
					</Tooltip>
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

			{mutationError && (
				<Alert severity='error' sx={{ mb: 2 }}>
					{(mutationError as Error).message}
				</Alert>
			)}

			{/* Table */}
			<TableContainer>
				<Table size='small'>
					<TableHead>
						<TableRow>
							<TableCell>Код</TableCell>
							<TableCell>Название</TableCell>
							<TableCell>Описание</TableCell>
							<TableCell>Родительская</TableCell>
							<TableCell>Порядок</TableCell>
							<TableCell>Статус</TableCell>
							<TableCell>Bitrix ID</TableCell>
							<TableCell align='right'>Действия</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={8} align='center'>
									<CircularProgress size={24} />
								</TableCell>
							</TableRow>
						) : categories?.length === 0 ? (
							<TableRow>
								<TableCell colSpan={8} align='center'>
									Категории не найдены
								</TableCell>
							</TableRow>
						) : (
							categories?.map(category => (
								<TableRow key={category.id} hover>
									<TableCell>
										<Chip label={category.code} size='small' variant='outlined' />
									</TableCell>
									<TableCell>{category.name}</TableCell>
									<TableCell>
										{category.description
											? category.description.length > 50
												? `${category.description.substring(0, 50)}...`
												: category.description
											: '-'}
									</TableCell>
									<TableCell>
										{category.parentId
											? categories?.find(c => c.id === category.parentId)?.name || '-'
											: '-'}
									</TableCell>
									<TableCell>{category.sortOrder}</TableCell>
									<TableCell>
										<Chip
											label={category.isActive ? 'Активна' : 'Неактивна'}
											size='small'
											color={category.isActive ? 'success' : 'default'}
										/>
									</TableCell>
									<TableCell>{category.bitrixSectionId || '-'}</TableCell>
									<TableCell align='right'>
										<Tooltip title='Редактировать'>
											<IconButton
												size='small'
												onClick={() => handleEdit(category)}
											>
												<EditIcon fontSize='small' />
											</IconButton>
										</Tooltip>
										<Tooltip title='Удалить'>
											<IconButton
												size='small'
												color='error'
												onClick={() => handleDelete(category)}
												disabled={deleteCategory.isPending}
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

			{/* Form Dialog */}
			<Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth='sm' fullWidth>
				<DialogTitle>
					{editingCategory ? 'Редактирование категории' : 'Новая категория'}
				</DialogTitle>

				<form onSubmit={handleSubmit(onSubmit)}>
					<DialogContent>
						<Grid container spacing={2}>
							<Grid size={{ xs: 12, sm: 4 }}>
								<Controller
									name='code'
									control={control}
									rules={{ required: 'Код обязателен' }}
									render={({ field }) => (
										<TextField
											{...field}
											label='Код*'
											fullWidth
											error={!!errors.code}
											helperText={errors.code?.message}
											placeholder='BETON'
										/>
									)}
								/>
							</Grid>

							<Grid size={{ xs: 12, sm: 8 }}>
								<Controller
									name='name'
									control={control}
									rules={{ required: 'Название обязательно' }}
									render={({ field }) => (
										<TextField
											{...field}
											label='Название*'
											fullWidth
											error={!!errors.name}
											helperText={errors.name?.message}
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
											label='Описание'
											fullWidth
											multiline
											rows={2}
										/>
									)}
								/>
							</Grid>

							<Grid size={{ xs: 12, sm: 6 }}>
								<Controller
									name='parentId'
									control={control}
									render={({ field }) => (
										<FormControl fullWidth>
											<InputLabel>Родительская категория</InputLabel>
											<Select {...field} label='Родительская категория'>
												<MenuItem value=''>Нет (корневая)</MenuItem>
												{categories
													?.filter(c => c.id !== editingCategory?.id)
													.map(cat => (
														<MenuItem key={cat.id} value={cat.id}>
															{cat.name}
														</MenuItem>
													))}
											</Select>
										</FormControl>
									)}
								/>
							</Grid>

							<Grid size={{ xs: 12, sm: 6 }}>
								<Controller
									name='sortOrder'
									control={control}
									render={({ field: { onChange, value, ...rest } }) => (
										<TextField
											{...rest}
											value={value}
											onChange={e => onChange(parseInt(e.target.value, 10) || 0)}
											label='Порядок сортировки'
											type='number'
											fullWidth
											inputProps={{ min: 0 }}
										/>
									)}
								/>
							</Grid>

							<Grid size={12}>
								<Controller
									name='isActive'
									control={control}
									render={({ field: { value, onChange, ...rest } }) => (
										<FormControlLabel
											control={
												<Switch
													{...rest}
													checked={value}
													onChange={e => onChange(e.target.checked)}
												/>
											}
											label='Активна'
										/>
									)}
								/>
							</Grid>
						</Grid>
					</DialogContent>

					<DialogActions>
						<Button onClick={() => setFormOpen(false)}>Отмена</Button>
						<Button
							type='submit'
							variant='contained'
							disabled={isSubmitting}
						>
							{isSubmitting ? (
								<CircularProgress size={20} />
							) : editingCategory ? (
								'Сохранить'
							) : (
								'Создать'
							)}
						</Button>
					</DialogActions>
				</form>
			</Dialog>
		</Box>
	)
}
