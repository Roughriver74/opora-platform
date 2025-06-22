import { Request, Response, NextFunction } from 'express'
import User from '../models/User'

export const adminMiddleware = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	if (!req.user) {
		res.status(401).json({ message: 'Not authenticated' })
		return
	}

	try {
		const user = await User.findById(req.user.id)
		if (!user || user.role !== 'admin') {
			res.status(403).json({ message: 'Access denied. Admin role required.' })
			return
		}
		next()
	} catch (error) {
		res.status(500).json({ message: 'Server error' })
	}
}
