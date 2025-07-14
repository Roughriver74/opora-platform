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
					setInputValue(String(value))
					onSearchChange?.(String(value))
				}
			}
		}, [value, selectedOption, onSearchChange])

		return (
			<FormControl fullWidth margin={compact ? 'dense' : 'normal'}>
				<Autocomplete
					id={field.name}
					value={selectedOption}
					inputValue={inputValue}
					onInputChange={(_, newInputValue, reason) => {
						if (reason === 'reset' && isSelectingRef.current) {
							isSelectingRef.current = false
							return
						}

						setInputValue(newInputValue || '')

						if (reason === 'input') {
							onSearchChange?.(newInputValue || '')
						}
					}}
					onChange={(_, newValue) => {
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
