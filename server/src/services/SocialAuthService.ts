import axios from 'axios'
import crypto from 'crypto'
import { getUserService } from './UserService'
import { User, UserRole, UserStatus, AuthProvider } from '../database/entities/User.entity'
import { getUserRepository } from '../database/repositories'

interface SocialUserInfo {
	email: string
	firstName?: string
	lastName?: string
	providerId: string
	provider: AuthProvider
}

export class SocialAuthService {
	private userService = getUserService()
	// In-memory store for OAuth state tokens (TTL: 10 minutes)
	private stateStore = new Map<string, { provider: string; createdAt: number }>()
	private readonly STATE_TTL_MS = 10 * 60 * 1000

	/**
	 * Generate a random state token for CSRF protection
	 */
	generateState(provider: string): string {
		this.cleanExpiredStates()
		const state = crypto.randomBytes(32).toString('hex')
		this.stateStore.set(state, { provider, createdAt: Date.now() })
		return state
	}

	/**
	 * Validate and consume a state token
	 */
	validateState(state: string, provider: string): boolean {
		const entry = this.stateStore.get(state)
		if (!entry) return false
		this.stateStore.delete(state)
		if (Date.now() - entry.createdAt > this.STATE_TTL_MS) return false
		return entry.provider === provider
	}

	private cleanExpiredStates() {
		const now = Date.now()
		for (const [key, value] of this.stateStore) {
			if (now - value.createdAt > this.STATE_TTL_MS) {
				this.stateStore.delete(key)
			}
		}
	}

	/**
	 * Get OAuth2 authorization URL for the given provider
	 */
	getAuthUrl(provider: AuthProvider, redirectUri: string, state: string): string {
		switch (provider) {
			case AuthProvider.GOOGLE:
				return this.getGoogleAuthUrl(redirectUri, state)
			case AuthProvider.YANDEX:
				return this.getYandexAuthUrl(redirectUri, state)
			case AuthProvider.VK:
				return this.getVkAuthUrl(redirectUri, state)
			default:
				throw new Error(`Unsupported provider: ${provider}`)
		}
	}

	/**
	 * Handle OAuth2 callback — exchange code for token, get user info, return JWT
	 */
	async handleCallback(provider: AuthProvider, code: string, redirectUri: string) {
		let socialUser: SocialUserInfo

		switch (provider) {
			case AuthProvider.GOOGLE:
				socialUser = await this.getGoogleUser(code, redirectUri)
				break
			case AuthProvider.YANDEX:
				socialUser = await this.getYandexUser(code, redirectUri)
				break
			case AuthProvider.VK:
				socialUser = await this.getVkUser(code, redirectUri)
				break
			default:
				throw new Error(`Unsupported provider: ${provider}`)
		}

		// Find or create user
		const user = await this.findOrCreateSocialUser(socialUser)

		// Generate JWT via UserService login flow
		return this.loginSocialUser(user)
	}

	// --- Google OAuth2 ---

	private getGoogleAuthUrl(redirectUri: string, state: string): string {
		const clientId = process.env.GOOGLE_CLIENT_ID
		if (!clientId) throw new Error('GOOGLE_CLIENT_ID not configured')

		const params = new URLSearchParams({
			client_id: clientId,
			redirect_uri: redirectUri,
			response_type: 'code',
			scope: 'openid email profile',
			access_type: 'offline',
			prompt: 'select_account',
			state,
		})

		return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
	}

