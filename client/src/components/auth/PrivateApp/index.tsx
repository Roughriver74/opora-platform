import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAuth } from '../../../contexts/auth'
import { LoginForm } from '../LoginForm'
import { ProtectedRoute } from '../ProtectedRoute'
import Layout from '../../layout/Layout'
import HomePage from '../../../pages/HomePage'
import AdminPage from '../../../pages/admin/AdminPage'
import DashboardPage from '../../../pages/DashboardPage'
import MySubmissions from '../../user/MySubmissions'
import AnimatedLogo from '../../common/AnimatedLogo'

export const PrivateApp: React.FC = () => {
	const { isAuthenticated, isLoading, user, checkAuth } = useAuth()

	// Проверяем авторизацию при загрузке приложения
	useEffect(() => {
		// Инициализация авторизации только при первом запуске
		const initAuth = async () => {
			try {
				await checkAuth()
			} catch (error) {
				console.error('Ошибка инициализации авторизации:', error)
			}
		}

		// Выполняем проверку авторизации при монтировании компонента
		initAuth()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []) // Намеренно исключаем зависимости для выполнения только при монтировании

	// Показываем загрузку только при первичной инициализации
	if (isLoading) {
		return (
			<Box
				display='flex'
				justifyContent='center'
				alignItems='center'
				minHeight='100vh'
				flexDirection='column'
				gap={2}
			>
				<AnimatedLogo size={80} />
				<CircularProgress size={40} />
			</Box>
		)
	}

	// Если пользователь не авторизован, показываем форму входа
	if (!isAuthenticated) {
		return <LoginForm />
	}

	// Пользователь авторизован - показываем основное приложение
	return (
		<Layout>
			<Routes>
				<Route path='/' element={<HomePage />} />
				<Route
					path='/my-submissions'
					element={
						<ProtectedRoute>
							<MySubmissions />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/admin'
					element={
						<ProtectedRoute requiredRole='admin'>
							<AdminPage />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/dashboard'
					element={
						<ProtectedRoute requiredRole='admin'>
							<DashboardPage />
						</ProtectedRoute>
					}
				/>
				<Route path='*' element={<Navigate to='/' replace />} />
			</Routes>
		</Layout>
	)
}
