import {
	Request,
	Response,
	NextFunction,
	RequestHandler as ExpressRequestHandler,
} from 'express'

// Интерфейс для пользователя в токене
interface AuthUser {
	id?: string
	role: 'admin' | 'user'
	isAdmin: boolean
	isUser: boolean
	tokenType: 'access'
}

declare global {
	namespace Express {
		// Добавляем поле isAdmin в объект Request
		interface Request {
			user?: AuthUser
			isAdmin?: boolean
		}
	}

	// Типы для наших обработчиков маршрутов
	type RequestHandler = ExpressRequestHandler

	// Тип для контроллеров, которые могут вернуть Response
	type ControllerFunction = (
		req: Request,
		res: Response,
		next?: NextFunction
	) => void | Promise<void> | any
}

export {}
