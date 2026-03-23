import React, { useState, useCallback, useRef } from 'react'
import {
	Box,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	IconButton,
	Button,
	TextField,
	Autocomplete,
	Typography,
	Card,
	CardContent,
	Stack,
	useTheme,
	useMediaQuery,
	CircularProgress,
} from '@mui/material'
import { Add, Delete } from '@mui/icons-material'
import { FieldInputProps } from '../../types'
import { nomenclatureService } from '../../../../../services/nomenclatureService'

interface OrderItem {
	nomenclatureId: string
	name: string
	sku: string
	quantity: number
	unit: string
	price: number
	total: number
}

interface NomenclatureOption {
	id: string
	label: string
	sku: string
	price: number
	unit: string
}

export const ProductTableInput: React.FC<FieldInputProps> = React.memo(
	({ field, value, onChange, error, isMobile = false }) => {
		const theme = useTheme()
		const isSmall = useMediaQuery(theme.breakpoints.down('sm')) || isMobile

		const items: OrderItem[] = Array.isArray(value) ? value : []

		const [searchOptions, setSearchOptions] = useState<NomenclatureOption[]>([])
		const [searchLoading, setSearchLoading] = useState(false)
		const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

		const updateItems = useCallback(
			(newItems: OrderItem[]) => {
				onChange(field.name, newItems)
			},
			[field.name, onChange]
		)

		const handleSearch = useCallback(async (query: string) => {
			if (!query || query.length < 1) {
				setSearchOptions([])
				return
			}

			if (searchTimerRef.current) {
				clearTimeout(searchTimerRef.current)
			}

			searchTimerRef.current = setTimeout(async () => {
				setSearchLoading(true)
				try {
					const response = await nomenclatureService.search(query, 20)
					const options: NomenclatureOption[] = response.result.map(item => ({
						id: item.metadata?.localId || item.id,
						label: item.label,
						sku: item.metadata?.sku || '',
						price: item.metadata?.price || 0,
						unit: item.metadata?.unit || 'шт',
					}))
					setSearchOptions(options)
				} catch (err) {
					console.error('Ошибка поиска номенклатуры:', err)
					setSearchOptions([])
				} finally {
					setSearchLoading(false)
				}
			}, 300)
		}, [])

		const handleAddItem = useCallback(
			(option: NomenclatureOption | null) => {
				if (!option) return

				// Не добавляем дубли
				if (items.some(item => item.nomenclatureId === option.id)) return

				const newItem: OrderItem = {
					nomenclatureId: option.id,
					name: option.label,
					sku: option.sku,
					quantity: 1,
					unit: option.unit,
					price: option.price,
					total: option.price,
				}

				updateItems([...items, newItem])
				setSearchOptions([])
			},
			[items, updateItems]
		)

		const handleQuantityChange = useCallback(
			(index: number, qty: string) => {
				const quantity = parseFloat(qty) || 0
				const newItems = [...items]
				newItems[index] = {
					...newItems[index],
					quantity,
					total: quantity * newItems[index].price,
				}
				updateItems(newItems)
			},
			[items, updateItems]
		)

		const handleRemoveItem = useCallback(
			(index: number) => {
				const newItems = items.filter((_, i) => i !== index)
				updateItems(newItems)
			},
			[items, updateItems]
		)

		const grandTotal = items.reduce((sum, item) => sum + item.total, 0)

		const formatPrice = (price: number) =>
			price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

		// Мобильная версия — карточки
		if (isSmall) {
			return (
				<Box>
					<Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
						{field.label}
						{field.required && ' *'}
					</Typography>

					{items.map((item, index) => (
						<Card key={item.nomenclatureId} variant="outlined" sx={{ mb: 1 }}>
							<CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
								<Stack direction="row" justifyContent="space-between" alignItems="center">
									<Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
										{item.name}
									</Typography>
									<IconButton size="small" onClick={() => handleRemoveItem(index)} color="error">
										<Delete fontSize="small" />
									</IconButton>
								</Stack>
								<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
									<TextField
										size="small"
										type="number"
										label="Кол-во"
										value={item.quantity || ''}
										onChange={e => handleQuantityChange(index, e.target.value)}
										sx={{ width: 90 }}
										inputProps={{ min: 0, step: 'any' }}
									/>
									<Typography variant="body2" color="text.secondary">
										{item.unit}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										× {formatPrice(item.price)} ₽
									</Typography>
									<Typography variant="body2" sx={{ fontWeight: 600, ml: 'auto' }}>
										{formatPrice(item.total)} ₽
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					))}

					<Autocomplete
						size="small"
						options={searchOptions}
						getOptionLabel={option => `${option.label} (${option.sku})`}
						loading={searchLoading}
						onInputChange={(_, query) => handleSearch(query)}
						onChange={(_, option) => handleAddItem(option)}
						value={null}
						blurOnSelect
						clearOnBlur
						renderInput={params => (
							<TextField
								{...params}
								label="+ Добавить товар"
								placeholder="Поиск по названию или артикулу..."
								InputProps={{
									...params.InputProps,
									endAdornment: (
										<>
											{searchLoading && <CircularProgress size={18} />}
											{params.InputProps.endAdornment}
										</>
									),
								}}
							/>
						)}
						noOptionsText="Введите название товара"
						loadingText="Поиск..."
						sx={{ mt: 1 }}
					/>

					{items.length > 0 && (
						<Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
							<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
								Итого: {formatPrice(grandTotal)} ₽
							</Typography>
						</Stack>
					)}

					{error && (
						<Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
							{error}
						</Typography>
					)}
				</Box>
			)
		}

		// Десктопная версия — таблица
		return (
			<Box>
				<Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
					{field.label}
					{field.required && ' *'}
				</Typography>

				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead>
							<TableRow sx={{ bgcolor: 'grey.50' }}>
								<TableCell sx={{ fontWeight: 600 }}>Товар</TableCell>
								<TableCell sx={{ fontWeight: 600, width: 80 }}>Артикул</TableCell>
								<TableCell sx={{ fontWeight: 600, width: 100 }} align="right">Кол-во</TableCell>
								<TableCell sx={{ fontWeight: 600, width: 60 }}>Ед.</TableCell>
								<TableCell sx={{ fontWeight: 600, width: 100 }} align="right">Цена</TableCell>
								<TableCell sx={{ fontWeight: 600, width: 110 }} align="right">Сумма</TableCell>
								<TableCell sx={{ width: 48 }} />
							</TableRow>
						</TableHead>
						<TableBody>
							{items.map((item, index) => (
								<TableRow key={item.nomenclatureId}>
									<TableCell>{item.name}</TableCell>
									<TableCell>{item.sku}</TableCell>
									<TableCell align="right">
										<TextField
											size="small"
											type="number"
											value={item.quantity || ''}
											onChange={e => handleQuantityChange(index, e.target.value)}
											sx={{ width: 90 }}
											inputProps={{ min: 0, step: 'any' }}
										/>
									</TableCell>
									<TableCell>{item.unit}</TableCell>
									<TableCell align="right">{formatPrice(item.price)}</TableCell>
									<TableCell align="right" sx={{ fontWeight: 600 }}>
										{formatPrice(item.total)}
									</TableCell>
									<TableCell>
										<IconButton size="small" onClick={() => handleRemoveItem(index)} color="error">
											<Delete fontSize="small" />
										</IconButton>
									</TableCell>
								</TableRow>
							))}

							{items.length === 0 && (
								<TableRow>
									<TableCell colSpan={7} align="center" sx={{ py: 2, color: 'text.secondary' }}>
										Нет добавленных товаров
									</TableCell>
								</TableRow>
							)}

							{items.length > 0 && (
								<TableRow sx={{ bgcolor: 'grey.50' }}>
									<TableCell colSpan={5} align="right" sx={{ fontWeight: 700 }}>
										Итого:
									</TableCell>
									<TableCell align="right" sx={{ fontWeight: 700 }}>
										{formatPrice(grandTotal)} ₽
									</TableCell>
									<TableCell />
								</TableRow>
							)}
						</TableBody>
					</Table>
				</TableContainer>

				<Autocomplete
					size="small"
					options={searchOptions}
					getOptionLabel={option => `${option.label} (${option.sku})`}
					loading={searchLoading}
					onInputChange={(_, query) => handleSearch(query)}
					onChange={(_, option) => handleAddItem(option)}
					value={null}
					blurOnSelect
					clearOnBlur
					renderInput={params => (
						<TextField
							{...params}
							label="Добавить товар"
							placeholder="Поиск по названию или артикулу..."
							margin="dense"
							InputProps={{
								...params.InputProps,
								startAdornment: (
									<>
										<Add fontSize="small" sx={{ color: 'action.active', mr: 0.5 }} />
										{params.InputProps.startAdornment}
									</>
								),
								endAdornment: (
									<>
										{searchLoading && <CircularProgress size={18} />}
										{params.InputProps.endAdornment}
									</>
								),
							}}
						/>
					)}
					noOptionsText="Введите название товара"
					loadingText="Поиск..."
					sx={{ mt: 1 }}
				/>

				{error && (
					<Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
						{error}
					</Typography>
				)}
			</Box>
		)
	}
)
