import { BaseService } from './base/BaseService'
import { Visit, VisitStatus } from '../database/entities/Visit.entity'
import {
	VisitRepository,
	VisitFilterOptions,
	getVisitRepository,
} from '../database/repositories/VisitRepository'

export interface CreateVisitDTO {
	organizationId: string
	companyId: string
	contactId?: string
	userId: string
	date: Date
	status?: VisitStatus
	visitType?: string
	comment?: string
	dynamicFields?: Record<string, any>
}

export interface UpdateVisitDTO {
	companyId?: string
	contactId?: string
	date?: Date
	status?: VisitStatus
	visitType?: string
	comment?: string
	dynamicFields?: Record<string, any>
}

export class VisitService extends BaseService<Visit, VisitRepository> {
	constructor() {
		super(getVisitRepository())
	}

	async createVisit(data: CreateVisitDTO): Promise<Visit> {
		return this.repository.create({
			organizationId: data.organizationId,
			companyId: data.companyId,
			contactId: data.contactId,
			userId: data.userId,
			date: data.date,
			status: data.status ?? VisitStatus.PLANNED,
			visitType: data.visitType,
			comment: data.comment,
			dynamicFields: data.dynamicFields ?? {},
		} as any)
	}

	async updateVisit(id: string, data: UpdateVisitDTO): Promise<Visit | null> {
		return this.repository.update(id, data as any)
	}

	async updateStatus(id: string, status: VisitStatus): Promise<Visit | null> {
		return this.repository.update(id, { status } as any)
	}

	async findWithFilters(options: VisitFilterOptions): Promise<Visit[]> {
		return this.repository.findWithFilters(options)
	}

	async findCalendar(
		orgId: string,
		dateFrom: Date,
		dateTo: Date
	): Promise<Visit[]> {
		return this.repository.findCalendar(orgId, dateFrom, dateTo)
	}
}

let visitServiceInstance: VisitService | null = null

export function getVisitService(): VisitService {
	if (!visitServiceInstance) {
		visitServiceInstance = new VisitService()
	}
	return visitServiceInstance
}
