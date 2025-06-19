import React, {
	useState,
	useRef,
	useEffect,
	useImperativeHandle,
	forwardRef,
} from 'react'
import {
	FormControl,
	Autocomplete,
	TextField,
	CircularProgress,
} from '@mui/material'
import { FieldInputProps } from '../../types'
import { FIELD_TEXTS } from '../../constants'

// Добавляем интерфейс для ref методов
export interface AutocompleteInputRef {
	triggerSearch: (searchValue: string) => void
}

export const AutocompleteInput = forwardRef<
	AutocompleteInputRef,
	FieldInputProps
>(
	(
		{
			field,
			value,
			onChange,
			error,
			compact = false,
			options = [],
			loading = false,
			onSearchChange,
		},
		ref
	) => {
		const [inputValue, setInputValue] = useState('')
		const isSelectingRef = useRef(false)
		const lastValueRef = useRef(value)
		const selectedOption = options.find(opt => opt.value === value) || null

		// Добавляем ref методы для программного управления
		useImperativeHandle(
			ref,
			() => ({
				triggerSearch: (searchValue: string) => {
					console.log(
						`🔍 Программный поиск для ${field.name}: "${searchValue}"`
					)
					setInputValue(searchValue)
					onSearchChange?.(searchValue)
				},
			}),
			[field.name, onSearchChange]
		)

		// Синхронизируем inputValue с выбранным значением
		useEffect(() => {
			if (selectedOption && !isSelectingRef.current) {
				setInputValue(selectedOption.label)
				console.log(
					`🔄 AutocompleteInput: Синхронизация с выбранной опцией для ${field.name}: "${selectedOption.label}"`
				)
			} else if (!value && !isSelectingRef.current) {
				setInputValue('')
			}
		}, [selectedOption, value, field.name])

		// Обработка изменения value извне (копирование)
		useEffect(() => {
			if (value !== lastValueRef.current) {
				lastValueRef.current = value

				if (value && !selectedOption && !isSelectingRef.current) {
					// Значение изменилось, но опция не найдена - показываем значение как есть
					console.log(
						`🔄 AutocompleteInput: Значение изменилось извне для ${field.name}: "${value}", но опция не найдена. Устанавливаем inputValue.`
					)
					setInputValue(String(value))

					// Инициируем поиск для загрузки опций
					if (onSearchChange) {
						setTimeout(() => {
							onSearchChange(String(value))
						}, 100)
					}
				}
			}
		}, [value, selectedOption, field.name, onSearchChange])

		// Специальная обработка для копирования - принудительное обновление
		useEffect(() => {
			if (
				value &&
				options.length > 0 &&
				selectedOption &&
				inputValue !== selectedOption.label
			) {
				console.log(
					`🔄 AutocompleteInput: Принудительная синхронизация для ${field.name}: "${selectedOption.label}"`
				)
				setInputValue(selectedOption.label)
			}
		}, [value, options, selectedOption, inputValue, field.name])

		return (
			<FormControl fullWidth margin={compact ? 'dense' : 'normal'}>
				<Autocomplete
					id={field.name}
					value={selectedOption}
					inputValue={inputValue}
					onInputChange={(_, newInputValue, reason) => {
						// Не отправляем запросы если пользователь выбирает из списка
						if (reason === 'reset' && isSelectingRef.current) {
							isSelectingRef.current = false
							return
						}

						setInputValue(newInputValue || '')

						// Отправляем запрос только при печати пользователем
						if (reason === 'input') {
							onSearchChange?.(newInputValue || '')
						}
					}}
					onChange={(_, newValue) => {
						isSelectingRef.current = true
						onChange(field.name, newValue ? newValue.value : '')

						// После выбора показываем выбранное значение
						if (newValue) {
							setInputValue(newValue.label)
						} else {
							setInputValue('')
						}

						// Сбрасываем флаг через небольшой таймаут
						setTimeout(() => {
							isSelectingRef.current = false
						}, 100)
					}}
					options={options}
					getOptionLabel={option => option?.label || ''}
					loading={loading}
					size={compact ? 'small' : 'medium'}
					renderInput={params => (
						<TextField
							{...params}
							label={field.label}
							placeholder={field.placeholder || ''}
							error={!!error}
							helperText={error}
							required={field.required}
							size={compact ? 'small' : 'medium'}
							InputProps={{
								...params.InputProps,
								endAdornment: (
									<>
										{loading ? (
											<CircularProgress color='inherit' size={20} />
										) : null}
										{params.InputProps.endAdornment}
									</>
								),
							}}
						/>
					)}
					noOptionsText={FIELD_TEXTS.NO_OPTIONS}
					loadingText={FIELD_TEXTS.LOADING}
					filterOptions={x => x}
				/>
			</FormControl>
		)
	}
)

AutocompleteInput.displayName = 'AutocompleteInput'
