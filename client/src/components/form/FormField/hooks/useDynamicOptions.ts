import { useState, useCallback, useEffect, useRef } from 'react'
import { FormFieldOption } from '../../../../types'
import { FormFieldService } from '../../../../services/formFieldService'
import { FIELD_CONSTANTS } from '../constants'
import { useSmartSearch } from './useSmartSearch'

export const useDynamicOptions = (
	dynamicSource?: { enabled: boolean; source: string },
	preloadedOptions?: FormFieldOption[]
) => {
	const [options, setOptions] = useState<FormFieldOption[]>(
		preloadedOptions || []
	)
	const [loading, setLoading] = useState(false)
	const [selectedOption, setSelectedOption] = useState<FormFieldOption | null>(
		null
	)
	const [allOptions, setAllOptions] = useState<FormFieldOption[]>([])
	const [lastQuery, setLastQuery] = useState<string>('')
	const [hasResults, setHasResults] = useState<boolean>(false)
	const [failedAttempts, setFailedAttempts] = useState<number>(0)
	const abortControllerRef = useRef<AbortController | null>(null)
	const { smartSearch } = useSmartSearch()

	// Initialize preloaded options (без лишних логов)
	useEffect(() => {
		if (preloadedOptions && preloadedOptions.length > 0) {
			setOptions(preloadedOptions)
			setAllOptions(preloadedOptions)
		}
	}, [preloadedOptions])

	// Функция для загрузки всех опций (для умного поиска)
	const loadAllOptions = useCallback(async () => {
		if (!dynamicSource?.enabled || allOptions.length > 0) {
			return
		}

		try {
			let response
			let dataOptions: FormFieldOption[] = []

			switch (dynamicSource.source) {
				case 'catalog':
					response = await FormFieldService.getProducts('')
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
						}))
					}
					break

				case 'companies':
					response = await FormFieldService.getCompanies('')
					if (response?.result) {
						dataOptions = response.result.map((company: any) => ({
							value: company.ID,
							label: company.TITLE,
							metadata: {
								phone: company.PHONE,
								email: company.EMAIL,
								type: company.COMPANY_TYPE,
								requisites: company.REQUISITES,
								bitrixId: company.bitrixId || company.ID, // Добавляем Bitrix ID
							},
						}))
					}
					break

				case 'contacts':
					response = await FormFieldService.getContacts('')
					if (response?.result) {
						dataOptions = response.result.map((contact: any) => ({
							value: contact.ID,
							label: `${contact.LAST_NAME || ''} ${contact.NAME || ''} ${
								contact.SECOND_NAME || ''
							}`
								.trim()
								.replace(/\s+/g, ' '),
							metadata: {
								phone: contact.PHONE,
								email: contact.EMAIL,
								companyId: contact.COMPANY_ID,
								position: contact.POST,
							},
						}))
					}
					break
			}

			setAllOptions(dataOptions)
		} catch (error) {
			console.error('Ошибка при загрузке всех опций:', error)
		}
	}, [dynamicSource, allOptions.length])

	// Функция для фильтрации неподходящих результатов
	const filterRelevantResults = useCallback(
		(options: FormFieldOption[], query: string): FormFieldOption[] => {
			if (!query.trim()) return options

			const queryLower = query.toLowerCase()

			return options.filter(option => {
				const labelLower = option.label.toLowerCase()

				// Проверяем различные критерии релевантности
				const hasExactMatch = labelLower.includes(queryLower)
				const hasWordMatch = labelLower
					.split(/\s+/)
					.some(
						word => word.startsWith(queryLower) || word.includes(queryLower)
					)
				const hasPartialMatch = queryLower
					.split('')
					.every(char => labelLower.includes(char))

				// Возвращаем только если есть хотя бы одно совпадение
				return hasExactMatch || hasWordMatch || hasPartialMatch
			})
		},
		[]
	)

	// Функция для умного поиска по кэшированным опциям
	const smartSearchOptions = useCallback(
		(query: string) => {
			if (!query.trim() || allOptions.length === 0) {
				return []
			}

			const smartResults = smartSearch(query, allOptions)
			return filterRelevantResults(smartResults, query)
		},
		[allOptions, smartSearch, filterRelevantResults]
	)

	const loadDynamicOptions = useCallback(
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
				setHasResults(false)
				setFailedAttempts(0) // Сбрасываем счетчик неудачных попыток
				return
			}

			// Для запросов меньше минимальной длины не делаем запросы
			if (trimmedQuery.length < FIELD_CONSTANTS.MIN_SEARCH_LENGTH) {
				return
			}

			// Проверяем, является ли запрос числовым Bitrix ID
			// Если да, запускаем поиск в Elastic по Bitrix ID
			const isNumericBitrixId = /^\d+$/.test(trimmedQuery)
			if (isNumericBitrixId) {
				console.log(
					`🔍 useDynamicOptions: Поиск по Bitrix ID "${trimmedQuery}" в Elastic`
				)
				// Продолжаем с обычным поиском - Elastic теперь поддерживает поиск по Bitrix ID
			}

			// Если это тот же запрос, что и последний, и у нас уже есть результаты, не делаем новый запрос
			if (trimmedQuery === lastQuery && hasResults && !loading) {
				return
			}

			// Защита от спама: если было много неудачных попыток для этого запроса, не делаем новый запрос
			if (trimmedQuery === lastQuery && failedAttempts >= 15) {
				// Increased limit from 5 to 15
				console.log(
					`🚫 useDynamicOptions: Слишком много неудачных попыток для "${trimmedQuery}", пропускаем запрос`
				)
				return
			}

			setLastQuery(trimmedQuery)
			setLoading(true)

			// Если это новый запрос (не тот же самый), сбрасываем счетчик неудачных попыток
			if (trimmedQuery !== lastQuery) {
				setFailedAttempts(0)
				console.log(
					`🔄 useDynamicOptions: Счетчик неудачных попыток сброшен для нового запроса "${trimmedQuery}"`
				)
			}

			// Создаем новый AbortController для этого запроса
			const abortController = new AbortController()
			abortControllerRef.current = abortController

			try {
				let dataOptions: FormFieldOption[] = []

				// Сначала пробуем умный поиск по кэшированным опциям
				if (allOptions.length > 0) {
					dataOptions = smartSearchOptions(trimmedQuery)

					// Если умный поиск дал результаты, используем их
					if (dataOptions.length > 0) {
						setOptions(dataOptions)
						setHasResults(true)
						setFailedAttempts(0) // Сбрасываем счетчик неудачных попыток
						setLoading(false)
						return
					}
				}

				// Если умный поиск не дал результатов, делаем запрос к серверу
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
							}))
						}
						break

					case 'companies':
						response = await FormFieldService.getCompanies(trimmedQuery)
						console.log(
							`🔍 useDynamicOptions: Результат поиска компаний для "${trimmedQuery}":`,
							response?.result
						)
						if (response?.result) {
							const baseOptions = response.result.map((company: any) => ({
								value: company.ID,
								title: company.TITLE,
								metadata: {
									phone: company.PHONE,
									email: company.EMAIL,
									type: company.COMPANY_TYPE,
									requisites: company.REQUISITES,
									bitrixId: company.bitrixId || company.ID, // Добавляем Bitrix ID
								},
							}))
							console.log(
								`🔍 useDynamicOptions: Обработанные опции компаний:`,
								baseOptions
							)

							const titleCounts = baseOptions.reduce(
								(acc: Record<string, number>, option: any) => {
									acc[option.title] = (acc[option.title] || 0) + 1
									return acc
								},
								{} as Record<string, number>
							)

							dataOptions = baseOptions.map((option: any) => {
								const hasInn = option.metadata?.requisites?.RQ_INN
								let label = option.title

								if (titleCounts[option.title] > 1) {
									label = `${option.title} (ID: ${option.value})`
								}

								if (hasInn) {
									label = `${label}, ${option.metadata.requisites.RQ_INN}`
								}

								return {
									value: option.value,
									label,
									metadata: {
										...option.metadata,
										originalTitle: option.title,
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
								label: `${contact.LAST_NAME || ''} ${contact.NAME || ''} ${
									contact.SECOND_NAME || ''
								}`
									.trim()
									.replace(/\s+/g, ' '),
								metadata: {
									phone: contact.PHONE,
									email: contact.EMAIL,
									companyId: contact.COMPANY_ID,
									position: contact.POST,
								},
							}))
						}
						break

					default:
						console.warn(`Неизвестный источник данных: ${dynamicSource.source}`)
						break
				}

				// Проверяем, не был ли запрос отменен
				if (abortController.signal.aborted) {
					return
				}

				// Обновляем кэш всех опций
				if (dataOptions.length > 0) {
					setAllOptions(prev => {
						const newOptions = [...prev, ...dataOptions]
						return newOptions.filter(
							(option, index, self) =>
								index === self.findIndex(opt => opt.value === option.value)
						)
					})
				}

				// Удаляем дубликаты из результатов
				const uniqueOptions = dataOptions.filter(
					(option, index, self) =>
						index === self.findIndex(opt => opt.value === option.value)
				)

				// Фильтруем неподходящие результаты
				const relevantOptions = filterRelevantResults(
					uniqueOptions,
					trimmedQuery
				)

				// Сохраняем выбранную опцию в новом списке, если её нет
				if (
					selectedOption &&
					!relevantOptions.some(
						(opt: FormFieldOption) => opt.value === selectedOption.value
					)
				) {
					relevantOptions.unshift(selectedOption)
				}

				// Логи только для отладки (можно включить при необходимости)
				// console.log(`🔍 useDynamicOptions: Загружены опции для "${trimmedQuery}":`, relevantOptions.length, `штук (отфильтровано из ${uniqueOptions.length})`)
				setOptions(relevantOptions)
				setHasResults(relevantOptions.length > 0)

				// Обновляем счетчик неудачных попыток
				if (relevantOptions.length > 0) {
					setFailedAttempts(0) // Сбрасываем при успехе
				} else {
					setFailedAttempts(prev => prev + 1) // Увеличиваем при неудаче
				}

				// Улучшенная логика автоматического выбора
				if (trimmedQuery && relevantOptions.length > 0) {
					let exactMatch = relevantOptions.find(
						opt => opt.value === trimmedQuery
					)

					// Для Bitrix ID ищем по metadata.bitrixId если есть
					if (!exactMatch && isNumericBitrixId) {
						console.log(
							`🔍 useDynamicOptions: Поиск по Bitrix ID "${trimmedQuery}" в опциях:`,
							relevantOptions.map(opt => ({
								value: opt.value,
								label: opt.label,
								bitrixId: opt.metadata?.bitrixId,
							}))
						)
						exactMatch = relevantOptions.find(
							opt => opt.metadata?.bitrixId === trimmedQuery
						)
						if (exactMatch) {
							console.log(
								`✅ useDynamicOptions: Найдено совпадение по Bitrix ID:`,
								exactMatch
							)
						} else {
							console.log(
								`❌ useDynamicOptions: Совпадение по Bitrix ID не найдено`
							)
						}
					}

					if (!exactMatch) {
						exactMatch = relevantOptions.find(
							opt =>
								opt.label.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
								opt.label.toLowerCase() === trimmedQuery.toLowerCase()
						)
					}

					if (!exactMatch) {
						exactMatch = relevantOptions.find(opt =>
							opt.label.toLowerCase().includes(trimmedQuery.toLowerCase())
						)
					}

					if (exactMatch) {
						console.log(
							`✅ useDynamicOptions: Автоматически выбрана опция для Bitrix ID "${trimmedQuery}":`,
							exactMatch.label
						)
						setSelectedOption(exactMatch)
					} else if (autoSelectFirst && relevantOptions.length === 1) {
						console.log(
							`✅ useDynamicOptions: Автоматически выбрана единственная опция для "${trimmedQuery}":`,
							relevantOptions[0].label
						)
						setSelectedOption(relevantOptions[0])
					}
				}
			} catch (error: any) {
				if (error.name !== 'AbortError') {
					console.error(
						`Ошибка при загрузке данных из ${dynamicSource.source}:`,
						error
					)
					setOptions([])
					setHasResults(false)
					setFailedAttempts(prev => prev + 1) // Увеличиваем счетчик неудачных попыток
				}
			} finally {
				if (!abortController.signal.aborted) {
					setLoading(false)
				}
			}
		},
		[
			dynamicSource,
			selectedOption,
			allOptions,
			smartSearchOptions,
			lastQuery,
			loading,
			hasResults,
			failedAttempts,
			filterRelevantResults,
		]
	)

	// Функция для принудительной синхронизации с опциями
	const syncWithOptions = useCallback(
		(value: any) => {
			if (value && options.length > 0) {
				const foundOption = options.find(opt => opt.value === value)
				if (foundOption) {
					setSelectedOption(foundOption)
					return foundOption
				}
			}
			return null
		},
		[options]
	)

	// Функция для сброса счетчика неудачных попыток
	const resetFailedAttempts = useCallback(() => {
		setFailedAttempts(0)
		console.log('🔄 useDynamicOptions: Счетчик неудачных попыток сброшен')
	}, [])

	// Очистка при размонтировании
	useEffect(() => {
		return () => {
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
		loadDynamicOptions,
		setOptions,
		syncWithOptions,
		loadAllOptions,
		smartSearchOptions,
		allOptions,
		resetFailedAttempts,
		failedAttempts,
	}
}
