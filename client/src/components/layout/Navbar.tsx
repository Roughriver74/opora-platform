import React from 'react'
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
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import HomeIcon from '@mui/icons-material/Home'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAuth } from '../../contexts/auth'

const Navbar: React.FC = () => {
	const { user, logout, isAuthenticated } = useAuth()
	const navigate = useNavigate()
	const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)

	const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget)
	}

	const handleClose = () => {
		setAnchorEl(null)
	}

	const handleLogout = async () => {
		await logout()
		handleClose()
		navigate('/login')
	}

	// Если пользователь не авторизован, показываем минимальную навигацию
	if (!isAuthenticated) {
		return (
			<AppBar position='static'>
				<Container maxWidth='xl'>
					<Toolbar disableGutters>
						<Typography
							variant='h6'
							noWrap
							component={RouterLink}
							to='/'
							sx={{
								mr: 2,
								display: 'flex',
								fontFamily: 'monospace',
								fontWeight: 700,
								letterSpacing: '.1rem',
								color: 'inherit',
								textDecoration: 'none',
								alignItems: 'center',
							}}
						>
							<img
								src='/logo.png'
								alt='Бетон-Экспресс'
								style={{ height: '40px', marginRight: '10px' }}
								onError={e => {
									e.currentTarget.style.display = 'none'
								}}
							/>
							БЕТОН-ЭКСПРЕСС
						</Typography>
					</Toolbar>
				</Container>
			</AppBar>
		)
	}

	return (
		<AppBar position='static'>
			<Container maxWidth='xl'>
				<Toolbar disableGutters>
					<Typography
						variant='h6'
						noWrap
						component={RouterLink}
						to='/'
						sx={{
							mr: 2,
							display: 'flex',
							fontFamily: 'monospace',
							fontWeight: 700,
							letterSpacing: '.1rem',
							color: 'inherit',
							textDecoration: 'none',
							alignItems: 'center',
						}}
					>
						<img
							src='/logo.png'
							alt='Бетон-Экспресс'
							style={{ height: '40px', marginRight: '10px' }}
							onError={e => {
								e.currentTarget.style.display = 'none'
							}}
						/>
						БЕТОН-ЭКСПРЕСС
					</Typography>

					<Box sx={{ flexGrow: 1 }} />

					<Box sx={{ display: 'flex', alignItems: 'center' }}>
						<Button
							component={RouterLink}
							to='/'
							color='inherit'
							startIcon={<HomeIcon />}
							sx={{ my: 2, display: 'flex' }}
						>
							Главная
						</Button>

						<Button
							component={RouterLink}
							to='/my-submissions'
							color='inherit'
							startIcon={<AssignmentIcon />}
							sx={{ my: 2, display: 'flex' }}
						>
							Мои заявки
						</Button>

						{user?.role === 'admin' && (
							<Button
								component={RouterLink}
								to='/admin'
								color='inherit'
								startIcon={<AdminPanelSettingsIcon />}
								sx={{ my: 2, display: 'flex' }}
							>
								Администрирование
							</Button>
						)}

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
				</Toolbar>
			</Container>
		</AppBar>
	)
}

export default Navbar
