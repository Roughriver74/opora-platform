import { useState, useCallback, useEffect, useRef } from 'react'
import { FormFieldOption } from '../../../../types'
import { FormFieldService } from '../../../../services/formFieldService'
import { FIELD_CONSTANTS } from '../constants'

/**
 * Оптимизированный хук для поиска с улучшенной работой с Elasticsearch
 * Включает debouncing, кэширование и умную обработку запросов
 */
export const useOptimizedSearch = (
	config?:
		| {
				source: string
				minQueryLength?: number
				debounceMs?: number
				maxResults?: number
		  }
		| { enabled: boolean; source: string },
	preloadedOptions?: FormFieldOption[]
) => {
	const [options, setOptions] = useState<FormFieldOption[]>(
		preloadedOptions || []
	)
	const [loading, setLoading] = useState(false)
	const [selectedOption, setSelectedOption] = useState<FormFieldOption | null>(
		null
	)
	const [cache, setCache] = useState<Map<string, FormFieldOption[]>>(new Map())
	const [lastQuery, setLastQuery] = useState<string>('')

	const abortControllerRef = useRef<AbortController | null>(null)
	const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	// Определяем конфигурацию
	const isLegacyConfig = config && 'enabled' in config
	const dynamicSource = isLegacyConfig
		? config
		: { enabled: !!config?.source, source: config?.source || 'catalog' }
	const minQueryLength = isLegacyConfig
		? FIELD_CONSTANTS.MIN_SEARCH_LENGTH
		: config?.minQueryLength || 2
	const debounceMs = isLegacyConfig ? 300 : config?.debounceMs || 300
	const maxResults = isLegacyConfig ? 20 : config?.maxResults || 20

	// Initialize preloaded options
	useEffect(() => {
		if (preloadedOptions && preloadedOptions.length > 0) {
			setOptions(preloadedOptions)
		}
	}, [preloadedOptions])

	// Initialize static options for non-dynamic fields
	useEffect(() => {
		if (
			!dynamicSource?.enabled &&
			preloadedOptions &&
			preloadedOptions.length > 0
		) {
			setOptions(preloadedOptions)
		}
	}, [dynamicSource?.enabled, preloadedOptions])

	// Debounced search function
	const debouncedSearch = useCallback(
		(query: string, autoSelectFirst = false) => {
			// Очищаем предыдущий таймер
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current)
			}

			// Устанавливаем новый таймер
			debounceTimeoutRef.current = setTimeout(() => {
				performSearch(query, autoSelectFirst)
			}, debounceMs)
		},
		[dynamicSource]
	)

	// Основная функция поиска
	const performSearch = useCallback(
		async (query: string, autoSelectFirst = false) => {
			if (!dynamicSource?.enabled) {
				return
			}

			const trimmedQuery = query.trim()

			// Отменяем предыдущий запрос
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}

			// Если запрос пустой, очищаем опции
			if (!trimmedQuery) {
				setOptions([])
				setLoading(false)
				setLastQuery('')
				return
			}

			// Для запросов меньше минимальной длины не делаем запросы
			if (trimmedQuery.length < minQueryLength) {
				return
			}

			// Проверяем кэш
			if (cache.has(trimmedQuery)) {
				const cachedOptions = cache.get(trimmedQuery)!
				setOptions(cachedOptions)
				setLastQuery(trimmedQuery)

				if (autoSelectFirst && cachedOptions.length > 0) {
					setSelectedOption(cachedOptions[0])
				}
				return
			}

			// Если это тот же запрос, что и последний, не делаем новый запрос
			if (trimmedQuery === lastQuery) {
				return
			}

			setLoading(true)
			setLastQuery(trimmedQuery)

			const abortController = new AbortController()
			abortControllerRef.current = abortController

			try {
				let dataOptions: FormFieldOption[] = []
				let response

				switch (dynamicSource.source) {
					case 'catalog':
						response = await FormFieldService.getProducts(trimmedQuery)
						if (response?.result) {
							dataOptions = response.result.map((product: any) => ({
								value: product.ID,
								label: `${product.NAME}${
									product.PRICE
										? ` (${product.PRICE}${
												product.CURRENCY_ID ? ' ' + product.CURRENCY_ID : ''
										  })`
										: ''
								}`,
								metadata: {
									bitrixId: product.bitrixId || product.ID,
									score: product._score, // Добавляем score для отладки
								},
							}))
						}
						break

					case 'companies':
						response = await FormFieldService.getCompanies(trimmedQuery)
						if (response?.result) {
							dataOptions = response.result.map((company: any) => {
								let label = company.TITLE

								// Добавляем ИНН через запятую, если он есть
								if (company.RQ_INN && company.RQ_INN.trim()) {
									label = `${label}, ${company.RQ_INN}`
								}

								return {
									value: company.ID,
									label,
									metadata: {
										bitrixId: company.bitrixId || company.ID,
										score: company._score,
										inn: company.RQ_INN, // Сохраняем ИНН в метаданных
									},
								}
							})
						}
						break

					case 'contacts':
						response = await FormFieldService.getContacts(trimmedQuery)
						if (response?.result) {
							dataOptions = response.result.map((contact: any) => ({
								value: contact.ID,
								label: `${contact.NAME} ${contact.LAST_NAME}`.trim(),
								metadata: {
									bitrixId: contact.bitrixId || contact.ID,
									score: contact._score,
								},
							}))
						}
						break

					default:
						console.warn(`Unknown dynamic source: ${dynamicSource.source}`)
						return
				}

				// Кэшируем результаты
				setCache(prev => new Map(prev).set(trimmedQuery, dataOptions))
				setOptions(dataOptions)

				// Автоматически выбираем первый результат если нужно
				if (autoSelectFirst && dataOptions.length > 0) {
					setSelectedOption(dataOptions[0])
				}

				// Логируем результаты для отладки
				if (dataOptions.length > 0) {
					console.log(
						`✅ useOptimizedSearch: Найдено ${dataOptions.length} результатов для "${trimmedQuery}"`
					)
					if (dataOptions[0].metadata?.score) {
						console.log(
							`   Топ результат: ${dataOptions[0].label} (score: ${dataOptions[0].metadata.score})`
						)
					}
				} else {
					console.log(
						`⚠️ useOptimizedSearch: Нет результатов для "${trimmedQuery}"`
					)
				}
			} catch (error: any) {
				if (error.name !== 'AbortError') {
					console.error('❌ useOptimizedSearch: Ошибка поиска:', error.message)
				}
			} finally {
				if (!abortController.signal.aborted) {
					setLoading(false)
				}
			}
		},
		[dynamicSource, cache, lastQuery]
	)

	// Очистка при размонтировании
	useEffect(() => {
		return () => {
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current)
			}
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
		}
	}, [])

	return {
		options,
		loading,
		selectedOption,
		setSelectedOption,
		loadDynamicOptions: debouncedSearch,
		setOptions,
		syncWithOptions: (value: string) => {
			// Синхронизация с выбранным значением
			const option = options.find(opt => opt.value === value)
			if (option) {
				setSelectedOption(option)
			}
		},
		resetFailedAttempts: () => {
			// Сбрасываем счетчик неудачных попыток (для совместимости)
		},
		failedAttempts: 0, // Всегда 0 для оптимизированного поиска
		// Новые методы для OptimizedAutocompleteInput
		search: debouncedSearch,
		clearResults: () => {
			// Не очищаем опции для статических полей
			if (!dynamicSource?.enabled) {
				return
			}
			setOptions([])
			setSelectedOption(null)
		},
		cleanup: () => {
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current)
			}
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
		},
	}
}
