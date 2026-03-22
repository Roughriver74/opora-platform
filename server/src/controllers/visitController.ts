import { Request, Response } from 'express'
import { getVisitService } from '../services/VisitService'
import { VisitStatus } from '../database/entities/Visit.entity'

export const getVisits = async (req: Request, res: Response) => {
	try {
		const {
			page,
			limit,
			status,
			companyId,
			userId,
			dateFrom,
			dateTo,
			search,
			sortBy,
			sortOrder,
		} = req.query

		const result = await getVisitService().findWithFilters({
			organizationId: req.organizationId,
			page: page ? parseInt(page as string, 10) : undefined,
			limit: limit ? parseInt(limit as string, 10) : undefined,
			status: status as VisitStatus | undefined,
			companyId: companyId as string | undefined,
			userId: userId as string | undefined,
			dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
			dateTo: dateTo ? new Date(dateTo as string) : undefined,
			search: search as string | undefined,
			sortBy: sortBy as string | undefined,
			sortOrder: sortOrder as 'ASC' | 'DESC' | undefined,
		})

		return res.json({
			success: true,
			data: result.data,
			pagination: {
				total: result.total,
				page: result.page,
				limit: result.limit,
				totalPages: result.totalPages,
				hasNext: result.hasNext,
				hasPrev: result.hasPrev,
			},
		})
	} catch (error: any) {
		return res.status(500).json({ success: false, message: error.message })
	}
}

export const getVisitById = async (req: Request, res: Response) => {
	try {
		const visit = await getVisitService().findById(req.params.id)

		if (!visit) {
			return res.status(404).json({ success: false, message: 'Визит не найден' })
		}

		return res.json({ success: true, data: visit })
	} catch (error: any) {
		return res.status(500).json({ success: false, message: error.message })
	}
}

export const getVisitCalendar = async (req: Request, res: Response) => {
	try {
		const { dateFrom, dateTo } = req.query

		if (!dateFrom || !dateTo) {
			return res.status(400).json({
				success: false,
				message: 'Необходимо указать dateFrom и dateTo',
			})
		}

		const data = await getVisitService().findCalendar(
			req.organizationId!,
			new Date(dateFrom as string),
			new Date(dateTo as string)
		)

		return res.json({ success: true, data })
	} catch (error: any) {
		return res.status(500).json({ success: false, message: error.message })
	}
}

export const createVisit = async (req: Request, res: Response) => {
	try {
		const { companyId, date, contactId, visitType, comment, dynamicFields } = req.body

		if (!companyId) {
			return res.status(400).json({ success: false, message: 'Необходимо указать companyId' })
		}

		if (!date) {
			return res.status(400).json({ success: false, message: 'Необходимо указать дату визита' })
		}

		const visit = await getVisitService().createVisit({
			organizationId: req.organizationId!,
			userId: req.user!.id,
			companyId,
			date: new Date(date),
			contactId,
			visitType,
			comment,
			dynamicFields,
		})

		return res.status(201).json({ success: true, data: visit })
	} catch (error: any) {
		return res.status(500).json({ success: false, message: error.message })
	}
}

export const updateVisit = async (req: Request, res: Response) => {
	try {
		const { companyId, contactId, date, status, visitType, comment, dynamicFields } = req.body

		const visit = await getVisitService().updateVisit(req.params.id, {
			companyId,
			contactId,
			date: date ? new Date(date) : undefined,
			status,
			visitType,
			comment,
			dynamicFields,
		})

		if (!visit) {
			return res.status(404).json({ success: false, message: 'Визит не найден' })
		}

		return res.json({ success: true, data: visit })
	} catch (error: any) {
		return res.status(500).json({ success: false, message: error.message })
	}
}

export const updateVisitStatus = async (req: Request, res: Response) => {
	try {
		const { status } = req.body

		if (!status || !Object.values(VisitStatus).includes(status)) {
			return res.status(400).json({
				success: false,
				message: `Некорректный статус. Допустимые значения: ${Object.values(VisitStatus).join(', ')}`,
			})
		}

		const visit = await getVisitService().updateStatus(req.params.id, status as VisitStatus)

		if (!visit) {
			return res.status(404).json({ success: false, message: 'Визит не найден' })
		}

		return res.json({ success: true, data: visit })
	} catch (error: any) {
		return res.status(500).json({ success: false, message: error.message })
	}
}

export const deleteVisit = async (req: Request, res: Response) => {
	try {
		await getVisitService().delete(req.params.id)
		return res.json({ success: true, message: 'Визит успешно удалён' })
	} catch (error: any) {
		return res.status(500).json({ success: false, message: error.message })
	}
}
