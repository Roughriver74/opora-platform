import {
	TextField,
	Box,
	Typography,
	Button,
	IconButton,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { useCallback, useEffect, memo, useState } from 'react'

// Типы для множественных полей в соответствии с API Bitrix24
export interface BitrixMultiFieldItem {
	ID?: string
	VALUE: string
	VALUE_TYPE: string
	TYPE_ID: 'EMAIL' | 'PHONE'
}

// Функция для подготовки данных перед отправкой в Bitrix24
// Экспортируем её, чтобы использовать в ClinicEditPage
export const prepareDataForBitrix = (data: BitrixMultiFieldItem[]): any[] => {
	if (!Array.isArray(data)) {
		console.warn('prepareDataForBitrix: data не является массивом', data)
		return []
	}

	// Создаем массив для результата
	const result: any[] = []

	// Обрабатываем каждый элемент данных
	data.forEach(item => {
		// Проверяем, является ли ID временным
		const isTemporaryId = item.ID && item.ID.toString().startsWith('new_')

		// Если значение пустое, но есть реальный ID, это значит что мы хотим удалить это значение
		if (!item.VALUE || item.VALUE.trim() === '') {
			// Если есть реальный ID, добавляем с пустым VALUE для удаления в Bitrix24
			if (item.ID && !isTemporaryId) {

				result.push({
					ID: item.ID,
					VALUE: '', // Пустое значение для удаления в Bitrix24
					VALUE_TYPE: item.VALUE_TYPE || 'WORK',
					TYPE_ID: item.TYPE_ID,
				})
			} else {

			}
			return
		}

		// Для непустых значений создаем объект в формате, ожидаемом Bitrix24
		const formattedItem = {
			...(!isTemporaryId && item.ID ? { ID: item.ID } : {}),
			VALUE: item.VALUE,
			VALUE_TYPE: item.VALUE_TYPE || 'WORK',
			TYPE_ID: item.TYPE_ID,
		}



		result.push(formattedItem)
	})


	return result
}

interface MultiFieldDisplayProps {
	fieldName: string
	displayName: string
	values: BitrixMultiFieldItem[] | any[]
	onChange: (fieldName: string, values: BitrixMultiFieldItem[]) => void
	typeId?: 'EMAIL' | 'PHONE'
	icon?: React.ReactNode
}

/**
 * Компонент для отображения и редактирования множественных полей (EMAIL, PHONE)
 * в соответствии с API Bitrix24
 */
const MultiFieldDisplayComponent: React.FC<MultiFieldDisplayProps> = ({
	fieldName,
	displayName,
	values = [],
	onChange,
	typeId = 'EMAIL',
	icon,
}) => {
	// Преобразуем входные данные в формат Bitrix24
	const normalizeItems = useCallback(
		(inputValues: any[]): BitrixMultiFieldItem[] => {
			try {
				if (!Array.isArray(inputValues)) {
					console.warn(
						`[MultiFieldDisplay] ${fieldName} (${typeId}): inputValues не является массивом`,
						inputValues
					)
					return []
				}

				// Если массив пустой, вернуть пустой массив
				if (inputValues.length === 0) {
					console.log(
						`[MultiFieldDisplay] ${fieldName} (${typeId}): Пустой массив входных данных`
					)
					return []
				}

				// Проверяем формат данных из Bitrix24
				const result = inputValues.map((item, index) => {
					//console.log(`[MultiFieldDisplay] ${fieldName} (${typeId}): Обрабатываем элемент ${index}:`, item);

					// Если это не объект, преобразуем в строку
					if (typeof item !== 'object' || item === null) {
						const newItem: BitrixMultiFieldItem = {
							ID: `new_${Date.now()}_${Math.random()
								.toString(36)
								.substr(2, 9)}`,
							VALUE: String(item || ''),
							VALUE_TYPE: 'WORK',
							TYPE_ID: typeId,
						}
						//  console.log(`[MultiFieldDisplay] ${fieldName} (${typeId}): Преобразован не-объект:`, item, '→', newItem);
						return newItem
					}

					// Проверяем разные форматы Bitrix24

					// Формат 1: С полями ID, VALUE, TYPE (EMAIL часто приходит в этом формате)
					if ('VALUE' in item && 'TYPE' in item && !('VALUE_TYPE' in item)) {
						const newItem: BitrixMultiFieldItem = {
							ID: item.ID,
							VALUE: item.VALUE || '',
							VALUE_TYPE: item.TYPE || 'WORK', // Используем TYPE вместо VALUE_TYPE
							TYPE_ID: typeId,
						}
						//  console.log(`[MultiFieldDisplay] ${fieldName} (${typeId}): Преобразован формат 1:`, item, '→', newItem);
						return newItem
					}

					// Формат 2: С полями ID, VALUE, VALUE_TYPE (PHONE часто приходит в этом формате)
					if ('VALUE' in item && 'VALUE_TYPE' in item) {
						const newItem: BitrixMultiFieldItem = {
							ID: item.ID,
							VALUE: item.VALUE || '',
							VALUE_TYPE: item.VALUE_TYPE || 'WORK',
							TYPE_ID: item.TYPE_ID || typeId,
						}
						//  console.log(`[MultiFieldDisplay] ${fieldName} (${typeId}): Преобразован формат 2:`, item, '→', newItem);
						return newItem
					}

					// Формат 3: Если есть только VALUE
					if ('VALUE' in item) {
						const newItem: BitrixMultiFieldItem = {
							ID:
								item.ID ||
								`new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
							VALUE: item.VALUE || '',
							VALUE_TYPE: 'WORK',
							TYPE_ID: typeId,
						}
						//  console.log(`[MultiFieldDisplay] ${fieldName} (${typeId}): Преобразован формат 3:`, item, '→', newItem);
						return newItem
					}

					// Если ни один формат не подошел, создаем новый элемент
					const newItem: BitrixMultiFieldItem = {
						ID: `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
						VALUE: typeof item === 'string' ? item : '',
						VALUE_TYPE: 'WORK',
						TYPE_ID: typeId,
					}
					//console.log(`[MultiFieldDisplay] ${fieldName} (${typeId}): Создан новый элемент по умолчанию:`, newItem);
					return newItem
				})

				//console.log(`[MultiFieldDisplay] ${fieldName} (${typeId}): Результат нормализации:`, result);
				return result
			} catch (error) {
				console.error(
					`[MultiFieldDisplay] ${fieldName} (${typeId}): Ошибка при нормализации элементов:`,
					error
				)
				return []
			}
		},
		[fieldName, typeId]
	)

	// Проверяем, что значения - это массив и нормализуем их
	// console.log(`[MultiFieldDisplay] ${fieldName} (${typeId}): Получены значения:`, values);

	// Используем состояние для хранения нормализованных элементов
	const [items, setItems] = useState<BitrixMultiFieldItem[]>([])

	// Обновляем состояние при изменении пропсов
	useEffect(() => {
		//  console.log(`[MultiFieldDisplay] ${fieldName} (${typeId}): Получены новые пропсы values:`, values);

		// Проверяем, что values является массивом
		if (!Array.isArray(values)) {
			// console.warn(`[MultiFieldDisplay] ${fieldName} (${typeId}): values не является массивом:`, values);
			setItems([])
			// Вызываем onChange с пустым массивом, чтобы обновить родительский компонент
			onChange(fieldName, [])
			return
		}

		// Если массив пустой, устанавливаем пустой массив и выходим
		if (values.length === 0) {
			// console.log(`[MultiFieldDisplay] ${fieldName} (${typeId}): Пустой массив значений`);
			setItems([])
			return
		}

		const normalizedItems = normalizeItems(values)
		//console.log(`[MultiFieldDisplay] ${fieldName} (${typeId}): Обновлены элементы:`, normalizedItems);

		// Устанавливаем новые элементы без проверки изменений
		// Удалили проверку itemsChanged, так как она может приводить к циклическим обновлениям
		setItems(normalizedItems)
	}, [values, fieldName, typeId, normalizeItems, onChange])

	// Добавление нового элемента
	const handleAddItem = useCallback(() => {
		//console.log(`[MultiFieldDisplay] ${fieldName} (${typeId}): Начало добавления нового элемента, текущие элементы:`, items);

		try {
			// Для локального отслеживания используем временный ID с префиксом new_
			// Этот ID не будет отправлен в Bitrix24, но нужен для отслеживания в UI
			const newItemId = `new_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`
			console.log(
				`[MultiFieldDisplay] ${fieldName} (${typeId}): Создан новый ID:`,
				newItemId
			)

			const newItem: BitrixMultiFieldItem = {
				ID: newItemId,
				VALUE: '',
				VALUE_TYPE: 'WORK',
				TYPE_ID: typeId,
			}

			// Создаем новый массив, чтобы не изменять существующий
			const currentItems = Array.isArray(items) ? [...items] : []
			const newItems = [...currentItems, newItem]

			// console.log(
			// 	`[MultiFieldDisplay] ${fieldName} (${typeId}): Добавлен новый элемент:`,
			// 	newItem
			// )
			// console.log(
			// 	`[MultiFieldDisplay] ${fieldName} (${typeId}): Новый массив элементов:`,
			// 	newItems
			// )

			// Сначала обновляем локальное состояние
			setItems(newItems)

			// Затем вызываем функцию обратного вызова
			// console.log(
			// 	`[MultiFieldDisplay] ${fieldName} (${typeId}): Вызываем onChange с новыми элементами`
			// )
			onChange(fieldName, newItems)
		} catch (error) {
			// console.error(
			// 	`[MultiFieldDisplay] ${fieldName} (${typeId}): Ошибка при добавлении элемента:`,
			// 	error
			// )
		}
	}, [fieldName, items, onChange, typeId])

	// Удаление элемента
	const handleRemoveItem = useCallback(
		(index: number) => {
			// console.log(
			// 	`[MultiFieldDisplay] ${fieldName} (${typeId}): Начало удаления элемента с индексом ${index}`
			// )
			// console.log(
			// 	`[MultiFieldDisplay] ${fieldName} (${typeId}): Текущие элементы перед удалением:`,
			// 	items
			// )

			try {
				if (index < 0 || index >= items.length) {
					console.error(
						`[MultiFieldDisplay] ${fieldName} (${typeId}): Неверный индекс ${index} для удаления, длина массива: ${items.length}`
					)
					return
				}

				const itemToRemove = items[index]
				// console.log(
				// 	`[MultiFieldDisplay] ${fieldName} (${typeId}): Удаляемый элемент:`,
				// 	itemToRemove
				// )

				// Создаем копию массива, чтобы не изменять оригинал
				const currentItems = Array.isArray(items) ? [...items] : []

				// Проверяем, есть ли у элемента реальный ID из Bitrix24
				const hasRealId =
					itemToRemove.ID && !itemToRemove.ID.toString().startsWith('new_')

				let newItems

				if (hasRealId) {
					// Если это элемент с реальным ID из Bitrix24, мы не удаляем его полностью,
					// а устанавливаем пустое значение VALUE, чтобы Bitrix24 API удалил его
					// console.log(
					// 	`[MultiFieldDisplay] ${fieldName} (${typeId}): Элемент имеет реальный ID: ${itemToRemove.ID}, устанавливаем пустое значение`
					// )

					// Создаем новый массив, где заменяем элемент с указанным индексом на версию с пустым VALUE
					newItems = currentItems.map((item, i) => {
						if (i === index) {
							return {
								...item,
								VALUE: '', // Устанавливаем пустое значение для удаления в Bitrix24
							}
						}
						return item
					})
				} else {
					// Если это элемент с временным ID или без ID, просто удаляем его из массива
					// console.log(
					// 	`[MultiFieldDisplay] ${fieldName} (${typeId}): Элемент имеет временный ID или без ID, удаляем полностью`
					// )
					newItems = currentItems.filter((_, i) => i !== index)
				}

				// console.log(
				// 	`[MultiFieldDisplay] ${fieldName} (${typeId}): После удаления элемента, новый массив:`,
				// 	newItems
				// )

				// Сначала обновляем локальное состояние
				setItems(newItems)

				// Затем вызываем функцию обратного вызова
				// console.log(
				// 	`[MultiFieldDisplay] ${fieldName} (${typeId}): Вызываем onChange с новыми элементами после удаления`
				// )
				onChange(fieldName, newItems)
			} catch (error) {
				// console.error(
				// 	`[MultiFieldDisplay] ${fieldName} (${typeId}): Ошибка при удалении элемента:`,
				// 	error
				// )
			}
		},
		[fieldName, items, onChange, typeId]
	)

	// Обновление значения элемента
	const handleUpdateValue = useCallback(
		(index: number, value: string) => {
			// console.log(
			// 	`[MultiFieldDisplay] ${fieldName} (${typeId}): Начало обновления значения элемента ${index}:`,
			// 	value
			// )

			try {
				if (index < 0 || index >= items.length) {
					console.error(
						`[MultiFieldDisplay] ${fieldName} (${typeId}): Неверный индекс ${index} для обновления значения, длина массива: ${items.length}`
					)
					return
				}

				// Создаем копию массива, чтобы не изменять оригинал
				const newItems = [...items]

				// Создаем копию элемента, чтобы не изменять оригинал
				newItems[index] = {
					...newItems[index],
					VALUE: value,
				}

				// console.log(
				// 	`[MultiFieldDisplay] ${fieldName} (${typeId}): Обновлено значение элемента ${index}:`,
				// 	newItems[index]
				// )

				// Сначала обновляем локальное состояние
				setItems(newItems)

				// Затем вызываем функцию обратного вызова
				// console.log(
				// 	`[MultiFieldDisplay] ${fieldName} (${typeId}): Вызываем onChange с обновленными элементами`
				// )
				onChange(fieldName, newItems)
			} catch (error) {
				console.error(
					`[MultiFieldDisplay] ${fieldName} (${typeId}): Ошибка при обновлении значения элемента:`,
					error
				)
			}
		},
		[fieldName, items, onChange, typeId]
	)

	// Обновление типа значения (WORK, HOME, MOBILE, и т.д.)
	const handleUpdateValueType = useCallback(
		(index: number, valueType: string) => {
			// console.log(
			// 	`[MultiFieldDisplay] ${fieldName} (${typeId}): Начало обновления типа значения элемента ${index}:`,
			// 	valueType
			// )

			try {
				if (index < 0 || index >= items.length) {
					console.error(
						`[MultiFieldDisplay] ${fieldName} (${typeId}): Неверный индекс ${index} для обновления типа значения, длина массива: ${items.length}`
					)
					return
				}

				// Создаем копию массива, чтобы не изменять оригинал
				const newItems = [...items]

				// Создаем копию элемента, чтобы не изменять оригинал
				newItems[index] = {
					...newItems[index],
					VALUE_TYPE: valueType,
				}

				// console.log(
				// 	`[MultiFieldDisplay] ${fieldName} (${typeId}): Обновлен тип значения элемента ${index}:`,
				// 	newItems[index]
				// )

				// Сначала обновляем локальное состояние
				setItems(newItems)

				// Затем вызываем функцию обратного вызова

				onChange(fieldName, newItems)
			} catch (error) {
				console.error(
					`[MultiFieldDisplay] ${fieldName} (${typeId}): Ошибка при обновлении типа значения элемента:`,
					error
				)
			}
		},
		[fieldName, items, onChange, typeId]
	)

	// Используем экспортированную функцию prepareDataForBitrix для отправки данных в Bitrix24

	// Инициализация пустого массива при первой загрузке
	useEffect(() => {
		if (!values || !Array.isArray(values)) {
			onChange(fieldName, [])
		}
	}, [fieldName, values, onChange])

	// Получение вариантов типов для полей
	const getValueTypeOptions = (type: 'EMAIL' | 'PHONE') => {
		if (type === 'EMAIL') {
			return [
				{ value: 'WORK', label: 'Рабочий' },
				{ value: 'HOME', label: 'Домашний' },
				{ value: 'OTHER', label: 'Другой' },
			]
		} else if (type === 'PHONE') {
			return [
				{ value: 'WORK', label: 'Рабочий' },
				{ value: 'MOBILE', label: 'Мобильный' },
				{ value: 'HOME', label: 'Домашний' },
				{ value: 'FAX', label: 'Факс' },
				{ value: 'OTHER', label: 'Другой' },
			]
		}
		return []
	}

	const valueTypeOptions = getValueTypeOptions(typeId)

	return (
		<Box sx={{ mb: 2 }}>
			<Typography variant='subtitle2'>{displayName}</Typography>

			{items.length === 0 ? (
				<Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
					Нет данных
				</Typography>
			) : (
				items.map((item: BitrixMultiFieldItem, index: number) => (
					<Box
						key={item.ID || `item-${index}`}
						sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}
					>
						<FormControl size='small' sx={{ minWidth: 120 }}>
							<InputLabel id={`value-type-label-${index}`}>Тип</InputLabel>
							<Select
								labelId={`value-type-label-${index}`}
								value={item.VALUE_TYPE || 'WORK'}
								label='Тип'
								onChange={e => handleUpdateValueType(index, e.target.value)}
							>
								{valueTypeOptions.map(option => (
									<MenuItem key={option.value} value={option.value}>
										{option.label}
									</MenuItem>
								))}
							</Select>
						</FormControl>

						<TextField
							fullWidth
							size='small'
							label={typeId === 'EMAIL' ? 'Email' : 'Телефон'}
							value={item.VALUE || ''}
							onChange={e => handleUpdateValue(index, e.target.value)}
							InputProps={{
								startAdornment: icon,
							}}
						/>

						<IconButton color='error' onClick={() => handleRemoveItem(index)}>
							<DeleteIcon />
						</IconButton>
					</Box>
				))
			)}

			<Button
				variant='outlined'
				size='small'
				onClick={handleAddItem}
				sx={{ mt: 1 }}
			>
				Добавить {typeId === 'EMAIL' ? 'email' : 'телефон'}
			</Button>
		</Box>
	)
}

// Мемоизируем компонент для предотвращения лишних перерисовок
export const MultiFieldDisplay = memo(MultiFieldDisplayComponent)
