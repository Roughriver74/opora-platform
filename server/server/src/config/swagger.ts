import swaggerJsdoc from 'swagger-jsdoc'
import { Express } from 'express'
import swaggerUi from 'swagger-ui-express'

const options: swaggerJsdoc.Options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'OPORA API',
			version: '1.0.0',
			description:
				'API документация для OPORA - системы управления заказами и визитами с интеграцией Bitrix24',
			contact: {
				name: 'API Support',
				email: 'support@opora.ru',
			},
		},
		servers: [
			{
				url: 'http://localhost:5001',
				description: 'Development server',
			},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
					description:
						'JWT токен авторизации. Получается через POST /api/auth/login',
				},
				apiKeyAuth: {
					type: 'apiKey',
					in: 'header',
					name: 'X-API-Key',
					description:
						'API ключ для внешних систем. Получается через POST /api/tokens/generate',
				},
			},
			schemas: {
				Error: {
					type: 'object',
					properties: {
						success: { type: 'boolean', example: false },
						message: { type: 'string' },
						error: { type: 'string' },
					},
				},
				Company: {
					type: 'object',
					properties: {
						id: { type: 'string', format: 'uuid' },
						name: { type: 'string' },
						inn: { type: 'string', description: 'ИНН компании' },
						kpp: { type: 'string' },
						phone: { type: 'string' },
						email: { type: 'string', format: 'email' },
						isActive: { type: 'boolean' },
					},
				},
				Nomenclature: {
					type: 'object',
					properties: {
						id: { type: 'string', format: 'uuid' },
						name: { type: 'string' },
						sku: { type: 'string' },
						price: { type: 'number' },
						currency: { type: 'string', default: 'RUB' },
						isActive: { type: 'boolean' },
					},
				},
			},
		},
		security: [{ bearerAuth: [] }],
	},
	apis: ['./src/controllers/*.ts', './src/routes/*.ts'],
}

const swaggerSpec = swaggerJsdoc(options)

export function setupSwagger(app: Express): void {
	// Swagger UI
	app.use(
		'/api-docs',
		swaggerUi.serve,
		swaggerUi.setup(swaggerSpec, {
			explorer: true,
			customCss: '.swagger-ui .topbar { display: none }',
			customSiteTitle: 'OPORA API Docs',
		})
	)

	// Swagger JSON
	app.get('/api-docs.json', (req, res) => {
		res.setHeader('Content-Type', 'application/json')
		res.send(swaggerSpec)
	})
}

export default swaggerSpec
