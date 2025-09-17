import React, { useCallback } from 'react'
import {
	AppBar,
	Box,
	Toolbar,
	Typography,
	Button,
	Container,
	Avatar,
	Menu,
	MenuItem,
	IconButton,
	Drawer,
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
	useMediaQuery,
	useTheme,
} from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import DashboardIcon from '@mui/icons-material/Dashboard'
import HomeIcon from '@mui/icons-material/Home'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import { useAuth } from '../../contexts/auth'
import Logo from '../common/Logo'

const Navbar: React.FC = () => {
	const { user, logout, isAuthenticated } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('md'))

	const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
	const [mobileOpen, setMobileOpen] = React.useState(false)

	const handleMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget)
	}, [])

	const handleClose = useCallback(() => {
		setAnchorEl(null)
	}, [])

	const handleMobileToggle = useCallback(() => {
		setMobileOpen(prev => !prev)
	}, [])

	const handleLogout = useCallback(async () => {
		await logout()
		handleClose()
		setMobileOpen(false)
		navigate('/')
	}, [logout, handleClose, navigate])

	// Обработчик клика по навигационным элементам
	const handleNavClick = useCallback(
		(path: string) => {
			// Закрываем мобильное меню
			setMobileOpen(false)

			// Попробуем обычную навигацию
			navigate(path)

			// Если navigate не работает, используем window.location как fallback
			setTimeout(() => {
				if (location.pathname !== path) {
					window.location.href = path
				}
			}, 100)
		},
		[navigate, location.pathname]
	)

	const menuItems = [
		{ text: 'Главная', icon: <HomeIcon />, path: '/' },
		{ text: 'Мои заявки', icon: <AssignmentIcon />, path: '/my-submissions' },
	]

	if (user?.role === 'admin') {
		menuItems.push({
			text: 'Дашборд',
			icon: <DashboardIcon />,
			path: '/dashboard',
		})
		menuItems.push({
			text: 'Администрирование',
			icon: <AdminPanelSettingsIcon />,
			path: '/admin',
		})
	}

	const drawer = (
		<Box sx={{ width: 250 }}>
			<Box
				sx={{
					p: 2,
					display: 'flex',
					alignItems: 'center',
					borderBottom: 1,
					borderColor: 'divider',
				}}
			>
				<Logo size={32} variant='default' />
			</Box>
			<List>
				{menuItems.map(item => (
					<ListItem
						key={item.text}
						component='div'
						onClick={() => {
							setMobileOpen(false)
							handleNavClick(item.path)
						}}
						sx={{
							textDecoration: 'none',
							color: 'inherit',
							cursor: 'pointer',
							// Подсвечиваем активную страницу
							backgroundColor:
								location.pathname === item.path
									? 'rgba(0,0,0,0.1)'
									: 'transparent',
							'&:hover': {
								backgroundColor: 'rgba(0,0,0,0.1)',
							},
						}}
					>
						<ListItemIcon>{item.icon}</ListItemIcon>
						<ListItemText primary={item.text} />
					</ListItem>
				))}
				<ListItem onClick={handleLogout} sx={{ cursor: 'pointer' }}>
					<ListItemIcon>
						<LogoutIcon />
					</ListItemIcon>
					<ListItemText primary='Выйти' />
				</ListItem>
			</List>
		</Box>
	)

	// Если пользователь не авторизован, показываем минимальную навигацию
	if (!isAuthenticated) {
		return (
			<AppBar position='static' sx={{ zIndex: 1100 }}>
				<Container maxWidth='xl'>
					<Toolbar disableGutters>
						<Typography
							variant='h6'
							noWrap
							component='div'
							onClick={() => navigate('/')}
							sx={{
								mr: 2,
								display: 'flex',
								fontFamily: 'monospace',
								fontWeight: 700,
								letterSpacing: '.1rem',
								color: 'inherit',
								textDecoration: 'none',
								alignItems: 'center',
								flexGrow: 1,
								cursor: 'pointer',
							}}
						>
							<Logo size={isMobile ? 32 : 40} variant='white' />
						</Typography>
					</Toolbar>
				</Container>
			</AppBar>
		)
	}

	return (
		<>
			<AppBar position='static' sx={{ zIndex: 1100 }}>
				<Container maxWidth='xl'>
					<Toolbar disableGutters>
						<Typography
							variant='h6'
							noWrap
							component='div'
							onClick={() => navigate('/')}
							sx={{
								mr: 2,
								display: 'flex',
								fontFamily: 'monospace',
								fontWeight: 700,
								letterSpacing: '.1rem',
								color: 'inherit',
								textDecoration: 'none',
								alignItems: 'center',
								flexGrow: isMobile ? 1 : 0,
								cursor: 'pointer',
							}}
						>
							<Logo size={isMobile ? 32 : 40} variant='white' />
						</Typography>

						{!isMobile && <Box sx={{ flexGrow: 1 }} />}

						{isMobile ? (
							<IconButton
								color='inherit'
								aria-label='open drawer'
								edge='end'
								onClick={handleMobileToggle}
							>
								<MenuIcon />
							</IconButton>
						) : (
							<Box sx={{ display: 'flex', alignItems: 'center' }}>
								{menuItems.map(item => (
									<Button
										key={item.text}
										color='inherit'
										startIcon={item.icon}
										onClick={() => handleNavClick(item.path)}
										sx={{
											my: 2,
											display: 'flex',
											mx: 1,
											// Подсвечиваем активную страницу
											backgroundColor:
												location.pathname === item.path
													? 'rgba(255,255,255,0.1)'
													: 'transparent',
											'&:hover': {
												backgroundColor: 'rgba(255,255,255,0.1)',
											},
										}}
									>
										{item.text}
									</Button>
								))}

								{/* Меню пользователя */}
								<Box sx={{ ml: 2 }}>
									<IconButton
										size='large'
										aria-label='account of current user'
										aria-controls='menu-appbar'
										aria-haspopup='true'
										onClick={handleMenu}
										color='inherit'
									>
										<AccountCircleIcon />
									</IconButton>
									<Menu
										id='menu-appbar'
										anchorEl={anchorEl}
										anchorOrigin={{
											vertical: 'top',
											horizontal: 'right',
										}}
										keepMounted
										transformOrigin={{
											vertical: 'top',
											horizontal: 'right',
										}}
										open={Boolean(anchorEl)}
										onClose={handleClose}
									>
										<MenuItem disabled>
											<Typography variant='body2'>
												{user?.fullName || user?.email || 'Пользователь'}
											</Typography>
										</MenuItem>
										<MenuItem onClick={handleLogout}>
											<LogoutIcon sx={{ mr: 1 }} />
											Выйти
										</MenuItem>
									</Menu>
								</Box>
							</Box>
						)}
					</Toolbar>
				</Container>
			</AppBar>

			{/* Мобильное меню */}
			<Drawer
				variant='temporary'
				anchor='right'
				open={mobileOpen}
				onClose={handleMobileToggle}
				sx={{ zIndex: 1200 }}
				ModalProps={{
					keepMounted: true, // Better open performance on mobile.
				}}
			>
				{drawer}
			</Drawer>
		</>
	)
}

export default Navbar
