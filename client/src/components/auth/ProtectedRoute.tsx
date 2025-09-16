import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/auth'

interface ProtectedRouteProps {
	children: React.ReactNode
	requiredRole?: 'admin' | 'user'
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
	children,
	requiredRole,
}) => {
	const { isAuthenticated, user, isLoading } = useAuth()

	console.log('🔵 ProtectedRoute render:', {
		isAuthenticated,
		user: user?.role,
		isLoading,
		requiredRole,
	})

	// Показываем загрузку во время проверки авторизации
	if (isLoading) {
		console.log('🔵 ProtectedRoute: isLoading = true, returning null')
		return null
	}

	// Если пользователь не авторизован, перенаправляем на главную
	if (!isAuthenticated) {
		console.log('🔵 ProtectedRoute: not authenticated, redirecting to /')
		return <Navigate to='/' replace />
	}

	// Если требуется роль админа, но пользователь не админ
	if (requiredRole === 'admin' && user?.role !== 'admin') {
		console.log(
			'🔵 ProtectedRoute: admin required but user is not admin, redirecting to /'
		)
		return <Navigate to='/' replace />
	}

	// Если все проверки пройдены, показываем дочерний компонент
	console.log('🔵 ProtectedRoute: all checks passed, rendering children')
	return <>{children}</>
}
