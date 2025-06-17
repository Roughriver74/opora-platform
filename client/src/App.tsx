import React from 'react'
import { ThemeProvider, createTheme } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/auth'
import { PrivateApp } from './components/auth/PrivateApp'
import './App.css'

// Настройка темы MUI
const theme = createTheme({
	palette: {
		primary: {
			main: '#4c1130',
		},
		secondary: {
			main: '#f50057',
		},
	},
	typography: {
		fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
	},
})

// Создание клиента React Query
const queryClient = new QueryClient()

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider theme={theme}>
				<AuthProvider>
					<PrivateApp />
				</AuthProvider>
			</ThemeProvider>
		</QueryClientProvider>
	)
}

export default App
