import React, { useEffect } from 'react'
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	Grid,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	FormControlLabel,
	Switch,
	Alert,
	CircularProgress,
	Box,
	Chip,
	Autocomplete,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import {
	useNomenclatureById,
	useCreateNomenclature,
	useUpdateNomenclature,
	useCategories,
	useUnits,
} from '../hooks/useNomenclature'
import {
	NomenclatureType,
	CreateNomenclatureDto,
	UpdateNomenclatureDto,
} from '../../../../services/nomenclatureService'

interface NomenclatureFormProps {
	open: boolean
	onClose: () => void
	editingId?: string
}

const typeOptions = [
	{ value: NomenclatureType.PRODUCT, label: 'Товар' },
	{ value: NomenclatureType.SERVICE, label: 'Услуга' },
	{ value: NomenclatureType.MATERIAL, label: 'Материал' },
]

export const NomenclatureForm: React.FC<NomenclatureFormProps> = ({
	open,
	onClose,
	editingId,
}) => {
	const isEditing = !!editingId

	const { data: nomenclature, isLoading: loadingNomenclature } = useNomenclatureById(editingId)
	const { data: categories, isLoading: loadingCategories } = useCategories()
	const { data: units, isLoading: loadingUnits } = useUnits()

	const createMutation = useCreateNomenclature()
	const updateMutation = useUpdateNomenclature()

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<CreateNomenclatureDto & { tags: string[] }>({
		defaultValues: {
			sku: '',
			name: '',
			description: '',
			type: NomenclatureType.PRODUCT,
			categoryId: '',
			unitId: '',
			price: undefined,
			currency: 'RUB',
			bitrixProductId: '',
			tags: [],
			isActive: true,
		},
	})

	// Reset form when editing item is loaded
	useEffect(() => {
		if (nomenclature) {
			reset({
				sku: nomenclature.sku,
				name: nomenclature.name,
				description: nomenclature.description || '',
				type: nomenclature.type,
				categoryId: nomenclature.categoryId || '',
				unitId: nomenclature.unitId,
				price: nomenclature.price || undefined,
				currency: nomenclature.currency || 'RUB',
				bitrixProductId: nomenclature.bitrixProductId || '',
				tags: nomenclature.tags || [],
				isActive: nomenclature.isActive,
			})
		}
	}, [nomenclature, reset])

	// Reset form when dialog closes
	useEffect(() => {
		if (!open) {
			reset({
				sku: '',
				name: '',
				description: '',
				type: NomenclatureType.PRODUCT,
				categoryId: '',
				unitId: '',
				price: undefined,
				currency: 'RUB',
				bitrixProductId: '',
				tags: [],
				isActive: true,
			})
		}
	}, [open, reset])

	const onSubmit = async (data: CreateNomenclatureDto & { tags: string[] }) => {
		try {
			// Clean up empty strings
			const cleanData = {
				...data,
				categoryId: data.categoryId || undefined,
				bitrixProductId: data.bitrixProductId || undefined,
				description: data.description || undefined,
				price: data.price || undefined,
			}

			if (isEditing) {
				await updateMutation.mutateAsync({
					id: editingId,
					data: cleanData as UpdateNomenclatureDto,
				})
			} else {
				await createMutation.mutateAsync(cleanData)
			}
			onClose()
		} catch (err) {
			console.error('Save error:', err)
		}
	}

	const mutationError = createMutation.error || updateMutation.error
	const isLoading = loadingNomenclature || loadingCategories || loadingUnits

	return (
		<Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
			<DialogTitle>
				{isEditing ? 'Редактирование номенклатуры' : 'Новая номенклатура'}
			</DialogTitle>

			<form onSubmit={handleSubmit(onSubmit)}>
				<DialogContent>
					{isLoading ? (
						<Box display='flex' justifyContent='center' py={4}>
							<CircularProgress />
						</Box>
					) : (
						<>
							{mutationError && (
								<Alert severity='error' sx={{ mb: 2 }}>
									{(mutationError as Error).message}
								</Alert>
							)}

							<Grid container spacing={2}>
								<Grid size={{ xs: 12, sm: 4 }}>
									<Controller
										name='sku'
										control={control}
										rules={{ required: 'Артикул обязателен' }}
										render={({ field }) => (
											<TextField
												{...field}
												label='Артикул (SKU)*'
												fullWidth
												error={!!errors.sku}
												helperText={errors.sku?.message}
											/>
										)}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 8 }}>
									<Controller
										name='name'
										control={control}
										rules={{ required: 'Наименование обязательно' }}
										render={({ field }) => (
											<TextField
												{...field}
												label='Наименование*'
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

								<Grid size={{ xs: 12, sm: 4 }}>
									<Controller
										name='type'
										control={control}
										render={({ field }) => (
											<FormControl fullWidth>
												<InputLabel>Тип</InputLabel>
												<Select {...field} label='Тип'>
													{typeOptions.map(opt => (
														<MenuItem key={opt.value} value={opt.value}>
															{opt.label}
														</MenuItem>
													))}
												</Select>
											</FormControl>
										)}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 4 }}>
									<Controller
										name='categoryId'
										control={control}
										render={({ field }) => (
											<FormControl fullWidth>
												<InputLabel>Категория</InputLabel>
												<Select {...field} label='Категория'>
													<MenuItem value=''>Без категории</MenuItem>
													{categories?.map(cat => (
														<MenuItem key={cat.id} value={cat.id}>
															{cat.name}
														</MenuItem>
													))}
												</Select>
											</FormControl>
										)}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 4 }}>
									<Controller
										name='unitId'
										control={control}
										rules={{ required: 'Единица измерения обязательна' }}
										render={({ field }) => (
											<FormControl fullWidth error={!!errors.unitId}>
												<InputLabel>Ед. измерения*</InputLabel>
												<Select {...field} label='Ед. измерения*'>
													{units?.map(unit => (
														<MenuItem key={unit.id} value={unit.id}>
															{unit.name} ({unit.shortName})
														</MenuItem>
													))}
												</Select>
											</FormControl>
										)}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 4 }}>
									<Controller
										name='price'
										control={control}
										render={({ field: { onChange, value, ...rest } }) => (
											<TextField
												{...rest}
												value={value || ''}
												onChange={e => {
													const val = e.target.value
													onChange(val ? parseFloat(val) : undefined)
												}}
												label='Цена'
												type='number'
												fullWidth
												inputProps={{ min: 0, step: 0.01 }}
											/>
										)}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 4 }}>
									<Controller
										name='currency'
										control={control}
										render={({ field }) => (
											<FormControl fullWidth>
												<InputLabel>Валюта</InputLabel>
												<Select {...field} label='Валюта'>
													<MenuItem value='RUB'>RUB</MenuItem>
													<MenuItem value='USD'>USD</MenuItem>
													<MenuItem value='EUR'>EUR</MenuItem>
												</Select>
											</FormControl>
										)}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 4 }}>
									<Controller
										name='bitrixProductId'
										control={control}
										render={({ field }) => (
											<TextField
												{...field}
												label='Bitrix24 ID'
												fullWidth
												placeholder='ID товара в Bitrix24'
											/>
										)}
									/>
								</Grid>

								<Grid size={12}>
									<Controller
										name='tags'
										control={control}
										render={({ field: { onChange, value } }) => (
											<Autocomplete
												multiple
												freeSolo
												options={[]}
												value={value || []}
												onChange={(_, newValue) => onChange(newValue)}
												renderTags={(tagValue, getTagProps) =>
													tagValue.map((option, index) => (
														<Chip
															{...getTagProps({ index })}
															key={option}
															label={option}
															size='small'
														/>
													))
												}
												renderInput={params => (
													<TextField
														{...params}
														label='Теги'
														placeholder='Введите тег и нажмите Enter'
													/>
												)}
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
												label='Активен'
											/>
										)}
									/>
								</Grid>
							</Grid>
						</>
					)}
				</DialogContent>

				<DialogActions>
					<Button onClick={onClose}>Отмена</Button>
					<Button
						type='submit'
						variant='contained'
						disabled={isSubmitting || isLoading}
					>
						{isSubmitting ? <CircularProgress size={20} /> : isEditing ? 'Сохранить' : 'Создать'}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	)
}
