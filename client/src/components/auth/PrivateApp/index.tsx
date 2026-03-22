import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAuth } from '../../../contexts/auth'
import { LoginForm } from '../LoginForm'
import { ProtectedRoute } from '../ProtectedRoute'
import { OrganizationSelector } from '../OrganizationSelector'
import Layout from '../../layout/Layout'
import HomePage from '../../../pages/HomePage'
import AdminPage from '../../../pages/admin/AdminPage'
import OrganizationsPage from '../../../pages/admin/Organizations'
import DashboardPage from '../../../pages/DashboardPage'
import MySubmissions from '../../user/MySubmissions'
import AnimatedLogo from '../../common/AnimatedLogo'
import VisitsPage from '../../../pages/visits/VisitsPage'
import VisitCreatePage from '../../../pages/visits/VisitCreatePage'
import VisitDetailsPage from '../../../pages/visits/VisitDetailsPage'
import VisitCalendarPage from '../../../pages/visits/VisitCalendarPage'
import BillingPage from '../../../pages/settings/BillingPage'

export const PrivateApp: React.FC = () => {
	const { isAuthenticated, isLoading, checkAuth, needsOrganizationSelection } =
		useAuth()

	// Проверяем авторизацию при загрузке приложения
	useEffect(() => {
		const initAuth = async () => {
			try {
				await checkAuth()
			} catch (error) {
				console.error('Ошибка инициализации авторизации:', error)
			}
		}

		initAuth()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

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

	// Если нужно выбрать организацию
	if (needsOrganizationSelection) {
		return <OrganizationSelector />
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
					path='/admin/organizations'
					element={
						<ProtectedRoute requiredRole='admin'>
							<OrganizationsPage />
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
				<Route path='/visits' element={<VisitsPage />} />
				<Route path='/visits/create' element={<VisitCreatePage />} />
				<Route path='/visits/calendar' element={<VisitCalendarPage />} />
				<Route path='/visits/:id' element={<VisitDetailsPage />} />
				<Route path='/settings/billing' element={<BillingPage />} />
				<Route path='*' element={<Navigate to='/' replace />} />
			</Routes>
		</Layout>
	)
}
