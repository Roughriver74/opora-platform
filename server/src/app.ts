import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import bodyParser from 'body-parser'
import { authMiddleware } from './middleware/authMiddleware'
import { tenantMiddleware } from './middleware/tenantMiddleware'
import formFieldRoutes from './routes/formFieldRoutes'
import formRoutes from './routes/formRoutes'
import submissionRoutes from './routes/submissionRoutes'
import optimizedSubmissionRoutes from './routes/optimizedSubmissionRoutes'
import periodSubmissionRoutes from './routes/periodSubmissionRoutes'
import authRoutes from './routes/authRoutes'
import userRoutes from './routes/userRoutes'
import diagnosticRoutes from './routes/diagnosticRoutes'
import backupRoutes from './routes/backupRoutes'
import settingsRoutes from './routes/settingsRoutes'
import syncRoutes from './routes/syncRoutes'
import searchRoutes from './routes/searchRoutes'
import incrementalSyncRoutes from './routes/incrementalSyncRoutes'
import cronRoutes from './routes/cronRoutes'
import nomenclatureRoutes from './routes/nomenclatureRoutes'
import companyRoutes from './routes/companyRoutes'
import contactRoutes from './routes/contactRoutes'
import syncManagerRoutes from './routes/syncManagerRoutes'
import apiTokenRoutes from './routes/apiTokenRoutes'
import organizationRoutes from './routes/organizationRoutes'
import visitRoutes from './routes/visitRoutes'
// import { setupSwagger } from './config/swagger' // Временно отключено
// Utility for checking database connection status
// Re-importing to fix potential resolution issues
import { checkDatabaseConnection } from './utils/dbCheck'

const app = express()

// Security headers
app.use(helmet({
	contentSecurityPolicy: false, // CSP отключён — фронтенд обслуживается отдельно через nginx
	crossOriginEmbedderPolicy: false,
}))

// CORS
app.use(
	cors({
		origin: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
		credentials: true,
		optionsSuccessStatus: 200,
	})
)

// Rate limiting — общий лимит
const generalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 минут
	max: 300, // 300 запросов на окно
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Слишком много запросов. Попробуйте позже.' },
})
app.use('/api', generalLimiter)

// Rate limiting — строгий лимит для auth-эндпоинтов
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 минут
	max: 20, // 20 попыток на окно
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Слишком много попыток авторизации. Попробуйте через 15 минут.' },
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/user-login', authLimiter)
app.use('/api/auth/admin-login', authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/auth/social', authLimiter)

app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }))

// Timeout middleware (5 minutes)
app.use((req, res, next) => {
	req.setTimeout(300000)
	res.setTimeout(300000)
	next()
})

// Swagger документация (должна быть до authMiddleware)
// setupSwagger(app) // Временно отключено

// Public Routes
app.use('/api/auth', authRoutes)
app.use('/api/sync', syncRoutes)
app.use('/api/incremental-sync', incrementalSyncRoutes)
app.use('/api/cron', cronRoutes)

// Health check
app.get('/health', async (req, res) => {
	try {
		const dbConnected = await checkDatabaseConnection()
		res.json({
			status: 'ok',
			database: dbConnected ? 'connected' : 'disconnected',
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
		})
	} catch (error: any) {
		res.status(503).json({
			status: 'error',
			error: error.message,
		})
	}
})

app.get('/api/health', async (req, res) => {
	try {
		const dbConnected = await checkDatabaseConnection()
		res.json({
			status: 'ok',
			database: dbConnected ? 'connected' : 'disconnected',
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
		})
	} catch (error: any) {
		res.status(503).json({ status: 'error', error: error.message })
	}
})

app.get('/', (req, res) => {
	res.json({
		message: 'OPORA API работает',
		database: 'PostgreSQL',
		version: '2.0.0',
	})
})

// Protected Routes
app.use(authMiddleware)
app.use(tenantMiddleware)

app.use('/api/form-fields', formFieldRoutes)
app.use('/api/forms', formRoutes)
app.use('/api/submissions/period', periodSubmissionRoutes)
app.use('/api/submissions', submissionRoutes)
app.use('/api/submissions', optimizedSubmissionRoutes)
app.use('/api/users', userRoutes)
app.use('/api/diagnostic', diagnosticRoutes)
app.use('/api/backups', backupRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/nomenclature', nomenclatureRoutes)
app.use('/api/companies', companyRoutes)
app.use('/api/contacts', contactRoutes)
app.use('/api/sync-manager', syncManagerRoutes)
app.use('/api/tokens', apiTokenRoutes)
app.use('/api/organizations', organizationRoutes)
app.use('/api/visits', visitRoutes)

export default app
