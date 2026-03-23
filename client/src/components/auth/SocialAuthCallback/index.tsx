import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/auth'
import { Box, CircularProgress, Typography } from '@mui/material'

export const SocialAuthCallback: React.FC = () => {
	const { loginWithToken } = useAuth()
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()

	useEffect(() => {
		const token = searchParams.get('token')
		const userStr = searchParams.get('user')

		if (token && userStr) {
			try {
				const user = JSON.parse(userStr)
				loginWithToken(token, user)
				navigate('/', { replace: true })
			} catch {
				navigate('/auth/social-error?error=invalid_data', { replace: true })
			}
		} else {
			navigate('/auth/social-error?error=missing_data', { replace: true })
		}
	}, [searchParams, loginWithToken, navigate])

	return (
		<Box
			display='flex'
			justifyContent='center'
			alignItems='center'
			minHeight='100vh'
			flexDirection='column'
			gap={2}
		>
			<CircularProgress size={40} />
			<Typography color='textSecondary'>Авторизация...</Typography>
		</Box>
	)
}

export const SocialAuthError: React.FC<{ onBack: () => void }> = ({ onBack }) => {
	const [searchParams] = useSearchParams()
	const error = searchParams.get('error') || 'Неизвестная ошибка'

	return (
		<Box
			display='flex'
			justifyContent='center'
			alignItems='center'
			minHeight='100vh'
			flexDirection='column'
			gap={2}
			sx={{ background: 'linear-gradient(135deg, #54c3c3 0%, #4a5fcc 100%)' }}
		>
			<Box
				sx={{
					background: 'white',
					borderRadius: '16px',
					padding: '40px',
					maxWidth: '420px',
					width: '100%',
					textAlign: 'center',
				}}
			>
				<Typography variant='h5' gutterBottom fontWeight={700}>
					Ошибка авторизации
				</Typography>
				<Typography color='error' sx={{ mb: 3 }}>
					{decodeURIComponent(error)}
				</Typography>
				<button
					onClick={onBack}
					style={{
						padding: '12px 24px',
						background: 'linear-gradient(135deg, #54c3c3 0%, #4a5fcc 100%)',
						color: 'white',
						border: 'none',
						borderRadius: '8px',
						fontSize: '16px',
						fontWeight: 600,
						cursor: 'pointer',
					}}
				>
					Вернуться к входу
				</button>
			</Box>
		</Box>
	)
}
