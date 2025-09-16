import { useState, useCallback, useEffect } from 'react'
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
	const [allOptions, setAllOptions] = useState<FormFieldOption[]>([]) // Кэш всех опций для умного поиска
	const [lastQuery, setLastQuery] = useState<string>('') // Отслеживаем последний запрос
	const { smartSearch, debouncedSearch } = useSmartSearch()

	// Initialize preloaded options
	useEffect(() => {
		if (preloadedOptions && preloadedOptions.length > 0) {
			console.log(
				'🔧 [useDynamicOptions] Устанавливаем предзагруженные опции:',
				preloadedOptions
			)
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

	// Функция для умного поиска по кэшированным опциям
	const smartSearchOptions = useCallback(
		(query: string) => {
			if (!query.trim()) {
				return []
			}

			if (allOptions.length === 0) {
				return []
			}

			const smartResults = smartSearch(query, allOptions)
			return smartResults
		},
		[allOptions, smartSearch]
	)

	const loadDynamicOptions = useCallback(
		async (query: string, autoSelectFirst = false) => {
			if (!dynamicSource?.enabled) {
				return
			}

			const trimmedQuery = query.trim()

			// Если запрос пустой, очищаем опции
			if (!trimmedQuery) {
				setOptions([])
				setLoading(false)
				setLastQuery('')
				return
			}

			// Для запросов меньше минимальной длины не делаем запросы
			if (trimmedQuery.length < FIELD_CONSTANTS.MIN_SEARCH_LENGTH) {
				return
			}

			// Если это тот же запрос, что и последний, не делаем новый запрос
			if (trimmedQuery === lastQuery) {
				return
			}

			setLastQuery(trimmedQuery)
			setLoading(true)

			try {
				let dataOptions: FormFieldOption[] = []

				// Сначала пробуем умный поиск по кэшированным опциям
				if (allOptions.length > 0) {
					dataOptions = smartSearchOptions(trimmedQuery)
					console.log(
						`🧠 useDynamicOptions: Умный поиск для "${trimmedQuery}":`,
						dataOptions.length,
						'результатов'
					)

					// Если умный поиск дал результаты, используем их
					if (dataOptions.length > 0) {
						setOptions(dataOptions)
						setLoading(false)
						return
					}
				}

				// Если умный поиск не дал результатов, делаем запрос к серверу
				let response

				switch (dynamicSource.source) {
					case 'catalog':
						response = await FormFieldService.getProducts(query)
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
						response = await FormFieldService.getCompanies(query)
						if (response?.result) {
							// Сначала создаем базовые опции
							const baseOptions = response.result.map((company: any) => ({
								value: company.ID,
								title: company.TITLE,
								metadata: {
									phone: company.PHONE,
									email: company.EMAIL,
									type: company.COMPANY_TYPE,
									requisites: company.REQUISITES,
								},
							}))

							// Находим дублирующиеся названия
							const titleCounts = baseOptions.reduce(
								(acc: Record<string, number>, option: any) => {
									acc[option.title] = (acc[option.title] || 0) + 1
									return acc
								},
								{} as Record<string, number>
							)

							// Создаем финальные опции с умными label, включая ИНН
							dataOptions = baseOptions.map((option: any) => {
								const hasInn = option.metadata?.requisites?.RQ_INN
								let label = option.title

								// Если есть дублирующиеся названия, добавляем ID
								if (titleCounts[option.title] > 1) {
									label = `${option.title} (ID: ${option.value})`
								}

								// Если есть ИНН, добавляем его к названию
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
						response = await FormFieldService.getContacts(query)
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

				// Обновляем кэш всех опций
				if (dataOptions.length > 0) {
					setAllOptions(prev => {
						const newOptions = [...prev, ...dataOptions]
						// Удаляем дубликаты
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

				// Сохраняем выбранную опцию в новом списке, если её нет
				if (
					selectedOption &&
					!uniqueOptions.some(
						(opt: FormFieldOption) => opt.value === selectedOption.value
					)
				) {
					uniqueOptions.unshift(selectedOption)
				}

				dataOptions = uniqueOptions

				console.log(
					`🔍 useDynamicOptions: Загружены опции для "${query}":`,
					dataOptions.length,
					'штук'
				)
				setOptions(dataOptions)

				// Улучшенная логика автоматического выбора
				if (query && dataOptions.length > 0) {
					// 1. Сначала ищем точное совпадение по value
					let exactMatch = dataOptions.find(opt => opt.value === query)

					// 2. Если не нашли по value, ищем по label (для вставленного текста)
					if (!exactMatch) {
						exactMatch = dataOptions.find(
							opt =>
								opt.label.toLowerCase().includes(query.toLowerCase()) ||
								opt.label.toLowerCase() === query.toLowerCase()
						)
					}

					// 3. Если не нашли по label, ищем по частичному совпадению
					if (!exactMatch) {
						exactMatch = dataOptions.find(opt =>
							opt.label.toLowerCase().includes(query.toLowerCase())
						)
					}

					if (exactMatch) {
						console.log(
							`✅ useDynamicOptions: Автоматически выбираем найденное совпадение:`,
							exactMatch
						)
						setSelectedOption(exactMatch)
					} else if (autoSelectFirst && dataOptions.length === 1) {
						// Если был запрос на автоматический выбор и найдена только одна опция
						console.log(
							`✅ useDynamicOptions: Автоматически выбираем единственную найденную опцию:`,
							dataOptions[0]
						)
						setSelectedOption(dataOptions[0])
					}
				}
			} catch (error) {
				console.error(
					`Ошибка при загрузке данных из ${dynamicSource.source}:`,
					error
				)
				setOptions([])
			} finally {
				setLoading(false)
			}
		},
		[dynamicSource, selectedOption, allOptions, smartSearchOptions, lastQuery]
	)

	// Функция для принудительной синхронизации с опциями
	const syncWithOptions = useCallback(
		(value: any) => {
			if (value && options.length > 0) {
				const foundOption = options.find(opt => opt.value === value)
				if (foundOption) {
					console.log(
						`🔄 useDynamicOptions: Принудительная синхронизация с опцией:`,
						foundOption
					)
					setSelectedOption(foundOption)
					return foundOption
				}
			}
			return null
		},
		[options]
	)

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
	}
}
