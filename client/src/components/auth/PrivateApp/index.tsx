import React from 'react'
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAuth } from '../../../contexts/auth'
import { LoginForm } from '../LoginForm'
import Layout from '../../layout/Layout'
import HomePage from '../../../pages/HomePage'
import AdminPage from '../../../pages/admin/AdminPage'
import MySubmissions from '../../user/MySubmissions'
import AnimatedLogo from '../../common/AnimatedLogo'

export const PrivateApp: React.FC = () => {
	const { isAuthenticated, isLoading, user } = useAuth()

	// Логирование состояния для отладки
	console.log('PrivateApp render:', {
		isAuthenticated,
		isLoading,
		userRole: user?.role,
	})

	// Показываем загрузку пока проверяем авторизацию
	if (isLoading) {
		console.log('PrivateApp: показываем загрузку')
		return (
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					alignItems: 'center',
					minHeight: '100vh',
					background: 'linear-gradient(135deg, #54C3C3 0%, #4A5FCC 100%)',
				}}
			>
				<Box sx={{ mb: 3 }}>
					<AnimatedLogo size={80} variant='white' />
				</Box>
				<CircularProgress
					size={40}
					sx={{
						color: '#FFFFFF',
						'& .MuiCircularProgress-circle': {
							strokeLinecap: 'round',
						},
					}}
				/>
				<Box
					sx={{
						mt: 2,
						color: '#FFFFFF',
						fontSize: '16px',
						fontFamily: 'Arial, sans-serif',
					}}
				>
					Загрузка...
				</Box>
			</Box>
		)
	}

	// Если пользователь не авторизован, показываем форму входа
	if (!isAuthenticated) {
		console.log('PrivateApp: пользователь не авторизован, показываем LoginForm')
		return <LoginForm />
	}

	console.log('PrivateApp: пользователь авторизован, показываем приложение')

	return (
		<Router>
			<Layout>
				<Routes>
					<Route path='/' element={<HomePage />} />
					<Route path='/my-submissions' element={<MySubmissions />} />
					{user?.role === 'admin' && (
						<Route path='/admin/*' element={<AdminPage />} />
					)}
					{/* Redirect для неавторизованных маршрутов */}
					<Route path='*' element={<Navigate to='/' replace />} />
				</Routes>
			</Layout>
		</Router>
	)
}
