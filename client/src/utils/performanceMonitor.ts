/**
 * Утилита для мониторинга производительности
 * Особое внимание Android оптимизацим
 */

interface PerformanceMetrics {
	renderTime: number
	interactionTime: number
	memoryUsage?: number
	isSlowDevice: boolean
	isAndroid: boolean
	isMobile: boolean
}

interface SlowRenderWarning {
	componentName: string
	renderTime: number
	threshold: number
	timestamp: number
}

class PerformanceMonitor {
	private renderThreshold: number
	private slowRenders: SlowRenderWarning[] = []
	private isAndroid: boolean
	private isMobile: boolean
	private isSlowDevice: boolean

	constructor() {
		this.isAndroid = /Android/i.test(navigator.userAgent)
		this.isMobile =
			/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
				navigator.userAgent
			)
		this.isSlowDevice = this.detectSlowDevice()

		// Устанавливаем пороги производительности
		this.renderThreshold = this.isAndroid ? 100 : this.isMobile ? 80 : 50

		console.log('🚀 PerformanceMonitor инициализирован', {
			isAndroid: this.isAndroid,
			isMobile: this.isMobile,
			isSlowDevice: this.isSlowDevice,
			renderThreshold: this.renderThreshold,
		})
	}

	/**
	 * Определяет медленное устройство на основе характеристик
	 */
	private detectSlowDevice(): boolean {
		// Проверяем доступную память
		const memory = (navigator as any).deviceMemory
		if (memory && memory < 4) return true

		// Проверяем количество ядер процессора
		const cores = navigator.hardwareConcurrency
		if (cores && cores < 4) return true

		// Для Android устройств дополнительные проверки
		if (this.isAndroid) {
			// Проверяем User Agent на старые версии
			const androidVersion = navigator.userAgent.match(/Android (\d+)/)
			if (androidVersion && parseInt(androidVersion[1]) < 8) return true
		}

		return false
	}

	/**
	 * Измеряет время рендеринга компонента
	 */
	measureRender<T>(componentName: string, renderFunction: () => T): T {
		const startTime = performance.now()
		const result = renderFunction()
		const endTime = performance.now()
		const renderTime = endTime - startTime

		if (renderTime > this.renderThreshold) {
			this.recordSlowRender(componentName, renderTime)
		}

		return result
	}

	/**
	 * Измеряет время взаимодействия пользователя
	 */
	measureInteraction(actionName: string, action: () => void): void {
		const startTime = performance.now()
		action()
		const endTime = performance.now()
		const interactionTime = endTime - startTime

		const threshold = this.isAndroid ? 200 : 100
		if (interactionTime > threshold) {
			console.warn(`⚠️ Медленное взаимодействие: ${actionName}`, {
				time: interactionTime,
				threshold,
				isAndroid: this.isAndroid,
			})
		}
	}

	/**
	 * Записывает медленный рендер
	 */
	private recordSlowRender(componentName: string, renderTime: number): void {
		const warning: SlowRenderWarning = {
			componentName,
			renderTime,
			threshold: this.renderThreshold,
			timestamp: Date.now(),
		}

		this.slowRenders.push(warning)

		// Ограничиваем историю последними 20 записями
		if (this.slowRenders.length > 20) {
			this.slowRenders = this.slowRenders.slice(-20)
		}

		console.warn(`🐌 Медленный рендер: ${componentName}`, {
			renderTime: `${renderTime.toFixed(2)}ms`,
			threshold: `${this.renderThreshold}ms`,
			isAndroid: this.isAndroid,
			recommendations: this.getOptimizationRecommendations(
				componentName,
				renderTime
			),
		})
	}

	/**
	 * Получает рекомендации по оптимизации
	 */
	private getOptimizationRecommendations(
		componentName: string,
		renderTime: number
	): string[] {
		const recommendations: string[] = []

		if (renderTime > 200) {
			recommendations.push('Критическая задержка - рассмотрите виртуализацию')
		}

		if (this.isAndroid) {
			recommendations.push('Android: Отключите анимации и тени')
			recommendations.push(
				'Android: Используйте React.memo для тяжелых компонентов'
			)
			recommendations.push('Android: Увеличьте debounce задержки')
		}

		if (componentName.includes('Form') || componentName.includes('Field')) {
			recommendations.push('Формы: Используйте useCallback для обработчиков')
			recommendations.push('Формы: Ограничьте количество полей на экране')
		}

		if (componentName.includes('Autocomplete')) {
			recommendations.push('Автозаполнение: Увеличьте debounce до 500-1000ms')
			recommendations.push('Автозаполнение: Ограничьте количество результатов')
		}

		return recommendations
	}

	/**
	 * Получает текущие метрики производительности
	 */
	getMetrics(): PerformanceMetrics {
		const avgRenderTime =
			this.slowRenders.length > 0
				? this.slowRenders.reduce((sum, r) => sum + r.renderTime, 0) /
				  this.slowRenders.length
				: 0

		return {
			renderTime: avgRenderTime,
			interactionTime: 0, // Будет обновляться при измерениях
			memoryUsage: (performance as any).memory?.usedJSHeapSize,
			isSlowDevice: this.isSlowDevice,
			isAndroid: this.isAndroid,
			isMobile: this.isMobile,
		}
	}

	/**
	 * Получает историю медленных рендеров
	 */
	getSlowRenders(): SlowRenderWarning[] {
		return [...this.slowRenders]
	}

	/**
	 * Очищает историю метрик
	 */
	clear(): void {
		this.slowRenders = []
		console.log('🧹 История производительности очищена')
	}

	/**
	 * Получает рекомендуемые настройки для текущего устройства
	 */
	getRecommendedSettings() {
		return {
			debounceDelay: this.isAndroid ? 500 : 300,
			renderBatchSize: this.isSlowDevice ? 5 : 10,
			enableAnimations: !this.isAndroid || !this.isSlowDevice,
			enableShadows: !this.isAndroid,
			virtualScrollThreshold: this.isSlowDevice ? 20 : 50,
			memoryThreshold: this.isSlowDevice ? 50 : 100,
		}
	}
}

// Создаем глобальный экземпляр монитора
export const performanceMonitor = new PerformanceMonitor()

/**
 * React хук для мониторинга производительности компонентов
 */
export const usePerformanceMonitor = (componentName: string) => {
	const measureRender = <T>(renderFunction: () => T): T => {
		return performanceMonitor.measureRender(componentName, renderFunction)
	}

	const measureInteraction = (actionName: string, action: () => void): void => {
		performanceMonitor.measureInteraction(
			`${componentName}.${actionName}`,
			action
		)
	}

	const settings = performanceMonitor.getRecommendedSettings()

	return {
		measureRender,
		measureInteraction,
		settings,
		isAndroid: performanceMonitor.getMetrics().isAndroid,
		isSlowDevice: performanceMonitor.getMetrics().isSlowDevice,
	}
}

export default performanceMonitor
