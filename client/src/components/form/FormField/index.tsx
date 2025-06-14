import React, { useState, useEffect } from 'react'
import { FormFieldProps } from './types'
import { FIELD_CONSTANTS, FIELD_TYPES } from './constants'
import { useDebounce } from './hooks/useDebounce'
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

const FormField: React.FC<FormFieldProps> = ({
	field,
	value,
	onChange,
	error,
	compact = false,
}) => {
	const [searchQuery, setSearchQuery] = useState('')
	const [isValueSelected, setIsValueSelected] = useState(false)
	const debouncedSearchQuery = useDebounce(
		searchQuery,
		FIELD_CONSTANTS.DEBOUNCE_DELAY
	)

	const {
		options,
		loading,
		selectedOption,
		setSelectedOption,
		loadDynamicOptions,
		setOptions,
	} = useDynamicOptions(field.dynamicSource)

	// Initialize static options
	useEffect(() => {
		if (field.options && !field.dynamicSource?.enabled) {
			setOptions(field.options)
		}
	}, [field.options, field.dynamicSource?.enabled, setOptions])

	// Load initial dynamic options for select fields
	useEffect(() => {
		if (field.dynamicSource?.enabled && field.type === FIELD_TYPES.SELECT) {
			// Для select полей загружаем данные с пустым запросом (получаем первые записи)
			loadDynamicOptions('')
		}
	}, [field.dynamicSource?.enabled, field.type, loadDynamicOptions])

	// Load dynamic options on search (только для autocomplete)
	useEffect(() => {
		if (field.dynamicSource?.enabled && 
			field.type === FIELD_TYPES.AUTOCOMPLETE && 
			debouncedSearchQuery && 
			!isValueSelected) {
			loadDynamicOptions(debouncedSearchQuery)
		}
	}, [debouncedSearchQuery, field.dynamicSource?.enabled, field.type, loadDynamicOptions, isValueSelected])

	// Handle search change for autocomplete
	const handleSearchChange = (query: string) => {
		setSearchQuery(query)
		// Сбрасываем флаг выбора при новом поиске
		if (query && query.length > 0) {
			setIsValueSelected(false)
		}
	}

	// Update selected option when value changes
	useEffect(() => {
		if (value && options.length > 0) {
			const selected = options.find(opt => opt.value === value)
			if (selected) {
				setSelectedOption(selected)
				setIsValueSelected(true)
				setSearchQuery('') // Очищаем поиск после выбора
			}
		} else if (!value) {
			setIsValueSelected(false)
		}
	}, [value, options, setSelectedOption])

	const renderField = () => {
		const commonProps = {
			field,
			value,
			onChange,
			error,
			compact,
			options,
			loading,
			onSearchChange: handleSearchChange,
		}

		switch (field.type) {
			case FIELD_TYPES.TEXT:
				return <TextInput {...commonProps} />

			case FIELD_TYPES.NUMBER:
				return <NumberInput {...commonProps} />

			case FIELD_TYPES.DATE:
				return <DateInput {...commonProps} />

			case FIELD_TYPES.SELECT:
				return <SelectInput {...commonProps} />

			case FIELD_TYPES.AUTOCOMPLETE:
				return <AutocompleteInput {...commonProps} />

			case FIELD_TYPES.CHECKBOX:
				return <CheckboxInput {...commonProps} />

			case FIELD_TYPES.RADIO:
				return <RadioInput {...commonProps} />

			case FIELD_TYPES.TEXTAREA:
				return <TextareaInput {...commonProps} />

			case FIELD_TYPES.DIVIDER:
				return <DividerField {...commonProps} />

			case FIELD_TYPES.HEADER:
				return <HeaderField {...commonProps} />

			default:
				return <TextInput {...commonProps} />
		}
	}

	const styles = getFieldStyles(compact)

	// For divider and header fields, use minimal styling
	if (field.type === FIELD_TYPES.DIVIDER || field.type === FIELD_TYPES.HEADER) {
		return <div style={styles.container}>{renderField()}</div>
	}

	return (
		<div
			className='form-field'
			style={{ marginBottom: FIELD_CONSTANTS.FORM_FIELD_MARGIN }}
		>
			{renderField()}
		</div>
	)
}

export default FormField
