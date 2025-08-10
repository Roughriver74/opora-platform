import { Request, Response, NextFunction } from 'express'
import { AppDataSource } from '../database/config/database.config'
import { User } from '../database/entities/User.entity'

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
		const userRepository = AppDataSource.getRepository(User)
		const user = await userRepository.findOne({ where: { id: req.user.id } })
		if (!user || user.role !== 'admin') {
			res.status(403).json({ message: 'Access denied. Admin role required.' })
			return
		}
		next()
	} catch (error) {
		res.status(500).json({ message: 'Server error' })
	}
}
