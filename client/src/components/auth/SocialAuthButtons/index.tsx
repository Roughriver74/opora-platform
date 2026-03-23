import React, { useState } from 'react'
import { authService } from '../../../services/authService'
import './SocialAuthButtons.css'

export const SocialAuthButtons: React.FC = () => {
	const [loading, setLoading] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	const handleSocialAuth = async (provider: string) => {
		try {
			setLoading(provider)
			setError(null)
			const url = await authService.getSocialAuthUrl(provider)
			window.location.href = url
		} catch (err: any) {
			setError(err.message)
			setLoading(null)
		}
	}

	return (
		<div className='social-auth-section'>
			<div className='social-auth-divider'>
				<span>или войдите через</span>
			</div>

			<div className='social-auth-buttons'>
				<button
					type='button'
					className='social-auth-btn social-auth-google'
					onClick={() => handleSocialAuth('google')}
					disabled={loading !== null}
				>
					<svg viewBox='0 0 24 24' width='20' height='20'>
						<path fill='#4285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z' />
						<path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
						<path fill='#FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
						<path fill='#EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
					</svg>
					{loading === 'google' ? 'Загрузка...' : 'Google'}
				</button>

				<button
					type='button'
					className='social-auth-btn social-auth-yandex'
					onClick={() => handleSocialAuth('yandex')}
					disabled={loading !== null}
				>
					<svg viewBox='0 0 24 24' width='20' height='20'>
						<path fill='currentColor' d='M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12zm10.5-6h-1.8c-2.37 0-3.86 1.56-3.86 3.83 0 1.81.74 2.91 2.36 4.08l-2.56 4.09h2.2l2.8-4.62V18h1.84v-5.62l2.8 4.62h2.2l-2.56-4.09c1.62-1.17 2.36-2.27 2.36-4.08 0-2.27-1.49-3.83-3.86-3.83h-.92zm0 5.72V7.72h.92c1.29 0 2.08.75 2.08 1.97 0 1.27-.79 2.03-2.08 2.03h-.92z' />
					</svg>
					{loading === 'yandex' ? 'Загрузка...' : 'Яндекс'}
				</button>

				<button
					type='button'
					className='social-auth-btn social-auth-vk'
					onClick={() => handleSocialAuth('vk')}
					disabled={loading !== null}
				>
					<svg viewBox='0 0 24 24' width='20' height='20'>
						<path fill='currentColor' d='M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.598-.188 1.368 1.259 2.184 1.814.616.42 1.084.327 1.084.327l2.178-.03s1.14-.07.6-.964c-.045-.073-.32-.658-1.64-1.862-1.382-1.26-1.197-1.057.466-3.239.998-1.348 1.382-2.106 1.264-2.457-.112-.334-.807-.245-.807-.245l-2.45.015s-.182-.025-.317.055c-.13.078-.214.26-.214.26s-.384 1.022-.895 1.89c-1.08 1.836-1.512 1.933-1.688 1.818-.41-.267-.307-1.076-.307-1.649 0-1.793.272-2.54-.528-2.734-.266-.064-.461-.107-1.14-.114-.87-.009-1.606.003-2.024.208-.278.136-.493.44-.362.457.162.022.528.099.722.363.25.341.24 1.107.24 1.107s.144 2.11-.335 2.372c-.328.18-.778-.187-1.744-1.865-.494-.86-.868-1.81-.868-1.81s-.072-.176-.2-.271c-.155-.115-.371-.151-.371-.151l-2.326.015s-.349.01-.477.162c-.114.135-.009.414-.009.414s1.806 4.228 3.855 6.36c1.88 1.955 4.015 1.826 4.015 1.826h.968z' />
					</svg>
					{loading === 'vk' ? 'Загрузка...' : 'VK'}
				</button>
			</div>

			{error && (
				<div className='social-auth-error'>{error}</div>
			)}
		</div>
	)
}
