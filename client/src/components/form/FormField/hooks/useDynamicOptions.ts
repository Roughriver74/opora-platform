import { useState, useCallback, useEffect } from 'react'
import { FormFieldOption } from '../../../../types'
import { FormFieldService } from '../../../../services/formFieldService'
import { FIELD_CONSTANTS } from '../constants'

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

	// Initialize preloaded options
	useEffect(() => {
		if (preloadedOptions && preloadedOptions.length > 0) {
			console.log(
				'🔧 [useDynamicOptions] Устанавливаем предзагруженные опции:',
				preloadedOptions
			)
			setOptions(preloadedOptions)
		}
	}, [preloadedOptions])

	const loadDynamicOptions = useCallback(
		async (query: string) => {
			if (!dynamicSource?.enabled) {
				return
			}

			// Для пустого запроса (начальная загрузка select) или запроса >= минимальной длины
			const trimmedQuery = query.trim()
			if (
				trimmedQuery.length > 0 &&
				trimmedQuery.length < FIELD_CONSTANTS.MIN_SEARCH_LENGTH
			) {
				return
			}

			setLoading(true)
			try {
				let response
				let dataOptions: FormFieldOption[] = []

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
							dataOptions = response.result.map((company: any) => ({
								value: company.ID,
								label: company.TITLE,
								metadata: {
									phone: company.PHONE,
									email: company.EMAIL,
									type: company.COMPANY_TYPE,
								},
							}))
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

				// Сохраняем выбранную опцию в новом списке, если она есть
				if (
					selectedOption &&
					!dataOptions.some(
						(opt: FormFieldOption) => opt.value === selectedOption.value
					)
				) {
					dataOptions.unshift(selectedOption)
				}

				setOptions(dataOptions)
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
		[dynamicSource, selectedOption]
	)

	return {
		options,
		loading,
		selectedOption,
		setSelectedOption,
		loadDynamicOptions,
		setOptions,
	}
}
