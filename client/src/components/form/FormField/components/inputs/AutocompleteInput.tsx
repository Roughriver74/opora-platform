import React, {
	useState,
	useRef,
	useEffect,
	useImperativeHandle,
	forwardRef,
	useCallback,
} from 'react'
import {
	FormControl,
	Autocomplete,
	TextField,
	CircularProgress,
	Box,
} from '@mui/material'
import { FieldInputProps } from '../../types'
import { CopyButton } from '../CopyButton'

// Константы для текстов
const FIELD_TEXTS = {
	NO_OPTIONS: 'Нет вариантов',
	LOADING: 'Загрузка...',
}

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
			isMobile = false,
			showCopyButton = false,
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
					setInputValue(searchValue)
					onSearchChange?.(searchValue)
				},
			}),
			[onSearchChange]
		)

		// Оптимизированные обработчики
		const handleInputChange = useCallback(
			(event: any, newInputValue: string, reason: string) => {
				if (reason === 'reset' && isSelectingRef.current) {
					isSelectingRef.current = false
					return
				}

				setInputValue(newInputValue || '')

				if (reason === 'input') {
					onSearchChange?.(newInputValue || '')
				}
			},
			[onSearchChange]
		)

		const handleChange = useCallback(
			(event: any, newValue: any) => {
				isSelectingRef.current = true
				onChange(field.name, newValue ? newValue.value : '')

				if (newValue) {
					setInputValue(newValue.label)
				} else {
					setInputValue('')
				}

				setTimeout(() => {
					isSelectingRef.current = false
				}, 100)
			},
			[onChange, field.name]
		)

		// Синхронизируем inputValue с выбранным значением
		useEffect(() => {
			if (selectedOption && !isSelectingRef.current) {
				setInputValue(selectedOption.label)
			} else if (!value && !isSelectingRef.current) {
				setInputValue('')
			}
		}, [selectedOption, value])

		// Обработка изменения value извне (копирование)
		useEffect(() => {
			if (value !== lastValueRef.current) {
				lastValueRef.current = value

				if (value && !selectedOption && !isSelectingRef.current) {
					const stringValue = String(value)
					setInputValue(stringValue)
					// Запускаем поиск для вставленного значения
					onSearchChange?.(stringValue)
				}
			}
		}, [value, selectedOption, onSearchChange])

		// Обработка вставки текста через буфер обмена
		const handlePaste = useCallback(
			(event: React.ClipboardEvent) => {
				const pastedText = event.clipboardData.getData('text')
				if (pastedText.trim()) {
					// Небольшая задержка для обработки вставки
					setTimeout(() => {
						setInputValue(pastedText)
						onSearchChange?.(pastedText)
					}, 100)
				}
			},
			[onSearchChange]
		)

		return (
			<Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
				<FormControl
					fullWidth
					margin={compact || isMobile ? 'dense' : 'normal'}
				>
					<Autocomplete
						id={field.name}
						value={selectedOption}
						inputValue={inputValue}
						onInputChange={handleInputChange}
						onChange={handleChange}
						options={options}
						getOptionLabel={option => option?.label || ''}
						loading={loading}
						size={isMobile ? 'small' : compact ? 'small' : 'medium'}
						renderInput={params => (
							<TextField
								{...params}
								label={field.label}
								placeholder={field.placeholder || ''}
								error={!!error}
								helperText={error}
								required={field.required}
								size={isMobile ? 'small' : compact ? 'small' : 'medium'}
								onPaste={handlePaste}
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
				{showCopyButton && (
					<CopyButton value={value} compact={compact} isMobile={isMobile} />
				)}
			</Box>
		)
	}
)

AutocompleteInput.displayName = 'AutocompleteInput'
