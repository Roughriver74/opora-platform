import { useMemo, useState, useCallback } from 'react'
import { FormSection } from '../../BetoneForm/types'
import { FieldMapping, CopyOperation, CopyPreview } from '../types'
import {
	createFieldMapping,
	getDefaultFieldMappings,
} from '../utils/fieldMapper'
import { convertFieldValue } from '../utils/valueConverter'
import {
	validateCopyOperation,
	canCopyBetweenSections,
} from '../utils/fieldValidator'

interface UseLinkedFieldsProps {
	sections: FormSection[]
	values: Record<string, any>
	onValuesChange: (values: Record<string, any>) => void
}

export const useLinkedFields = ({
	sections,
	values,
	onValuesChange,
}: UseLinkedFieldsProps) => {
	const [copyHistory, setCopyHistory] = useState<CopyOperation[]>([])

	// Получаем маппинги полей между секциями
	const sectionMappings = useMemo(() => {
		const mappings: Record<string, Record<string, FieldMapping[]>> = {}

		sections.forEach(sourceSection => {
			mappings[sourceSection.title] = {}

			sections.forEach(targetSection => {
				if (sourceSection.title !== targetSection.title) {
					// Сначала создаем автоматические маппинги
					const automaticMapping = createFieldMapping(
						sourceSection.fields,
						targetSection.fields,
						sourceSection.title,
						targetSection.title
					)

					// Добавляем настроенные вручную связи
					const manualMappings: FieldMapping[] = []

					// 1. Простые связи (sourceField)
					targetSection.fields.forEach(targetField => {
						if (
							targetField.linkedFields?.enabled &&
							targetField.linkedFields.sourceField
						) {
							const sourceField = sourceSection.fields.find(
								f =>
									f.name ===
									targetField.linkedFields!.sourceField!.sourceFieldName
							)
							if (sourceField) {
								manualMappings.push({
									sourceField: sourceField.name,
									targetField: targetField.name,
									sourceLabel: sourceField.label,
									targetLabel: targetField.label,
									fieldType: sourceField.type,
									compatible: true,
								})
							}
						}
					})

					// 2. Расширенные связи (mappings)
					sourceSection.fields.forEach(sourceField => {
						if (
							sourceField.linkedFields?.enabled &&
							sourceField.linkedFields.mappings
						) {
							sourceField.linkedFields.mappings.forEach(mapping => {
								const targetField = targetSection.fields.find(
									f => f.name === mapping.targetFieldName
								)
								if (
									targetField &&
									(mapping.copyDirection === 'from' ||
										mapping.copyDirection === 'both')
								) {
									// Проверяем, нет ли уже простой связи для этого поля
									const hasSimpleMapping = manualMappings.some(
										simple =>
											simple.sourceField === sourceField.name &&
											simple.targetField === targetField.name
									)
									if (!hasSimpleMapping) {
										manualMappings.push({
											sourceField: sourceField.name,
											targetField: targetField.name,
											sourceLabel: sourceField.label,
											targetLabel: targetField.label,
											fieldType: sourceField.type,
											compatible: true,
										})
									}
								}
							})
						}
					})

					// 3. Обратные связи (to направление)
					targetSection.fields.forEach(targetField => {
						if (
							targetField.linkedFields?.enabled &&
							targetField.linkedFields.mappings
						) {
							targetField.linkedFields.mappings.forEach(mapping => {
								const sourceField = sourceSection.fields.find(
									f => f.name === mapping.targetFieldName
								)
								if (
									sourceField &&
									(mapping.copyDirection === 'to' ||
										mapping.copyDirection === 'both')
								) {
									// Проверяем, нет ли уже связи для этого поля
									const hasExistingMapping = manualMappings.some(
										existing =>
											existing.sourceField === sourceField.name &&
											existing.targetField === targetField.name
									)
									if (!hasExistingMapping) {
										manualMappings.push({
											sourceField: sourceField.name,
											targetField: targetField.name,
											sourceLabel: sourceField.label,
											targetLabel: targetField.label,
											fieldType: sourceField.type,
											compatible: true,
										})
									}
								}
							})
						}
					})

					// Объединяем автоматические и ручные маппинги, приоритет у ручных
					const allMappings = [...manualMappings]

					// Добавляем автоматические только если для них нет ручных настроек
					automaticMapping.mappings.forEach(autoMapping => {
						const hasManualMapping = manualMappings.some(
							manual =>
								manual.sourceField === autoMapping.sourceField &&
								manual.targetField === autoMapping.targetField
						)
						if (!hasManualMapping) {
							allMappings.push(autoMapping)
						}
					})

					mappings[sourceSection.title][targetSection.title] = allMappings
				}
			})
		})

		return mappings
	}, [sections])

	// Проверяет, доступно ли копирование между секциями
	const canCopyFields = useCallback(
		(fromSection: string, toSection: string): boolean => {
			const sourceSection = sections.find(s => s.title === fromSection)
			const targetSection = sections.find(s => s.title === toSection)

			if (!sourceSection || !targetSection) {
				return false
			}

			return canCopyBetweenSections(sourceSection.fields, targetSection.fields)
		},
		[sections]
	)

	// Получает доступные маппинги для копирования
	const getAvailableMappings = useCallback(
		(fromSection: string, toSection: string): FieldMapping[] => {
			return sectionMappings[fromSection]?.[toSection] || []
		},
		[sectionMappings]
	)

	// Создает превью операции копирования
	const createCopyPreview = useCallback(
		(
			fromSection: string,
			toSection: string,
			selectedMappings?: FieldMapping[]
		): CopyPreview | null => {
			const availableMappings = getAvailableMappings(fromSection, toSection)
			const mappingsToUse = selectedMappings || availableMappings

			if (mappingsToUse.length === 0) {
				return null
			}

			const operation: CopyOperation = {
				fromSection,
				toSection,
				mappings: mappingsToUse,
				values,
			}

			const changes = mappingsToUse.map(mapping => {
				const oldValue = values[mapping.targetField]
				const newValue = values[mapping.sourceField]
				const sourceField = sections
					.find(s => s.title === fromSection)
					?.fields.find(f => f.name === mapping.sourceField)
				const targetField = sections
					.find(s => s.title === toSection)
					?.fields.find(f => f.name === mapping.targetField)

				return {
					fieldName: mapping.targetField,
					fieldLabel: mapping.targetLabel,
					oldValue,
					newValue:
						sourceField && targetField
							? convertFieldValue(newValue, sourceField.type, targetField.type)
							: newValue,
					isOverwrite:
						oldValue !== undefined && oldValue !== null && oldValue !== '',
				}
			})

			return {
				operation,
				changes: changes.filter(
					change =>
						change.newValue !== undefined &&
						change.newValue !== null &&
						change.newValue !== ''
				),
			}
		},
		[sections, values, getAvailableMappings]
	)

	// Выполняет копирование полей
	const copyFieldsBetweenSections = useCallback(
		(
			fromSection: string,
			toSection: string,
			selectedMappings?: FieldMapping[]
		): boolean => {
			const sourceSection = sections.find(s => s.title === fromSection)
			const targetSection = sections.find(s => s.title === toSection)

			if (!sourceSection || !targetSection) {
				console.error(`Секции не найдены: ${fromSection} -> ${toSection}`)
				return false
			}

			const availableMappings = getAvailableMappings(fromSection, toSection)
			const mappingsToUse = selectedMappings || availableMappings

			if (mappingsToUse.length === 0) {
				console.warn(
					`Нет доступных маппингов для копирования: ${fromSection} -> ${toSection}`
				)
				return false
			}

			const operation: CopyOperation = {
				fromSection,
				toSection,
				mappings: mappingsToUse,
				values,
			}

			// Валидируем операцию
			const validation = validateCopyOperation(
				operation,
				sourceSection.fields,
				targetSection.fields,
				values
			)

			if (!validation.isValid) {
				console.error('Ошибки валидации:', validation.errors)
				return false
			}

			// Выполняем копирование
			const newValues = { ...values }
			let copiedCount = 0

			mappingsToUse.forEach(mapping => {
				const sourceField = sourceSection.fields.find(
					f => f.name === mapping.sourceField
				)
				const targetField = targetSection.fields.find(
					f => f.name === mapping.targetField
				)
				const sourceValue = values[mapping.sourceField]

				if (
					sourceField &&
					targetField &&
					sourceValue !== undefined &&
					sourceValue !== null &&
					sourceValue !== ''
				) {
					const convertedValue = convertFieldValue(
						sourceValue,
						sourceField.type,
						targetField.type
					)
					newValues[mapping.targetField] = convertedValue
					copiedCount++
				}
			})

			if (copiedCount > 0) {
				onValuesChange(newValues)

				// Сохраняем в историю
				setCopyHistory(prev => [...prev, operation])

				console.log(`Скопировано полей: ${copiedCount}`, validation.warnings)
				return true
			}

			return false
		},
		[sections, values, onValuesChange, getAvailableMappings]
	)

	// Отменяет последнее копирование
	const undoLastCopy = useCallback((): boolean => {
		if (copyHistory.length === 0) {
			return false
		}

		const lastOperation = copyHistory[copyHistory.length - 1]
		const newValues = { ...values }

		// Очищаем скопированные поля
		lastOperation.mappings.forEach(mapping => {
			delete newValues[mapping.targetField]
		})

		onValuesChange(newValues)
		setCopyHistory(prev => prev.slice(0, -1))
		return true
	}, [copyHistory, values, onValuesChange])

	// Получает список секций, из которых можно копировать в указанную секцию
	const getSourceSectionsFor = useCallback(
		(targetSection: string): string[] => {
			return sections
				.filter(section => section.title !== targetSection)
				.filter(section => canCopyFields(section.title, targetSection))
				.map(section => section.title)
		},
		[sections, canCopyFields]
	)

	// Получает список секций, в которые можно копировать из указанной секции
	const getTargetSectionsFor = useCallback(
		(sourceSection: string): string[] => {
			return sections
				.filter(section => section.title !== sourceSection)
				.filter(section => canCopyFields(sourceSection, section.title))
				.map(section => section.title)
		},
		[sections, canCopyFields]
	)

	return {
		// Основные методы
		copyFieldsBetweenSections,
		createCopyPreview,
		canCopyFields,

		// Управление маппингами
		getAvailableMappings,
		sectionMappings,

		// История операций
		copyHistory,
		undoLastCopy,
		canUndo: copyHistory.length > 0,

		// Вспомогательные методы
		getSourceSectionsFor,
		getTargetSectionsFor,

		// Конфигурация
		defaultFieldMappings: getDefaultFieldMappings(),
	}
}
