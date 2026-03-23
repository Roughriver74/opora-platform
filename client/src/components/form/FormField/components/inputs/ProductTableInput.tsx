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
	TextField,
	Autocomplete,
	Typography,
	Card,
	CardContent,
	Stack,
	useTheme,
	useMediaQuery,
	CircularProgress,
	Chip,
	InputAdornment,
} from '@mui/material'
import { Add, Delete, RemoveCircleOutline, AddCircleOutline, ShoppingCart } from '@mui/icons-material'
import { FieldInputProps } from '../../types'
import { nomenclatureService } from '../../../../../services/nomenclatureService'

export interface OrderItem {
	nomenclatureId: string
	name: string
	sku: string
	quantity: number
	unit: string
	price: number
	discount: number
	total: number
}

interface NomenclatureOption {
	id: string
	label: string
	sku: string
	price: number
	unit: string
}

const calcTotal = (qty: number, price: number, discount: number) => {
	const disc = Math.min(Math.max(discount || 0, 0), 100)
	return qty * price * (1 - disc / 100)
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
					discount: 0,
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
				const item = newItems[index]
				newItems[index] = {
					...item,
					quantity,
					total: calcTotal(quantity, item.price, item.discount),
				}
				updateItems(newItems)
			},
			[items, updateItems]
		)

		const handleQuantityStep = useCallback(
			(index: number, step: number) => {
				const newItems = [...items]
				const item = newItems[index]
				const quantity = Math.max(0, item.quantity + step)
				newItems[index] = {
					...item,
					quantity,
					total: calcTotal(quantity, item.price, item.discount),
				}
				updateItems(newItems)
			},
			[items, updateItems]
		)

		const handlePriceChange = useCallback(
			(index: number, val: string) => {
				const price = parseFloat(val) || 0
				const newItems = [...items]
				const item = newItems[index]
				newItems[index] = {
					...item,
					price,
					total: calcTotal(item.quantity, price, item.discount),
				}
				updateItems(newItems)
			},
			[items, updateItems]
		)

		const handleDiscountChange = useCallback(
			(index: number, val: string) => {
				const discount = Math.min(Math.max(parseFloat(val) || 0, 0), 100)
				const newItems = [...items]
				const item = newItems[index]
				newItems[index] = {
					...item,
					discount,
					total: calcTotal(item.quantity, item.price, discount),
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

		const searchAutocomplete = (
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
				renderOption={(props, option) => (
					<li {...props} key={option.id}>
						<Stack direction="row" justifyContent="space-between" width="100%" alignItems="center">
							<Box>
								<Typography variant="body2">{option.label}</Typography>
								<Typography variant="caption" color="text.secondary">
									{option.sku} · {option.unit}
								</Typography>
							</Box>
							<Typography variant="body2" sx={{ fontWeight: 600, ml: 2, whiteSpace: 'nowrap' }}>
								{formatPrice(option.price)} ₽
							</Typography>
						</Stack>
					</li>
				)}
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
		)

		// Пустое состояние
		const emptyState = (
			<Box sx={{ py: 4, textAlign: 'center' }}>
				<ShoppingCart sx={{ fontSize: 48, color: 'action.disabled', mb: 1 }} />
				<Typography variant="body2" color="text.secondary">
					Нет добавленных товаров
				</Typography>
				<Typography variant="caption" color="text.secondary">
					Используйте поиск ниже, чтобы добавить товары в заказ
				</Typography>
			</Box>
		)

		// Итоговая строка
		const grandTotalDisplay = items.length > 0 && (
			<Paper
				variant="outlined"
				sx={{
					mt: 1,
					p: 1.5,
					bgcolor: theme.palette.primary.main + '0A',
					borderColor: theme.palette.primary.main + '30',
				}}
			>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Stack direction="row" spacing={1} alignItems="center">
						<Chip
							label={`${items.length} ${items.length === 1 ? 'позиция' : items.length < 5 ? 'позиции' : 'позиций'}`}
							size="small"
							variant="outlined"
						/>
					</Stack>
					<Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
						Итого: {formatPrice(grandTotal)} ₽
					</Typography>
				</Stack>
			</Paper>
		)

		// --- Мобильная версия — карточки ---
		if (isSmall) {
			return (
				<Box>
					<Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
						{field.label}
						{field.required && ' *'}
					</Typography>

					{items.length === 0 ? emptyState : items.map((item, index) => (
						<Card key={item.nomenclatureId} variant="outlined" sx={{ mb: 1 }}>
							<CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
								<Stack direction="row" justifyContent="space-between" alignItems="flex-start">
									<Box sx={{ flex: 1 }}>
										<Typography variant="body2" sx={{ fontWeight: 500 }}>
											{index + 1}. {item.name}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											{item.sku} · {item.unit}
										</Typography>
									</Box>
									<IconButton size="small" onClick={() => handleRemoveItem(index)} color="error">
										<Delete fontSize="small" />
									</IconButton>
								</Stack>

								<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
									<IconButton size="small" onClick={() => handleQuantityStep(index, -1)} disabled={item.quantity <= 0}>
										<RemoveCircleOutline fontSize="small" />
									</IconButton>
									<TextField
										size="small"
										type="number"
										value={item.quantity || ''}
										onChange={e => handleQuantityChange(index, e.target.value)}
										sx={{ width: 70 }}
										inputProps={{ min: 0, step: 'any', style: { textAlign: 'center' } }}
									/>
									<IconButton size="small" onClick={() => handleQuantityStep(index, 1)}>
										<AddCircleOutline fontSize="small" />
									</IconButton>
								</Stack>

								<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
									<TextField
										size="small"
										type="number"
										label="Цена"
										value={item.price || ''}
										onChange={e => handlePriceChange(index, e.target.value)}
										sx={{ width: 100 }}
										InputProps={{ endAdornment: <InputAdornment position="end">₽</InputAdornment> }}
										inputProps={{ min: 0, step: 'any' }}
									/>
									{item.discount > 0 && (
										<Chip label={`-${item.discount}%`} size="small" color="warning" />
									)}
									<Typography variant="body2" sx={{ fontWeight: 600, ml: 'auto' }}>
										{formatPrice(item.total)} ₽
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					))}

					{searchAutocomplete}
					{grandTotalDisplay}

					{error && (
						<Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
							{error}
						</Typography>
					)}
				</Box>
			)
		}

		// --- Десктопная версия — таблица ---
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
								<TableCell sx={{ fontWeight: 600, width: 40 }}>#</TableCell>
								<TableCell sx={{ fontWeight: 600 }}>Товар</TableCell>
								<TableCell sx={{ fontWeight: 600, width: 80 }}>Артикул</TableCell>
								<TableCell sx={{ fontWeight: 600, width: 140 }} align="center">Кол-во</TableCell>
								<TableCell sx={{ fontWeight: 600, width: 60 }}>Ед.</TableCell>
								<TableCell sx={{ fontWeight: 600, width: 120 }} align="right">Цена, ₽</TableCell>
								<TableCell sx={{ fontWeight: 600, width: 80 }} align="right">Скидка</TableCell>
								<TableCell sx={{ fontWeight: 600, width: 120 }} align="right">Сумма, ₽</TableCell>
								<TableCell sx={{ width: 48 }} />
							</TableRow>
						</TableHead>
						<TableBody>
							{items.length === 0 ? (
								<TableRow>
									<TableCell colSpan={9}>
										{emptyState}
									</TableCell>
								</TableRow>
							) : items.map((item, index) => (
								<TableRow key={item.nomenclatureId} hover>
									<TableCell sx={{ color: 'text.secondary' }}>{index + 1}</TableCell>
									<TableCell>
										<Typography variant="body2" sx={{ fontWeight: 500 }}>
											{item.name}
										</Typography>
									</TableCell>
									<TableCell>
										<Typography variant="caption" color="text.secondary">
											{item.sku}
										</Typography>
									</TableCell>
									<TableCell align="center">
										<Stack direction="row" alignItems="center" justifyContent="center" spacing={0}>
											<IconButton
												size="small"
												onClick={() => handleQuantityStep(index, -1)}
												disabled={item.quantity <= 0}
												sx={{ p: 0.25 }}
											>
												<RemoveCircleOutline fontSize="small" />
											</IconButton>
											<TextField
												size="small"
												type="number"
												value={item.quantity || ''}
												onChange={e => handleQuantityChange(index, e.target.value)}
												sx={{ width: 70, mx: 0.5 }}
												inputProps={{ min: 0, step: 'any', style: { textAlign: 'center' } }}
											/>
											<IconButton
												size="small"
												onClick={() => handleQuantityStep(index, 1)}
												sx={{ p: 0.25 }}
											>
												<AddCircleOutline fontSize="small" />
											</IconButton>
										</Stack>
									</TableCell>
									<TableCell>{item.unit}</TableCell>
									<TableCell align="right">
										<TextField
											size="small"
											type="number"
											value={item.price || ''}
											onChange={e => handlePriceChange(index, e.target.value)}
											sx={{ width: 100 }}
											inputProps={{ min: 0, step: 'any', style: { textAlign: 'right' } }}
										/>
									</TableCell>
									<TableCell align="right">
										<TextField
											size="small"
											type="number"
											value={item.discount || ''}
											onChange={e => handleDiscountChange(index, e.target.value)}
											sx={{ width: 70 }}
											inputProps={{ min: 0, max: 100, step: 1, style: { textAlign: 'right' } }}
											InputProps={{
												endAdornment: <InputAdornment position="end">%</InputAdornment>,
											}}
										/>
									</TableCell>
									<TableCell align="right">
										<Typography variant="body2" sx={{ fontWeight: 600 }}>
											{formatPrice(item.total)}
										</Typography>
									</TableCell>
									<TableCell>
										<IconButton size="small" onClick={() => handleRemoveItem(index)} color="error">
											<Delete fontSize="small" />
										</IconButton>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>

				{searchAutocomplete}
				{grandTotalDisplay}

				{error && (
					<Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
						{error}
					</Typography>
				)}
			</Box>
		)
	}
)
