import React, { useCallback } from 'react'
import {
	AppBar,
	Box,
	Toolbar,
	Typography,
	Button,
	Container,
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
	Chip,
	Divider,
	ListSubheader,
} from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import DashboardIcon from '@mui/icons-material/Dashboard'
import HomeIcon from '@mui/icons-material/Home'
import AssignmentIcon from '@mui/icons-material/Assignment'
import EventNoteIcon from '@mui/icons-material/EventNote'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import BusinessIcon from '@mui/icons-material/Business'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { useAuth } from '../../contexts/auth'
import Logo from '../common/Logo'

const Navbar: React.FC = () => {
	const {
		user,
		logout,
		isAuthenticated,
		currentOrganization,
		organizations,
		selectOrganization,
	} = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('md'))

	const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
	const [orgAnchorEl, setOrgAnchorEl] = React.useState<null | HTMLElement>(null)
	const [mobileOpen, setMobileOpen] = React.useState(false)

	const handleMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget)
	}, [])

	const handleClose = useCallback(() => {
		setAnchorEl(null)
	}, [])

	const handleOrgMenuOpen = useCallback(
		(event: React.MouseEvent<HTMLElement>) => {
			setOrgAnchorEl(event.currentTarget)
		},
		[]
	)

	const handleOrgMenuClose = useCallback(() => {
		setOrgAnchorEl(null)
	}, [])

	const handleOrgSwitch = useCallback(
		async (orgId: string) => {
			handleOrgMenuClose()
			await selectOrganization(orgId)
		},
		[selectOrganization, handleOrgMenuClose]
	)

	const handleMobileToggle = useCallback(() => {
		setMobileOpen(prev => !prev)
	}, [])

	const handleLogout = useCallback(async () => {
		await logout()
		handleClose()
		setMobileOpen(false)
		navigate('/my-submissions')
	}, [logout, handleClose, navigate])

	// Обработчик клика по навигационным элементам
	const handleNavClick = useCallback(
		(path: string) => {
			setMobileOpen(false)

			navigate(path)

			setTimeout(() => {
				if (location.pathname !== path) {
					window.location.href = path
				}
			}, 100)
		},
		[navigate, location.pathname]
	)

	const menuItems = [
		{ text: 'Мои заявки', icon: <AssignmentIcon />, path: '/my-submissions' },
		{ text: 'Новая заявка', icon: <HomeIcon />, path: '/' },
		{ text: 'Визиты', icon: <EventNoteIcon />, path: '/visits' },
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

	const hasMultipleOrgs = organizations.length > 1

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
			{currentOrganization && (
				<Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
					<Typography variant='caption' color='text.secondary'>
						Организация
					</Typography>
					<Typography variant='body2' fontWeight={600}>
						{currentOrganization.name}
					</Typography>
				</Box>
			)}
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
				{hasMultipleOrgs && (
					<>
						<Divider />
						<ListSubheader>Переключить организацию</ListSubheader>
						{organizations.map(org => (
							<ListItem
								key={org.id}
								component='div'
								onClick={() => {
									setMobileOpen(false)
									handleOrgSwitch(org.id)
								}}
								sx={{
									cursor: 'pointer',
									backgroundColor:
										currentOrganization?.id === org.id
											? 'rgba(0,0,0,0.08)'
											: 'transparent',
									'&:hover': {
										backgroundColor: 'rgba(0,0,0,0.1)',
									},
								}}
							>
								<ListItemIcon>
									<BusinessIcon />
								</ListItemIcon>
								<ListItemText
									primary={org.name}
									secondary={org.slug}
								/>
							</ListItem>
						))}
					</>
				)}
				<Divider />
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
							onClick={() => navigate('/my-submissions')}
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

						{/* Название текущей организации */}
						{!isMobile && currentOrganization && (
							<Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
								{hasMultipleOrgs ? (
									<Chip
										icon={<BusinessIcon />}
										label={currentOrganization.name}
										onClick={handleOrgMenuOpen}
										onDelete={handleOrgMenuOpen}
										deleteIcon={<SwapHorizIcon />}
										variant='outlined'
										size='small'
										sx={{
											color: 'white',
											borderColor: 'rgba(255,255,255,0.4)',
											'& .MuiChip-icon': { color: 'white' },
											'& .MuiChip-deleteIcon': {
												color: 'rgba(255,255,255,0.7)',
											},
											'&:hover': {
												borderColor: 'rgba(255,255,255,0.7)',
											},
										}}
									/>
								) : (
									<Chip
										icon={<BusinessIcon />}
										label={currentOrganization.name}
										variant='outlined'
										size='small'
										sx={{
											color: 'white',
											borderColor: 'rgba(255,255,255,0.4)',
											'& .MuiChip-icon': { color: 'white' },
										}}
									/>
								)}
								{/* Меню переключения организаций */}
								<Menu
									anchorEl={orgAnchorEl}
									open={Boolean(orgAnchorEl)}
									onClose={handleOrgMenuClose}
									anchorOrigin={{
										vertical: 'bottom',
										horizontal: 'left',
									}}
								>
									{organizations.map(org => (
										<MenuItem
											key={org.id}
											selected={
												currentOrganization?.id === org.id
											}
											onClick={() => handleOrgSwitch(org.id)}
										>
											<ListItemIcon>
												<BusinessIcon fontSize='small' />
											</ListItemIcon>
											<ListItemText
												primary={org.name}
												secondary={org.slug}
											/>
										</MenuItem>
									))}
								</Menu>
							</Box>
						)}

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
					keepMounted: true,
				}}
			>
				{drawer}
			</Drawer>
		</>
	)
}

export default Navbar
