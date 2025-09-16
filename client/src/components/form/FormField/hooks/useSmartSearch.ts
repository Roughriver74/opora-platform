import { useState, useCallback, useRef } from 'react'
import { FormFieldOption } from '../../../../types'

interface SearchStrategy {
	name: string
	weight: number
	matcher: (query: string, option: FormFieldOption) => boolean
}

export const useSmartSearch = () => {
	const [searchHistory, setSearchHistory] = useState<string[]>([])
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	// Стратегии поиска с весами
	const searchStrategies: SearchStrategy[] = [
		{
			name: 'exact_match',
			weight: 100,
			matcher: (query, option) =>
				option.label.toLowerCase() === query.toLowerCase() ||
				option.value === query,
		},
		{
			name: 'starts_with',
			weight: 80,
			matcher: (query, option) =>
				option.label.toLowerCase().startsWith(query.toLowerCase()),
		},
		{
			name: 'contains',
			weight: 60,
			matcher: (query, option) =>
				option.label.toLowerCase().includes(query.toLowerCase()),
		},
		{
			name: 'word_match',
			weight: 40,
			matcher: (query, option) => {
				const queryWords = query.toLowerCase().split(/\s+/)
				const labelWords = option.label.toLowerCase().split(/\s+/)
				return queryWords.some(
					word =>
						word.length > 2 &&
						labelWords.some(
							labelWord => labelWord.includes(word) || word.includes(labelWord)
						)
				)
			},
		},
		{
			name: 'fuzzy_match',
			weight: 20,
			matcher: (query, option) => {
				const queryLower = query.toLowerCase()
				const labelLower = option.label.toLowerCase()

				// Простой алгоритм нечеткого поиска
				let queryIndex = 0
				for (
					let i = 0;
					i < labelLower.length && queryIndex < queryLower.length;
					i++
				) {
					if (labelLower[i] === queryLower[queryIndex]) {
						queryIndex++
					}
				}
				return queryIndex === queryLower.length
			},
		},
	]

	// Функция для вычисления релевантности опции
	const calculateRelevance = useCallback(
		(query: string, option: FormFieldOption): number => {
			const queryLower = query.toLowerCase()
			let maxScore = 0

			for (const strategy of searchStrategies) {
				if (strategy.matcher(queryLower, option)) {
					maxScore = Math.max(maxScore, strategy.weight)
				}
			}

			// Бонус за историю поиска
			if (searchHistory.includes(queryLower)) {
				maxScore += 10
			}

			// Бонус за длину совпадения
			const matchLength = Math.min(
				queryLower.length,
				option.label.toLowerCase().length
			)
			maxScore += matchLength * 0.1

			return maxScore
		},
		[searchStrategies, searchHistory]
	)

	// Умный поиск с ранжированием
	const smartSearch = useCallback(
		(query: string, options: FormFieldOption[]): FormFieldOption[] => {
			if (!query.trim()) return []

			const queryLower = query.trim().toLowerCase()

			// Вычисляем релевантность для каждой опции
			const scoredOptions = options.map(option => ({
				option,
				score: calculateRelevance(queryLower, option),
			}))

			// Фильтруем опции с релевантностью > 5 (более мягкая фильтрация)
			const filteredAndSorted = scoredOptions
				.filter(({ score }) => score > 2)
				.sort((a, b) => b.score - a.score)
				.map(({ option }) => option)

			// Добавляем в историю поиска
			if (queryLower && !searchHistory.includes(queryLower)) {
				setSearchHistory(prev => [queryLower, ...prev.slice(0, 9)]) // Храним последние 10 запросов
			}

			return filteredAndSorted
		},
		[calculateRelevance, searchHistory]
	)

	// Дебаунсированный поиск
	const debouncedSearch = useCallback(
		(
			query: string,
			options: FormFieldOption[],
			callback: (results: FormFieldOption[]) => void,
			delay = 300
		) => {
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current)
			}

			searchTimeoutRef.current = setTimeout(() => {
				const results = smartSearch(query, options)
				callback(results)
			}, delay)
		},
		[smartSearch]
	)

	// Очистка истории поиска
	const clearSearchHistory = useCallback(() => {
		setSearchHistory([])
	}, [])

	// Получение популярных запросов
	const getPopularQueries = useCallback(
		(limit = 5) => {
			return searchHistory.slice(0, limit)
		},
		[searchHistory]
	)

	return {
		smartSearch,
		debouncedSearch,
		calculateRelevance,
		clearSearchHistory,
		getPopularQueries,
		searchHistory,
	}
}
