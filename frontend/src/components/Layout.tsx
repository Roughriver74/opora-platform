import React from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Menu, MenuItem, useMediaQuery, useTheme, Tooltip, Modal, Divider } from '@mui/material';
import { Menu as MenuIcon, Home, Business, DateRange, Person, AccountCircle, ExitToApp, Search as SearchIcon, ContactPhone, CalendarMonth, Settings, DeleteForever } from '@mui/icons-material';
// Используем контекст аутентификации вместо хука
import { useAuth } from '../context/AuthContext';
import { useNavigate, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { ClinicSearchDialog } from './ClinicSearchDialog';
import { BitrixCompany } from '../services/clinicService';
import VisitCalendar from './VisitCalendar';

interface LayoutProps {
	children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [searchDialogOpen, setSearchDialogOpen] = useState(false);
	const [calendarOpen, setCalendarOpen] = useState(false);
	const navigate = useNavigate();
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
	// Используем контекст аутентификации
	const { user, isLoading } = useAuth();
	const isAdmin = user?.is_admin || false;



	const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget);
	};

	const handleClose = () => {
		setAnchorEl(null);
	};

	const handleProfile = () => {
		handleClose();
		navigate('/profile');
	};

	const handleLogout = () => {
		handleClose();
		localStorage.removeItem('token');
		navigate('/auth');
	};

	const handleCalendarToggle = () => {
		setCalendarOpen(!calendarOpen);
	};

	// Обработчик выбора клиники из поиска
	const handleSelectClinic = (clinic: BitrixCompany) => {
		setSearchDialogOpen(false);
		// Перенаправляем на страницу компании
		// Передаем дополнительные параметры для получения данных из Bitrix24
		navigate(`/companies/${clinic.ID}/edit`, {
			state: {
				bitrixId: clinic.ID,
				bitrixData: clinic
			}
		});
	};

	// Обработчик создания визита для клиники
	const handleCreateVisit = (clinic: BitrixCompany) => {
		setSearchDialogOpen(false);
		// Перенаправляем на страницу создания визита с предварительно выбранной клиникой
		navigate(`/visits/new/${clinic.ID}`, {
			state: {
				companyId: clinic.ID,
				companyName: clinic.TITLE,
				companyInn: clinic.UF_CRM_1741267701427
			}
		});
	};

	const menuItems = [
		{ text: 'Главная', icon: <Home />, path: '/' },
		{ text: 'Компании', icon: <Business />, path: '/companies' },
		{ text: 'Визиты', icon: <DateRange />, path: '/visits' },
	];

	// Административные пункты меню
	const adminMenuItems = [
		{ text: 'Администрирование', icon: <ContactPhone />, path: '/admin/field-mapping' },
		{ text: 'Глобальные настройки', icon: <Settings />, path: '/admin/settings' },
		{ text: 'Удаление визитов', icon: <DeleteForever />, path: '/admin/delete-visits' },
	];

	return (
		<Box
			sx={{
				display: 'flex',
				minHeight: '100vh',
				bgcolor: 'background.default',
			}}
		>
			<AppBar
				position='fixed'
				sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}
			>
				<Toolbar>
					<IconButton
						color='inherit'
						edge='start'
						onClick={() => setDrawerOpen(!drawerOpen)}
						sx={{ mr: 2 }}
					>
						<MenuIcon />
					</IconButton>
					<Typography variant='h6' noWrap component='div' sx={{ flexGrow: 1 }}>
						ОПОРА
					</Typography>

					{/* Кнопка календаря визитов */}
					<Tooltip title='Календарь визитов'>
						<IconButton
							size='large'
							aria-label='calendar of visits'
							onClick={handleCalendarToggle}
							color='inherit'
							sx={{ mr: 1 }}
						>
							<CalendarMonth />
						</IconButton>
					</Tooltip>

					{/* Кнопка поиска 
          <Tooltip title="Поиск клиники">
            <IconButton
              size="large"
              aria-label="search clinics"
              onClick={() => setSearchDialogOpen(true)}
              color="inherit"
              sx={{ mr: 1 }}
            >
              <SearchIcon />
            </IconButton>
          </Tooltip>*/}

					{/* Профиль пользователя */}
					<div>
						<IconButton
							size='large'
							aria-label='account of current user'
							aria-controls='menu-appbar'
							aria-haspopup='true'
							onClick={handleMenu}
							color='inherit'
						>
							<AccountCircle />
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
							<MenuItem onClick={handleProfile}>Профиль</MenuItem>
							<MenuItem onClick={handleLogout}>Выйти</MenuItem>
						</Menu>
					</div>
				</Toolbar>
			</AppBar>

			<Drawer
				variant='temporary'
				open={drawerOpen}
				onClose={() => setDrawerOpen(false)}
				sx={{
					width: isMobile ? 200 : 240,
					flexShrink: 0,
					'& .MuiDrawer-paper': {
						width: isMobile ? 200 : 240,
						boxSizing: 'border-box',
					},
				}}
			>
				<Toolbar />
				<List>
					{menuItems.map(item => (
						<ListItem key={item.text} disablePadding>
							<ListItemButton
								onClick={() => {
									navigate(item.path)
									setDrawerOpen(false)
								}}
							>
								<ListItemIcon>{item.icon}</ListItemIcon>
								<ListItemText primary={item.text} />
							</ListItemButton>
						</ListItem>
					))}

					{isAdmin && (
						<>
							<Divider sx={{ my: 1 }} />
							<Typography
								variant='subtitle2'
								sx={{ px: 2, py: 1, color: 'text.secondary' }}
							>
								Администрирование
							</Typography>
							{adminMenuItems.map(item => (
								<ListItem key={item.text} disablePadding>
									<ListItemButton
										onClick={() => {
											navigate(item.path)
											setDrawerOpen(false)
										}}
									>
										<ListItemIcon>{item.icon}</ListItemIcon>
										<ListItemText primary={item.text} />
									</ListItemButton>
								</ListItem>
							))}
						</>
					)}
				</List>
			</Drawer>

			<Box component='main' sx={{ flexGrow: 1, p: isMobile ? 1.5 : 3 }}>
				<Toolbar />
				{/* Если есть children, используем их, иначе используем Outlet для маршрутизации */}
				{children ? children : <Outlet />}
			</Box>

			{/* Диалог поиска клиник */}
			<ClinicSearchDialog
				open={searchDialogOpen}
				onClose={() => setSearchDialogOpen(false)}
				onSelectClinic={handleSelectClinic}
				onCreateVisit={handleCreateVisit}
			/>

			{/* Модальное окно календаря визитов */}
			<Modal
				open={calendarOpen}
				onClose={() => setCalendarOpen(false)}
				aria-labelledby='visit-calendar-modal'
				sx={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					p: 2,
				}}
			>
				<VisitCalendar
					openInModal={true}
					onClose={() => setCalendarOpen(false)}
				/>
			</Modal>
		</Box>
	)
};
