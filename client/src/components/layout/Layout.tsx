import React from 'react'
import { Container, Box, CssBaseline } from '@mui/material'
import Navbar from './Navbar'

interface LayoutProps {
	children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'column',
				minHeight: '100vh',
				bgcolor: '#f8fafc',
			}}
		>
			<CssBaseline />
			<Navbar />

			{/* Основной контент без ограничений по ширине для больших форм */}
			<Box component='main' sx={{ flexGrow: 1, py: 0 }}>
				{children}
			</Box>

			{/* Компактный футер */}
			<Box
				component='footer'
				sx={{
					py: 2,
					px: 2,
					mt: 'auto',
					backgroundColor: '#1976d2',
					color: 'white',
					textAlign: 'center',
				}}
			>
				<Container maxWidth='lg'>
					© {new Date().getFullYear()} Бетон-Экспресс. Все права защищены.
				</Container>
			</Box>
		</Box>
	)
}

export default Layout
