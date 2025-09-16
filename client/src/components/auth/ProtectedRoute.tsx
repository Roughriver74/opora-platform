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

	// Показываем загрузку во время проверки авторизации
	if (isLoading) {
		return null
	}

	// Если пользователь не авторизован, перенаправляем на главную
	if (!isAuthenticated) {
		return <Navigate to='/' replace />
	}

	// Если требуется роль админа, но пользователь не админ
	if (requiredRole === 'admin' && user?.role !== 'admin') {
		return <Navigate to='/' replace />
	}

	// Если все проверки пройдены, показываем дочерний компонент
	return <>{children}</>
}
