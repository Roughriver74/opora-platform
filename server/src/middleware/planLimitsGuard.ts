import { Request, Response, NextFunction } from 'express'
import { getOrganizationService } from '../services/OrganizationService'
import { cacheService } from '../services/cacheService'

export type ResourceType = 'submissions' | 'visits' | 'users'

// Default free-plan limits
const DEFAULT_LIMITS: Record<ResourceType, number> = {
	users: 2,
	submissions: 100,
	visits: 100,
}

// TTL for monthly counters: 35 days (covers full month + buffer)
const COUNTER_TTL_SECONDS = 35 * 24 * 60 * 60

function getMonthKey(orgId: string, resourceType: ResourceType): string {
	const month = new Date().toISOString().slice(0, 7) // YYYY-MM
	return `limits:${orgId}:${resourceType}:${month}`
}

/**
 * Middleware factory that enforces free-plan resource limits.
 *
 * - Superadmin: bypass
 * - Pro plan: bypass
 * - Free / null plan: check Redis counter against configured or default limit
 * - If over limit → 429 with details
 */
export function planLimitsGuard(resourceType: ResourceType) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		// 1. Superadmin bypass
		if (req.isSuperAdmin) {
			next()
			return
		}

		// 2. Require organization context
		const orgId = req.organizationId
		if (!orgId) {
			res.status(403).json({
				success: false,
				message: 'Организация не выбрана',
				code: 'ORGANIZATION_REQUIRED',
			})
			return
		}

		try {
			// 3. Load organization and check subscription plan
			const orgService = getOrganizationService()
			const org = await orgService.findById(orgId)

			if (!org) {
				res.status(404).json({
					success: false,
					message: 'Организация не найдена',
					code: 'ORGANIZATION_NOT_FOUND',
				})
				return
			}

			// Pro plan has no limits
			if (org.subscriptionPlan === 'pro') {
				next()
				return
			}

			// 4. Determine the applicable limit
			const customLimits = (org.settings as any)?.limits
			const limit: number =
				customLimits?.[resourceType] !== undefined
					? customLimits[resourceType]
					: DEFAULT_LIMITS[resourceType]

			// -1 means unlimited
			if (limit === -1) {
				next()
				return
			}

			// 5. Get current usage from cache
			const current = await getCurrentUsage(orgId, resourceType)

			// 6. Enforce limit
			if (current >= limit) {
				res.status(429).json({
					success: false,
					message: 'Лимит бесплатного плана исчерпан',
					code: 'PLAN_LIMIT_EXCEEDED',
					limit,
					current,
					resourceType,
				})
				return
			}

			// 7. Under limit — allow
			next()
		} catch (error) {
			next(error)
		}
	}
}

/**
 * Increment the monthly usage counter for a resource after successful creation.
 * Returns the new count.
 */
export async function incrementLimitCounter(
	orgId: string,
	resourceType: ResourceType
): Promise<number> {
	const key = getMonthKey(orgId, resourceType)
	const current = await getCurrentUsage(orgId, resourceType)
	const next = current + 1

	await cacheService.set<number>(key, next, { ttl: COUNTER_TTL_SECONDS })

	return next
}

/**
 * Read the current monthly usage counter for a resource.
 * Returns 0 if not set.
 */
export async function getCurrentUsage(
	orgId: string,
	resourceType: ResourceType
): Promise<number> {
	const key = getMonthKey(orgId, resourceType)
	const value = await cacheService.get<number>(key)
	return value ?? 0
}
