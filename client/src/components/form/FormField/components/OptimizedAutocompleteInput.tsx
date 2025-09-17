import React, {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from 'react'
import {
	Autocomplete,
	TextField,
	FormControl,
	CircularProgress,
} from '@mui/material'
import { FieldInputProps } from '../types'
import { useOptimizedSearch } from '../hooks/useOptimizedSearch'

export interface OptimizedAutocompleteInputRef {
	triggerSearch: (searchValue: string) => void
}

export const OptimizedAutocompleteInput = forwardRef<
	OptimizedAutocompleteInputRef,
	FieldInputProps
>(({ field, value, onChange, error, compact = false }, ref) => {
	const [inputValue, setInputValue] = useState('')
	const [selectedOption, setSelectedOption] = useState<any>(null)
	const isSelectingRef = useRef(false)

	// Определяем источник данных
	const getDataSource = (): 'catalog' | 'companies' | 'contacts' | null => {
		if (!field.dynamicSource?.enabled) return null

		switch (field.dynamicSource.source) {
			case 'catalog':
				return 'catalog'
			case 'companies':
				return 'companies'
			case 'contacts':
				return 'contacts'
			default:
				return null
		}
	}

	const dataSource = getDataSource()
	const { options, loading, search, clearResults, cleanup } =
		useOptimizedSearch({
			source: dataSource!,
			minQueryLength: 2,
			debounceMs: 300,
			maxResults: 20,
		})

	// Добавляем ref методы для программного управления
	useImperativeHandle(
		ref,
		() => ({
			triggerSearch: (searchValue: string) => {
				setInputValue(searchValue)
				if (dataSource) {
					search(searchValue)
				}
			},
		}),
		[search, dataSource]
	)

	// Обработчики
	const handleInputChange = useCallback(
		(event: any, newInputValue: string, reason: string) => {
			if (reason === 'reset' && isSelectingRef.current) {
				isSelectingRef.current = false
				return
			}

			setInputValue(newInputValue || '')

			if (reason === 'input' && dataSource) {
				search(newInputValue || '')
			}
		},
		[search, dataSource]
	)

	const handleChange = useCallback(
		(event: any, newValue: any) => {
			isSelectingRef.current = true
			onChange(field.name, newValue ? newValue.value : '')
			setSelectedOption(newValue)

			if (newValue) {
				setInputValue(newValue.label)
			} else {
				setInputValue('')
				clearResults()
			}

			setTimeout(() => {
				isSelectingRef.current = false
			}, 100)
		},
		[onChange, field.name, clearResults]
	)

	// Синхронизируем inputValue с выбранным значением
	useEffect(() => {
		if (selectedOption && !isSelectingRef.current) {
			setInputValue(selectedOption.label)
		} else if (!value && !isSelectingRef.current) {
			setInputValue('')
		}
	}, [selectedOption, value])

	// Обработка изменения value извне
	useEffect(() => {
		if (value && value.toString().trim()) {
			const isNumericId = /^\d+$/.test(value.toString())

			if (isNumericId && dataSource) {
				// Для числовых ID запускаем поиск
				search(value.toString())
			}
		}
	}, [value, search, dataSource])

	// Очистка при размонтировании
	useEffect(() => {
		return cleanup
	}, [cleanup])

	// Обработка вставки
	const handlePaste = useCallback(
		(event: React.ClipboardEvent) => {
			const pastedText = event.clipboardData.getData('text')
			if (pastedText && dataSource) {
				setTimeout(() => {
					search(pastedText)
				}, 100)
			}
		},
		[search, dataSource]
	)

	if (!dataSource) {
		return (
			<FormControl fullWidth margin={compact ? 'dense' : 'normal'}>
				<TextField
					label={field.label}
					placeholder={field.placeholder || ''}
					value={inputValue}
					onChange={e => setInputValue(e.target.value)}
					error={!!error}
					helperText={error}
					required={field.required}
					size={compact ? 'small' : 'medium'}
					fullWidth
				/>
			</FormControl>
		)
	}

	return (
		<FormControl fullWidth margin={compact ? 'dense' : 'normal'}>
			<Autocomplete
				id={field.name}
				value={selectedOption}
				inputValue={inputValue}
				onInputChange={handleInputChange}
				onChange={handleChange}
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
				noOptionsText='Нет доступных вариантов'
				loadingText='Загрузка...'
				filterOptions={x => x}
			/>
		</FormControl>
	)
})

OptimizedAutocompleteInput.displayName = 'OptimizedAutocompleteInput'
