import React from 'react'

/**
 * Утилиты для мониторинга производительности и обнаружения утечек памяти
 */

interface PerformanceMetrics {
	memoryUsage: number
	renderCount: number
	lastRenderTime: number
	componentName: string
	timestamp: Date
}

// Глобальное хранилище метрик
const performanceMetrics: Map<string, PerformanceMetrics> = new Map()

/**
 * Мониторинг памяти
 */
export const monitorMemory = (componentName: string): void => {
	if (!window.performance || !(window.performance as any).memory) {
		console.warn('Performance API не поддерживается в этом браузере')
		return
	}

	const memoryInfo = (window.performance as any).memory
	const memoryUsage = memoryInfo.usedJSHeapSize / 1024 / 1024 // MB

	const existing = performanceMetrics.get(componentName)
	const renderCount = existing ? existing.renderCount + 1 : 1

	performanceMetrics.set(componentName, {
		memoryUsage,
		renderCount,
		lastRenderTime: Date.now(),
		componentName,
		timestamp: new Date(),
	})

	// Логируем если память растет слишком быстро
	if (existing && memoryUsage > existing.memoryUsage * 1.1) {
		console.warn(`⚠️ Возможная утечка памяти в ${componentName}:`, {
			previous: existing.memoryUsage.toFixed(2),
			current: memoryUsage.toFixed(2),
			growth:
				(
					((memoryUsage - existing.memoryUsage) / existing.memoryUsage) *
					100
				).toFixed(2) + '%',
		})
	}
}

/**
 * Мониторинг рендеров
 */
export const monitorRenders = (componentName: string): void => {
	const existing = performanceMetrics.get(componentName)
	const renderCount = existing ? existing.renderCount + 1 : 1

	// Предупреждение о слишком частых рендерах
	if (renderCount > 10) {
		const timeDiff = Date.now() - (existing?.lastRenderTime || 0)
		if (timeDiff < 1000) {
			console.warn(`⚠️ Слишком частые рендеры в ${componentName}:`, {
				renders: renderCount,
				timeWindow: timeDiff + 'ms',
			})
		}
	}

	performanceMetrics.set(componentName, {
		...existing,
		renderCount,
		lastRenderTime: Date.now(),
		componentName,
		timestamp: new Date(),
	} as PerformanceMetrics)
}

/**
 * Получить метрики производительности
 */
export const getPerformanceMetrics = (): PerformanceMetrics[] => {
	return Array.from(performanceMetrics.values())
}

/**
 * Очистить метрики
 */
export const clearPerformanceMetrics = (): void => {
	performanceMetrics.clear()
}

/**
 * Хук для мониторинга производительности компонента
 */
export const usePerformanceMonitor = (componentName: string) => {
	const renderCountRef = React.useRef(0)
	const mountTimeRef = React.useRef(Date.now())

	React.useEffect(() => {
		renderCountRef.current++
		monitorMemory(componentName)
		monitorRenders(componentName)
	})

	React.useEffect(() => {
		mountTimeRef.current = Date.now()

		return () => {
			const lifeTime = Date.now() - mountTimeRef.current
				`🔄 ${componentName} unmounted after ${lifeTime}ms, renders: ${renderCountRef.current}`
			)
		}
	}, [componentName])

	return {
		renderCount: renderCountRef.current,
		lifeTime: Date.now() - mountTimeRef.current,
	}
}

/**
 * Декоратор для мониторинга функций
 */
export const withPerformanceMonitor = <T extends (...args: any[]) => any>(
	fn: T,
	name: string
): T => {
	return ((...args: any[]) => {
		const start = performance.now()

		try {
			const result = fn(...args)

			// Если функция возвращает Promise
			if (result && typeof result.then === 'function') {
				return result.finally(() => {
					const end = performance.now()
					if (end - start > 100) {
						console.warn(
							`🐌 Медленная async функция ${name}: ${(end - start).toFixed(
								2
							)}ms`
						)
					}
				})
			}

			const end = performance.now()
			if (end - start > 50) {
				console.warn(
					`🐌 Медленная функция ${name}: ${(end - start).toFixed(2)}ms`
				)
			}

			return result
		} catch (error) {
			const end = performance.now()
			console.error(
				`❌ Ошибка в функции ${name} (${(end - start).toFixed(2)}ms):`,
				error
			)
			throw error
		}
	}) as T
}

/**
 * Проверка на утечки памяти в localStorage
 */
export const checkLocalStorageLeaks = (): void => {
	const storageSize = JSON.stringify(localStorage).length
	const sizeMB = storageSize / 1024 / 1024

	if (sizeMB > 5) {
		console.warn(`⚠️ Большой размер localStorage: ${sizeMB.toFixed(2)}MB`)

		// Показываем самые большие элементы
		const items = Object.keys(localStorage)
			.map(key => ({
				key,
				size: localStorage.getItem(key)?.length || 0,
			}))
			.sort((a, b) => b.size - a.size)

	}
}

/**
 * Проверка на утечки в глобальных переменных
 */
export const checkGlobalLeaks = (): void => {
	const globalKeys = Object.keys(window).filter(
		key =>
			![
				'window',
				'document',
				'location',
				'navigator',
				'screen',
				'history',
			].includes(key)
	)

	if (globalKeys.length > 50) {
		console.warn(`⚠️ Много глобальных переменных: ${globalKeys.length}`)
			'🔍 Пользовательские глобальные переменные:',
			globalKeys.slice(0, 10)
		)
	}
}

/**
 * Автоматический мониторинг производительности
 */
export const startPerformanceMonitoring = (): void => {
	const interval = setInterval(() => {
		checkLocalStorageLeaks()
		checkGlobalLeaks()

		// Очищаем старые метрики (старше 5 минут)
		const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
		const entries = Array.from(performanceMetrics.entries())
		for (const [key, metric] of entries) {
			if (metric.timestamp.getTime() < fiveMinutesAgo) {
				performanceMetrics.delete(key)
			}
		}
	}, 30000) // Каждые 30 секунд

	// Очищаем интервал при выгрузке страницы
	window.addEventListener('beforeunload', () => {
		clearInterval(interval)
	})
}

/**
 * Инициализация мониторинга производительности
 */
export const initPerformanceMonitoring = (): void => {
	if (process.env.NODE_ENV === 'development') {
		startPerformanceMonitoring()
	}
}

// Автоматическая инициализация в development режиме
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
	initPerformanceMonitoring()
}