	private async getGoogleUser(code: string, redirectUri: string): Promise<SocialUserInfo> {
		const clientId = process.env.GOOGLE_CLIENT_ID
		const clientSecret = process.env.GOOGLE_CLIENT_SECRET
		if (!clientId || !clientSecret) throw new Error('Google OAuth not configured')

		// Exchange code for token
		const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
			code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code',
		})

		const { access_token } = tokenResponse.data

		// Get user info
		const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
			headers: { Authorization: `Bearer ${access_token}` },
		})

		const { id, email, given_name, family_name } = userResponse.data

		return {
			email,
			firstName: given_name,
			lastName: family_name,
			providerId: id,
			provider: AuthProvider.GOOGLE,
		}
	}

	// --- Yandex OAuth2 ---

	private getYandexAuthUrl(redirectUri: string, state: string): string {
		const clientId = process.env.YANDEX_CLIENT_ID
		if (!clientId) throw new Error('YANDEX_CLIENT_ID not configured')

		const params = new URLSearchParams({
			client_id: clientId,
			redirect_uri: redirectUri,
			response_type: 'code',
			force_confirm: 'yes',
			state,
		})

		return `https://oauth.yandex.ru/authorize?${params.toString()}`
	}

	private async getYandexUser(code: string, redirectUri: string): Promise<SocialUserInfo> {
		const clientId = process.env.YANDEX_CLIENT_ID
		const clientSecret = process.env.YANDEX_CLIENT_SECRET
		if (!clientId || !clientSecret) throw new Error('Yandex OAuth not configured')

		// Exchange code for token
		const tokenResponse = await axios.post(
			'https://oauth.yandex.ru/token',
			new URLSearchParams({
				code,
				client_id: clientId,
				client_secret: clientSecret,
				grant_type: 'authorization_code',
			}).toString(),
			{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
		)

		const { access_token } = tokenResponse.data

		// Get user info
		const userResponse = await axios.get('https://login.yandex.ru/info', {
			headers: { Authorization: `OAuth ${access_token}` },
			params: { format: 'json' },
		})

		const { id, default_email, first_name, last_name } = userResponse.data

		return {
			email: default_email,
			firstName: first_name,
			lastName: last_name,
			providerId: id,
			provider: AuthProvider.YANDEX,
		}
	}

	// --- VK OAuth2 ---

	private getVkAuthUrl(redirectUri: string, state: string): string {
		const clientId = process.env.VK_CLIENT_ID
		if (!clientId) throw new Error('VK_CLIENT_ID not configured')

		const params = new URLSearchParams({
			client_id: clientId,
			redirect_uri: redirectUri,
			display: 'page',
			scope: 'email',
			response_type: 'code',
			v: '5.131',
			state,
		})

		return `https://oauth.vk.com/authorize?${params.toString()}`
	}

	private async getVkUser(code: string, redirectUri: string): Promise<SocialUserInfo> {
		const clientId = process.env.VK_CLIENT_ID
		const clientSecret = process.env.VK_CLIENT_SECRET
		if (!clientId || !clientSecret) throw new Error('VK OAuth not configured')

		// Exchange code for token (VK returns email in token response)
		const tokenResponse = await axios.get('https://oauth.vk.com/access_token', {
			params: {
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: redirectUri,
				code,
			},
		})

		const { access_token, user_id, email } = tokenResponse.data

		// Get user profile
		const userResponse = await axios.get('https://api.vk.com/method/users.get', {
			params: {
				user_ids: user_id,
				fields: 'first_name,last_name',
				access_token,
				v: '5.131',
			},
		})

		const vkUser = userResponse.data.response[0]

		if (!email) {
			throw new Error('VK не предоставил email. Разрешите доступ к email в настройках приложения VK.')
		}

		return {
			email,
			firstName: vkUser.first_name,
			lastName: vkUser.last_name,
			providerId: String(user_id),
			provider: AuthProvider.VK,
		}
	}

	// --- Common ---

	private async findOrCreateSocialUser(socialUser: SocialUserInfo): Promise<User> {
		const repo = getUserRepository()

		// First try to find by provider + providerId
		const existingByProvider = await repo.findOne({
			where: {
				authProvider: socialUser.provider,
				authProviderId: socialUser.providerId,
			},
		})

		if (existingByProvider) {
			return existingByProvider
		}

		// Try to find by email
		const existingByEmail = await repo.findByEmail(socialUser.email)

		if (existingByEmail) {
			// Link social account to existing user
			await repo.update(existingByEmail.id, {
				authProvider: socialUser.provider,
				authProviderId: socialUser.providerId,
			} as any)
			existingByEmail.authProvider = socialUser.provider
			existingByEmail.authProviderId = socialUser.providerId
			return existingByEmail
		}

		// Create new user (BaseRepository.create already saves)
		return repo.create({
			email: socialUser.email.toLowerCase(),
			firstName: socialUser.firstName,
			lastName: socialUser.lastName,
			authProvider: socialUser.provider,
			authProviderId: socialUser.providerId,
			role: UserRole.USER,
			status: UserStatus.ACTIVE,
			isActive: true,
		} as any)
	}

	private async loginSocialUser(user: User) {
		const userService = getUserService()

		// Update last login
		await getUserRepository().update(user.id, { lastLogin: new Date() } as any)

		// Get organizations
		const organizations = await userService.getUserOrganizations(user.id)

		// Generate token
		const token = this.generateToken(user, organizations)

		return {
			token,
			user: user.toSafeObject ? user.toSafeObject() : {
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				role: user.role,
				isActive: user.isActive,
			},
			organizations,
			needsOrganizationSelection: organizations.length > 1,
		}
	}

	private generateToken(user: User, organizations: any[]): string {
		const jwt = require('jsonwebtoken')
		const payload: Record<string, any> = {
			id: user.id,
			email: user.email,
			role: user.role,
			isSuperAdmin: user.isSuperAdmin || false,
		}

		if (organizations.length === 1) {
			payload.organizationId = organizations[0].id
			payload.organizationRole = organizations[0].role
		}

		const secret = process.env.JWT_SECRET || 'secret'
		const expiresIn = process.env.JWT_EXPIRES_IN || '7d'

		return jwt.sign(payload, secret, { expiresIn })
	}
}

let socialAuthService: SocialAuthService | null = null

export const getSocialAuthService = (): SocialAuthService => {
	if (!socialAuthService) {
		socialAuthService = new SocialAuthService()
	}
	return socialAuthService
}
