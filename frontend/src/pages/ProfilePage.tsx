import React from 'react'
import {
	Box,
	Typography,
	Button,
	Avatar,
	Divider,
	Card,
	CardContent,
	CircularProgress,
	Stack,
	Chip,
	useTheme,
} from '@mui/material'
import {
	Person as PersonIcon,
	Email as EmailIcon,
	Badge as BadgeIcon,
	Business as BusinessIcon,
	AdminPanelSettings,
	Logout as LogoutIcon,
	Settings as SettingsIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ThemeToggle'

const getRoleLabel = (role: string): string => {
	switch (role) {
		case 'platform_admin':
			return 'Администратор платформы'
		case 'org_admin':
			return 'Администратор'
		case 'user':
			return 'Пользователь'
		default:
			return role
	}
}

const getRoleSx = (role: string) => {
	switch (role) {
		case 'platform_admin':
			return { bgcolor: 'error.main', color: '#fff' }
		case 'org_admin':
			return { bgcolor: 'primary.main', color: '#fff' }
		case 'user':
			return { bgcolor: 'success.main', color: '#fff' }
		default:
			return {}
	}
}

export const ProfilePage: React.FC = () => {
	const theme = useTheme()
	const navigate = useNavigate()
	const { user, isLoading, logout } = useAuth()

	const handleLogout = () => {
		logout()
	}

	const handleAdminPanelClick = () => {
		navigate('/admin/field-mappings')
	}

	if (isLoading) {
		return (
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: '80vh',
				}}
			>
				<CircularProgress />
				<Typography sx={{ ml: 2 }}>Загрузка профиля...</Typography>
			</Box>
		)
	}

	if (!user) {
		return (
			<Box sx={{ p: 3 }}>
				<Typography color='error'>Не удалось загрузить профиль</Typography>
			</Box>
		)
	}

	const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
	const initials = user.first_name
		? user.first_name.charAt(0).toUpperCase()
		: user.email.charAt(0).toUpperCase()

	return (
		<Box sx={{ pb: 10, minHeight: '100%', bgcolor: 'background.default' }}>
			{/* Header */}
			<Box
				sx={{
					px: 2,
					pt: 1.5,
					pb: 1.5,
					position: 'sticky',
					top: 0,
					zIndex: 100,
					bgcolor: 'background.paper',
					boxShadow: (theme: any) => theme.palette.mode === 'light' ? '0 1px 3px rgba(0,0,0,0.05)' : '0 1px 3px rgba(0,0,0,0.2)',
					mb: 2,
				}}
			>
				<Typography variant='h6' sx={{ fontWeight: 600 }}>
					Профиль
				</Typography>
			</Box>

			<Box sx={{ px: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
				{/* Profile Card */}
				<Card
					variant='outlined'
					sx={{
						borderRadius: 3,
						border: 'none',
						boxShadow: (theme: any) => theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.04)' : '0 2px 8px rgba(0,0,0,0.2)',
						mb: 3,
					}}
				>
					<CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								gap: 2,
								mb: 2.5,
							}}
						>
							<Avatar
								sx={{
									width: 64,
									height: 64,
									bgcolor: 'primary.main',
									fontSize: '1.5rem',
									fontWeight: 600,
								}}
							>
								{initials}
							</Avatar>
							<Box sx={{ minWidth: 0 }}>
								<Typography
									variant='h6'
									sx={{ fontWeight: 600, lineHeight: 1.3 }}
									noWrap
								>
									{displayName}
								</Typography>
								<Chip
									size='small'
									label={getRoleLabel(user.role)}
									sx={{
										mt: 0.5,
										fontWeight: 600,
										fontSize: '0.7rem',
										height: 22,
										...getRoleSx(user.role),
									}}
								/>
							</Box>
						</Box>

						<Divider sx={{ my: 2 }} />

						{/* User info rows */}
						<Stack spacing={1.5}>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
								<EmailIcon
									sx={{ color: 'text.secondary', fontSize: 20 }}
								/>
								<Box>
									<Typography
										variant='caption'
										color='text.secondary'
										sx={{ lineHeight: 1 }}
									>
										Email
									</Typography>
									<Typography variant='body2' sx={{ fontWeight: 500 }}>
										{user.email}
									</Typography>
								</Box>
							</Box>

							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
								<BadgeIcon
									sx={{ color: 'text.secondary', fontSize: 20 }}
								/>
								<Box>
									<Typography
										variant='caption'
										color='text.secondary'
										sx={{ lineHeight: 1 }}
									>
										Роль
									</Typography>
									<Typography variant='body2' sx={{ fontWeight: 500 }}>
										{getRoleLabel(user.role)}
									</Typography>
								</Box>
							</Box>

							{user.organization_name && (
								<Box
									sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
								>
									<BusinessIcon
										sx={{ color: 'text.secondary', fontSize: 20 }}
									/>
									<Box>
										<Typography
											variant='caption'
											color='text.secondary'
											sx={{ lineHeight: 1 }}
										>
											Организация
										</Typography>
										<Typography
											variant='body2'
											sx={{ fontWeight: 500 }}
										>
											{user.organization_name}
										</Typography>
									</Box>
								</Box>
							)}

							{user.regions && user.regions.length > 0 && (
								<Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
									<PersonIcon
										sx={{ color: 'text.secondary', fontSize: 20, mt: 0.25 }}
									/>
									<Box>
										<Typography
											variant='caption'
											color='text.secondary'
											sx={{ lineHeight: 1 }}
										>
											Регионы
										</Typography>
										<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
											{user.regions.map(region => (
												<Chip
													key={region}
													label={region}
													size='small'
													variant='outlined'
													sx={{ fontSize: '0.75rem', height: 22 }}
												/>
											))}
										</Box>
									</Box>
								</Box>
							)}
						</Stack>
					</CardContent>
				</Card>

				{/* Settings Card */}
				<Card
					variant='outlined'
					sx={{
						borderRadius: 3,
						border: 'none',
						boxShadow: (theme: any) => theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.04)' : '0 2px 8px rgba(0,0,0,0.2)',
						mb: 3,
					}}
				>
					<CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
						<Typography
							variant='subtitle1'
							sx={{
								fontWeight: 600,
								mb: 2,
								display: 'flex',
								alignItems: 'center',
								gap: 1,
							}}
						>
							<SettingsIcon sx={{ fontSize: 20 }} />
							Настройки
						</Typography>

						<Box
							sx={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								py: 1,
							}}
						>
							<Typography variant='body2' sx={{ fontWeight: 500 }}>
								Тема оформления
							</Typography>
							<ThemeToggle size='small' />
						</Box>
					</CardContent>
				</Card>

				{/* Actions */}
				<Stack spacing={1.5}>
					{user.is_admin && (
						<Button
							variant='outlined'
							fullWidth
							onClick={handleAdminPanelClick}
							startIcon={<AdminPanelSettings />}
							sx={{
								borderRadius: 2,
								textTransform: 'none',
								fontWeight: 500,
								py: 1.25,
							}}
						>
							Админ панель
						</Button>
					)}

					<Button
						variant='contained'
						color='error'
						fullWidth
						onClick={handleLogout}
						startIcon={<LogoutIcon />}
						sx={{
							borderRadius: 2,
							textTransform: 'none',
							fontWeight: 500,
							py: 1.25,
						}}
					>
						Выйти из системы
					</Button>
				</Stack>
			</Box>
		</Box>
	)
}
