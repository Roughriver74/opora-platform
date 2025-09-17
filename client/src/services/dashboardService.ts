import api from './api'
import { DashboardData, DashboardFilters } from '../types/dashboard'

class DashboardService {
	/**
	 * Получение данных дашборда
	 */
	async getDashboardData(filters: DashboardFilters): Promise<DashboardData> {
		try {
			// Получаем основную статистику
			const statsResponse = await api.get('/api/submissions/optimized/stats', {
				params: {
					dateFrom: filters.dateFrom,
					dateTo: filters.dateTo,
					assignedTo: filters.assignedTo,
					userId: filters.userId,
					formId: filters.formId,
					status: filters.status,
					priority: filters.priority,
				},
			})

			console.log('API Response:', statsResponse.data)

			if (!statsResponse.data.success) {
				throw new Error(
					statsResponse.data.message || 'Ошибка получения статистики'
				)
			}

			const statsData = statsResponse.data.data
			console.log('Stats Data:', statsData)

			// Получаем дополнительные данные для графиков и топов
			const [chartsData, topListsData] = await Promise.all([
				this.getChartsData(filters),
				this.getTopListsData(filters),
			])

			// Формируем итоговые данные дашборда
			const dashboardData: DashboardData = {
				stats: this.formatStatsData(statsData),
				charts: chartsData,
				topLists: topListsData,
				period: {
					from: filters.dateFrom,
					to: filters.dateTo,
					label: this.getPeriodLabel(filters),
				},
			}

			return dashboardData
		} catch (error: any) {
			console.error('Ошибка получения данных дашборда:', error)
			throw new Error(error.message || 'Ошибка загрузки данных дашборда')
		}
	}

	/**
	 * Получение данных для графиков
	 */
	private async getChartsData(filters: DashboardFilters) {
		try {
			// Получаем все данные одним запросом
			const response = await api.get('/api/submissions/optimized/stats', {
				params: filters,
			})

			const data = response.data.data

			return {
				submissionsByMonth: this.formatChartData(
					data?.byMonth || [],
					'Заявки по месяцам',
					'#4c1130'
				),
				submissionsByStatus: this.formatChartData(
					data?.byStatus || [],
					'Заявки по статусам',
					'#f50057'
				),
				submissionsByPriority: this.getDefaultChartData(
					'Заявки по приоритетам'
				), // Убираем график по приоритетам
				submissionsByDayOfWeek: this.formatDayOfWeekData(
					data?.byDayOfWeek || [],
					'Заявки по дням недели',
					'#9c27b0'
				),
				processingTimeTrend: this.getDefaultChartData('Время обработки'),
			}
		} catch (error) {
			console.error('Ошибка получения данных графиков:', error)
			return this.getDefaultChartsData()
		}
	}

	/**
	 * Получение данных для топов
	 */
	private async getTopListsData(filters: DashboardFilters) {
		try {
			// Получаем все данные одним запросом
			const response = await api.get('/api/submissions/optimized/stats', {
				params: filters,
			})

			const data = response.data.data

			return {
				topForms: [], // Убираем топ форм
				topManagers: this.formatTopListData(data?.byUser || []), // Показываем авторов заявок
				topClients: this.formatTopListData(data?.byClients || []), // Используем данные из field_1750266840204
				topProducts: this.formatTopListData(data?.byProducts || []), // Используем данные из formData
				topStatuses: [], // Убираем топ статусов
				topPriorities: [], // Убираем топ приоритетов
			}
		} catch (error) {
			console.error('Ошибка получения данных топов:', error)
			return this.getDefaultTopListsData()
		}
	}

	/**
	 * Форматирование данных статистики
	 */
	private formatStatsData(data: any) {
		console.log('Formatting stats data:', data)
		const result = {
			totalSubmissions: parseInt(data.total) || 0,
			newSubmissions: this.getCountByStatus(data.byStatus, 'C1:NEW') || 0,
			completedSubmissions: this.getCountByStatus(data.byStatus, 'C1:WON') || 0,
			inProgressSubmissions:
				this.getCountByStatus(data.byStatus, 'C1:UC_GJLIZP') || 0,
			averageProcessingTime: this.calculateAverageProcessingTime(data),
			conversionRate: this.calculateConversionRate(data),
			monthlyGrowth: this.calculateGrowth(data.byMonth),
			weeklyGrowth: 0, // Пока не реализовано
		}
		console.log('Formatted stats result:', result)
		return result
	}

	/**
	 * Форматирование данных для графиков
	 */
	private formatChartData(data: any[], label: string, color: string) {
		const colors = this.generateColors(data.length, color)
		return {
			labels: data.map(
				item =>
					item.label ||
					item.name ||
					item.status ||
					item.priority ||
					'Неизвестно'
			),
			datasets: [
				{
					label,
					data: data.map(item => parseInt(item.count) || 0),
					backgroundColor: colors,
					borderColor: colors,
					borderWidth: 1,
				},
			],
		}
	}

	/**
	 * Форматирование данных по дням недели
	 */
	private formatDayOfWeekData(data: any[], label: string, color: string) {
		const dayNames = [
			'Понедельник',
			'Вторник',
			'Среда',
			'Четверг',
			'Пятница',
			'Суббота',
			'Воскресенье',
		]
		const colors = this.generateColors(data.length, color)

		return {
			labels: data.map(item => {
				const dayIndex = parseInt(item.day) || 0
				return dayNames[dayIndex] || 'Неизвестно'
			}),
			datasets: [
				{
					label,
					data: data.map(item => parseInt(item.count) || 0),
					backgroundColor: colors,
					borderColor: colors,
					borderWidth: 1,
				},
			],
		}
	}

