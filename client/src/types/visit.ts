export type VisitStatus = 'planned' | 'completed' | 'cancelled' | 'failed'

export interface Visit {
	id: string
	organizationId: string
	companyId: string
	contactId?: string
	userId: string
	date: string
	status: VisitStatus
	visitType?: string
	comment?: string
	dynamicFields: Record<string, any>
	bitrixId?: string
	syncStatus: string
	userName?: string
	companyName?: string
	createdAt: string
	updatedAt: string
	company?: { id: string; name: string }
	user?: { id: string; firstName: string; lastName: string; email: string }
}

export interface VisitFilters {
	page?: number
	limit?: number
	status?: VisitStatus
	companyId?: string
	userId?: string
	dateFrom?: string
	dateTo?: string
	search?: string
	sortBy?: string
	sortOrder?: 'ASC' | 'DESC'
}

export interface CreateVisitData {
	companyId: string
	contactId?: string
	date: string
	visitType?: string
	comment?: string
	dynamicFields?: Record<string, any>
}

export interface UpdateVisitData {
	companyId?: string
	contactId?: string
	date?: string
	visitType?: string
	comment?: string
	dynamicFields?: Record<string, any>
}
