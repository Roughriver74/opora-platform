import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/auth'
import { NotificationProvider } from './contexts/notification'
import { PrivateApp } from './components/auth/PrivateApp'
import { theme } from './theme'
import './App.css'

// Создание клиента React Query
const queryClient = new QueryClient()

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider theme={theme}>
				<NotificationProvider>
					<AuthProvider>
						<Router>
							<PrivateApp />
						</Router>
					</AuthProvider>
				</NotificationProvider>
			</ThemeProvider>
		</QueryClientProvider>
	)
}

export default App
