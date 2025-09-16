import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { FormFieldProps } from './types'
import { FIELD_CONSTANTS, FIELD_TYPES } from './constants'
import { useDynamicOptions } from './hooks/useDynamicOptions'
import { getFieldStyles } from './utils/fieldStyles'

// Import input components
import { TextInput } from './components/inputs/TextInput'
import { SelectInput } from './components/inputs/SelectInput'
import { AutocompleteInput } from './components/inputs/AutocompleteInput'
import { CheckboxInput } from './components/inputs/CheckboxInput'
import { RadioInput } from './components/inputs/RadioInput'
import { TextareaInput } from './components/inputs/TextareaInput'
import { NumberInput } from './components/inputs/NumberInput'
import { DateInput } from './components/inputs/DateInput'

// Import display components
import { DividerField } from './components/display/DividerField'
import { HeaderField } from './components/display/HeaderField'

const FormField: React.FC<FormFieldProps> = React.memo(
	({
		field,
		value,
		onChange,
		error,
		compact = false,
		preloadedOptions,
		isMobile = false,
	}) => {
		const [searchQuery, setSearchQuery] = useState('')
		const [isValueSelected, setIsValueSelected] = useState(false)
		const [forceUpdateKey, setForceUpdateKey] = useState(0)
		const [lastValue, setLastValue] = useState(value)

		const {
			options,
			loading,
			selectedOption,
			setSelectedOption,
			loadDynamicOptions,
			setOptions,
			syncWithOptions,
			resetFailedAttempts,
			failedAttempts,
		} = useDynamicOptions(field.dynamicSource, preloadedOptions)

		// Отладочные логи для autocomplete полей (только при активном взаимодействии)
		if (field.type === 'autocomplete' && searchQuery) {
			console.log(`[FormField ${field.name}] Активный поиск:`, {
				fieldName: field.name,
				searchQuery: searchQuery,
				value: value,
				hasPreloadedOptions: !!preloadedOptions && preloadedOptions.length > 0,
				failedAttempts: failedAttempts,
				isBlocked: failedAttempts >= 5,
			})
		}

		// Initialize static options
		useEffect(() => {
			if (field.options && field.options.length > 0) {
				setOptions(
					field.options.map(option => ({
						value: option.value,
						label: option.label,
					}))
				)
			}
		}, [field.options, setOptions])

		// Initialize selected option (только если есть реальное значение)
		useEffect(() => {
			if (value && value.toString().trim() && !isValueSelected) {
				syncWithOptions(value)
				setIsValueSelected(true)
			}
		}, [value, syncWithOptions, isValueSelected])

		// Load dynamic options when needed - with debounce and proper empty handling
		useEffect(() => {
			if (!field.dynamicSource) return

			// Если поле пустое, очищаем опции
			if (!searchQuery.trim()) {
				setOptions([])
				setIsValueSelected(false)
				return
			}

			// Дебаунсированный поиск
			const timeoutId = setTimeout(() => {
				loadDynamicOptions(searchQuery)
			}, 300) // 300ms задержка

			return () => clearTimeout(timeoutId)
		}, [searchQuery, field.dynamicSource, loadDynamicOptions, setOptions])

		// Force update when value changes externally
		useEffect(() => {
			if (value !== lastValue) {
				setForceUpdateKey(prev => prev + 1)
				setLastValue(value)
				if (value) {
					setIsValueSelected(true)
				}
			}
		}, [value, lastValue])

		const handleChange = useCallback(
			(name: string, newValue: any) => {
				onChange(name, newValue)
				setIsValueSelected(!!newValue)
			},
			[onChange]
		)

		const handleSearchChange = useCallback(
			(query: string) => {
				setSearchQuery(query)
				if (!query) {
					setIsValueSelected(false)
				}
				// Сбрасываем счетчик неудачных попыток при изменении запроса
				if (query !== searchQuery) {
					resetFailedAttempts()
				}
			},
			[searchQuery, resetFailedAttempts]
		)

		const renderField = () => {
			const baseProps = {
				field,
				value,
				onChange: handleChange,
				error,
				compact: compact || isMobile,
				isMobile,
			}

			switch (field.type) {
				case FIELD_TYPES.TEXT:
					return <TextInput {...baseProps} />

				case FIELD_TYPES.SELECT:
					return <SelectInput {...baseProps} options={options} />

				case FIELD_TYPES.AUTOCOMPLETE:
					return (
						<AutocompleteInput
							{...baseProps}
							options={options}
							loading={loading}
							onSearchChange={handleSearchChange}
						/>
					)

				case FIELD_TYPES.CHECKBOX:
					return <CheckboxInput {...baseProps} />

				case FIELD_TYPES.RADIO:
					return <RadioInput {...baseProps} options={options} />

				case FIELD_TYPES.TEXTAREA:
					return <TextareaInput {...baseProps} />

				case FIELD_TYPES.NUMBER:
					return <NumberInput {...baseProps} />

				case FIELD_TYPES.DATE:
					return <DateInput {...baseProps} />

				case FIELD_TYPES.DIVIDER:
					return <DividerField field={field} compact={compact || isMobile} />

				case FIELD_TYPES.HEADER:
					return <HeaderField field={field} compact={compact || isMobile} />

				default:
					return <TextInput {...baseProps} />
			}
		}

		const styles = getFieldStyles(compact, isMobile)

		// Определяем правильные отступы в зависимости от типа поля и режима
		const getFieldMargin = useMemo(() => {
			// Для мобильных устройств используем пиксельные значения
			if (isMobile) {
				if (
					field.type === FIELD_TYPES.DIVIDER ||
					field.type === FIELD_TYPES.HEADER
				) {
					return compact ? '4px' : '6px' // Еще меньше для мобильных
				}

				if (field.type === FIELD_TYPES.NUMBER) {
					return compact ? '4px' : '6px'
				}

				return compact ? '4px' : '6px'
			}

			// Для десктопа используем исходные значения
			if (
				field.type === FIELD_TYPES.DIVIDER ||
				field.type === FIELD_TYPES.HEADER
			) {
				return compact
					? FIELD_CONSTANTS.COMPACT_FIELD_MARGIN
					: FIELD_CONSTANTS.FORM_FIELD_MARGIN
			}

			// Для числовых полей используем специальные отступы
			if (field.type === FIELD_TYPES.NUMBER) {
				return compact
					? FIELD_CONSTANTS.COMPACT_FIELD_MARGIN
					: FIELD_CONSTANTS.NUMBER_FIELD_MARGIN
			}

			// Для остальных полей
			return compact
				? FIELD_CONSTANTS.COMPACT_FIELD_MARGIN
				: FIELD_CONSTANTS.FORM_FIELD_MARGIN
		}, [isMobile, compact, field.type])

		// For divider and header fields, use minimal styling
		if (
			field.type === FIELD_TYPES.DIVIDER ||
			field.type === FIELD_TYPES.HEADER
		) {
			return (
				<div
					style={{
						...styles.container,
						marginBottom: getFieldMargin,
					}}
				>
					{renderField()}
				</div>
			)
		}

		return (
			<div className='form-field' style={{ marginBottom: getFieldMargin }}>
				{renderField()}
			</div>
		)
	},
	(prevProps, nextProps) => {
		// Кастомная функция сравнения для React.memo
		return (
			prevProps.field.name === nextProps.field.name &&
			prevProps.value === nextProps.value &&
			prevProps.error === nextProps.error &&
			prevProps.compact === nextProps.compact &&
			prevProps.isMobile === nextProps.isMobile &&
			JSON.stringify(prevProps.preloadedOptions) ===
				JSON.stringify(nextProps.preloadedOptions)
		)
	}
)

export default FormField