	/**
	 * Форматирование данных для топов
	 */
	private formatTopListData(data: any[]) {
		const total = data.reduce(
			(sum, item) => sum + (parseInt(item.count) || 0),
			0
		)
		return data.map(item => {
			const count = parseInt(item.count) || 0
			return {
				id: item.id || item.name || item.status || 'unknown',
				name: item.name || item.label || 'Неизвестно',
				count: count,
				percentage: total > 0 ? Math.round((count / total) * 100) : 0,
			}
		})
	}

	/**
	 * Получение количества по статусу
	 */
	private getCountByStatus(statusData: any[], status: string): number {
		if (!statusData || !Array.isArray(statusData)) return 0
		const item = statusData.find(s => s.status === status)
		return item ? parseInt(item.count) || 0 : 0
	}

	/**
	 * Расчет среднего времени обработки
	 */
	private calculateAverageProcessingTime(data: any): string {
		// Используем данные из API
		const avgMinutes = data.averageProcessingTime || 0
		return avgMinutes.toString()
	}

	/**
	 * Расчет конверсии
	 */
	private calculateConversionRate(data: any): number {
		const total = parseInt(data.total) || 0
		const completed = this.getCountByStatus(data.byStatus, 'C1:WON')
		return total > 0 ? Math.round((completed / total) * 100) : 0
	}

	/**
	 * Расчет роста
	 */
	private calculateGrowth(monthlyData: any[]): number {
		if (!monthlyData || monthlyData.length < 2) return 0

		const current = parseInt(monthlyData[monthlyData.length - 1]?.count) || 0
		const previous = parseInt(monthlyData[monthlyData.length - 2]?.count) || 0

		if (previous === 0) return current > 0 ? 100 : 0
		return Math.round(((current - previous) / previous) * 100)
	}

	/**
	 * Генерация цветов для графиков
	 */
	private generateColors(count: number, baseColor: string): string[] {
		const colors = []
		for (let i = 0; i < count; i++) {
			colors.push(
				`${baseColor}${Math.floor(255 * (0.3 + (i * 0.7) / count))
					.toString(16)
					.padStart(2, '0')}`
			)
		}
		return colors
	}

	/**
	 * Получение метки периода
	 */
	private getPeriodLabel(filters: DashboardFilters): string {
		const from = new Date(filters.dateFrom)
		const to = new Date(filters.dateTo)

		if (filters.period === 'day') {
			return to.toLocaleDateString('ru-RU')
		} else if (filters.period === 'week') {
			const fromWeek = Math.ceil(
				(from.getTime() - new Date(from.getFullYear(), 0, 1).getTime()) /
					(7 * 24 * 60 * 60 * 1000)
			)
			const toWeek = Math.ceil(
				(to.getTime() - new Date(to.getFullYear(), 0, 1).getTime()) /
					(7 * 24 * 60 * 60 * 1000)
			)
			return `Неделя ${fromWeek} - ${toWeek}`
		} else if (filters.period === 'month') {
			return `${from.toLocaleDateString('ru-RU', {
				month: 'long',
				year: 'numeric',
			})}`
		} else if (filters.period === 'quarter') {
			const quarter = Math.floor(from.getMonth() / 3) + 1
			return `Q${quarter} ${from.getFullYear()}`
		} else if (filters.period === 'year') {
			return from.getFullYear().toString()
		}

		return `${from.toLocaleDateString('ru-RU')} - ${to.toLocaleDateString(
			'ru-RU'
		)}`
	}

	/**
	 * Получение данных по умолчанию для графиков
	 */
	private getDefaultChartData(label: string) {
		return {
			labels: ['Нет данных'],
			datasets: [
				{
					label,
					data: [0],
					backgroundColor: ['#e0e0e0'],
					borderColor: ['#9e9e9e'],
					borderWidth: 1,
				},
			],
		}
	}

	/**
	 * Получение данных по умолчанию для всех графиков
	 */
	private getDefaultChartsData() {
		return {
			submissionsByMonth: this.getDefaultChartData('Заявки по месяцам'),
			submissionsByStatus: this.getDefaultChartData('Заявки по статусам'),
			submissionsByPriority: this.getDefaultChartData('Заявки по приоритетам'),
			submissionsByDayOfWeek: this.getDefaultChartData('Заявки по дням недели'),
			processingTimeTrend: this.getDefaultChartData('Время обработки'),
		}
	}

	/**
	 * Получение данных по умолчанию для топов
	 */
	private getDefaultTopListData(name: string) {
		return [
			{
				id: 'no-data',
				name: 'Нет данных',
				count: 0,
				percentage: 0,
			},
		]
	}

	/**
	 * Получение данных по умолчанию для всех топов
	 */
	private getDefaultTopListsData() {
		return {
			topForms: this.getDefaultTopListData('Формы'),
			topManagers: this.getDefaultTopListData('Менеджеры'),
			topClients: this.getDefaultTopListData('Клиенты'),
			topProducts: this.getDefaultTopListData('Товары'),
			topStatuses: this.getDefaultTopListData('Статусы'),
			topPriorities: this.getDefaultTopListData('Приоритеты'),
		}
	}
}

export const dashboardService = new DashboardService()
