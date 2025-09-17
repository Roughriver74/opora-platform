export interface DashboardFilters {
	dateFrom: string
	dateTo: string
	period: 'day' | 'week' | 'month' | 'quarter' | 'year'
	assignedTo?: string
	userId?: string
	formId?: string
	status?: string
	priority?: string
}

export interface DashboardStats {
	totalSubmissions: number
	newSubmissions: number
	completedSubmissions: number
	inProgressSubmissions: number
	averageProcessingTime: string
	conversionRate: number
	monthlyGrowth: number
	weeklyGrowth: number
}

export interface ChartData {
	labels: string[]
	datasets: {
		label: string
		data: number[]
		backgroundColor?: string[]
		borderColor?: string[]
		borderWidth?: number
	}[]
}

export interface DashboardCharts {
	submissionsByMonth: ChartData
	submissionsByStatus: ChartData
	submissionsByPriority: ChartData
	submissionsByProducts: ChartData
	submissionsByDayOfWeek: ChartData
}

export interface TopListItem {
	id: string
	name: string
	count: number
	percentage: number
	value?: number
}

export interface DashboardTopLists {
	topForms: TopListItem[]
	topManagers: TopListItem[]
	topClients: TopListItem[]
	topProducts: TopListItem[]
	topStatuses: TopListItem[]
	topPriorities: TopListItem[]
}

export interface DashboardData {
	stats: DashboardStats
	charts: DashboardCharts
	topLists: DashboardTopLists
	period: {
		from: string
		to: string
		label: string
	}
}
