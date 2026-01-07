import React, { useState, useEffect, useCallback } from 'react'
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import {
	Box,
	Chip,
	Typography,
	IconButton,
	Tooltip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Stack,
	Switch,
	FormControlLabel,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import { UserService, User } from '../../../../services/userService'

interface UsersTableProps {
	onError?: (error: string) => void
}

interface EditUser {
	firstName: string
	lastName: string
	email: string
	role: 'admin' | 'user'
	isActive: boolean
	phone?: string
	bitrixUserId?: string
}

export const UsersTable: React.FC<UsersTableProps> = ({ onError }) => {
	const [users, setUsers] = useState<User[]>([])
	const [loading, setLoading] = useState(true)
	const [editDialog, setEditDialog] = useState<{
		open: boolean
		user: User | null
		isNew: boolean
	}>({ open: false, user: null, isNew: false })
	const [editData, setEditData] = useState<EditUser>({
		firstName: '',
		lastName: '',
		email: '',
		role: 'user',
		isActive: true,
	})
	const [password, setPassword] = useState('')
	const [saving, setSaving] = useState(false)

	const loadUsers = useCallback(async () => {
		setLoading(true)
		try {
			const data = await UserService.getAllUsers()
			setUsers(data || [])
		} catch (error: any) {
			onError?.(error.message || 'Ошибка загрузки пользователей')
		} finally {
			setLoading(false)
		}
	}, [onError])

	useEffect(() => {
		loadUsers()
	}, [loadUsers])

	const handleEdit = (user: User) => {
		setEditDialog({ open: true, user, isNew: false })
		setEditData({
			firstName: user.firstName || '',
			lastName: user.lastName || '',
			email: user.email,
			role: user.role,
			isActive: (user as any).isActive !== false,
			phone: (user as any).phone || '',
			bitrixUserId: (user as any).bitrixUserId || (user as any).bitrix_id || '',
		})
		setPassword('')
	}

	const handleAdd = () => {
		setEditDialog({ open: true, user: null, isNew: true })
		setEditData({
			firstName: '',
			lastName: '',
			email: '',
			role: 'user',
			isActive: true,
		})
		setPassword('')
	}

	const handleSave = async () => {
		setSaving(true)
		try {
			if (editDialog.isNew) {
				if (!password) {
					onError?.('Пароль обязателен для нового пользователя')
					setSaving(false)
					return
				}
				await UserService.createUser({
					...editData,
					password,
				} as any)
			} else if (editDialog.user) {
				const updateData: any = { ...editData }
				if (password) {
					updateData.password = password
				}
				await UserService.updateUser(editDialog.user._id || (editDialog.user as any).id, updateData)
			}
			setEditDialog({ open: false, user: null, isNew: false })
			loadUsers()
		} catch (error: any) {
			onError?.(error.message || 'Ошибка сохранения')
		} finally {
			setSaving(false)
		}
	}

	const handleDelete = async (id: string) => {
		if (!window.confirm('Удалить пользователя? Это действие необратимо.')) return
		try {
			await UserService.deleteUser(id)
			loadUsers()
		} catch (error: any) {
			onError?.(error.message || 'Ошибка удаления')
		}
	}

	const columns: GridColDef[] = [
		{
			field: 'id',
			headerName: 'ID',
			width: 80,
			renderCell: (params: GridRenderCellParams) => {
				const id = params.row.id || params.row._id
				return (
					<Typography variant='caption' sx={{ color: 'text.secondary' }}>
						{id?.slice(-4)}
					</Typography>
				)
			},
		},
		{
			field: 'email',
			headerName: 'Email',
			width: 220,
		},
		{
			field: 'firstName',
			headerName: 'Имя',
			width: 120,
		},
		{
			field: 'lastName',
			headerName: 'Фамилия',
			width: 120,
		},
		{
			field: 'role',
			headerName: 'Роль',
			width: 100,
			renderCell: (params: GridRenderCellParams) => (
				<Chip
					label={params.value === 'admin' ? 'Админ' : 'Пользователь'}
					size='small'
					color={params.value === 'admin' ? 'primary' : 'default'}
				/>
			),
		},
		{
			field: 'isActive',
			headerName: 'Активен',
			width: 100,
			renderCell: (params: GridRenderCellParams) => {
				const isActive = params.value !== false
				return (
					<Chip
						label={isActive ? 'Да' : 'Нет'}
						size='small'
						color={isActive ? 'success' : 'default'}
						variant='outlined'
					/>
				)
			},
		},
		{
			field: 'bitrixUserId',
			headerName: 'Bitrix ID',
			width: 100,
			renderCell: (params: GridRenderCellParams) => {
				const bitrixId = params.row.bitrixUserId || params.row.bitrix_id
				return (
					<Typography variant='caption' sx={{ color: 'text.secondary' }}>
						{bitrixId || '-'}
					</Typography>
				)
			},
		},
		{
			field: 'createdAt',
			headerName: 'Создан',
			width: 160,
			renderCell: (params: GridRenderCellParams) => (
				<Typography variant='caption'>
					{params.value ? new Date(params.value).toLocaleString('ru-RU') : '-'}
				</Typography>
			),
		},
		{
			field: 'actions',
			headerName: 'Действия',
			width: 100,
			sortable: false,
			renderCell: (params: GridRenderCellParams) => (
				<Stack direction='row' spacing={0.5}>
					<Tooltip title='Редактировать'>
						<IconButton size='small' onClick={() => handleEdit(params.row)}>
							<EditIcon fontSize='small' />
						</IconButton>
					</Tooltip>
					<Tooltip title='Удалить'>
						<IconButton
							size='small'
							color='error'
							onClick={() => handleDelete(params.row.id || params.row._id)}
						>
							<DeleteIcon fontSize='small' />
						</IconButton>
					</Tooltip>
				</Stack>
			),
		},
	]

	return (
		<Box>
			<Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
				<Button
					variant='contained'
					startIcon={<PersonAddIcon />}
					onClick={handleAdd}
				>
					Добавить пользователя
				</Button>
			</Box>

			<Box sx={{ height: 600, width: '100%' }}>
				<DataGrid
					rows={users}
					columns={columns}
					getRowId={row => row.id || row._id}
					loading={loading}
					pageSizeOptions={[25, 50, 100]}
					initialState={{
						pagination: { paginationModel: { pageSize: 25 } },
					}}
					disableRowSelectionOnClick
					sx={{
						'& .MuiDataGrid-cell': { paddingX: 1 },
						'& .MuiDataGrid-row:hover': {
							backgroundColor: 'rgba(0, 0, 0, 0.04)',
						},
					}}
				/>
			</Box>

			<Dialog
				open={editDialog.open}
				onClose={() => setEditDialog({ open: false, user: null, isNew: false })}
				maxWidth='sm'
				fullWidth
			>
				<DialogTitle>
					{editDialog.isNew ? 'Новый пользователь' : 'Редактирование пользователя'}
				</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							label='Email'
							type='email'
							value={editData.email}
							onChange={e => setEditData({ ...editData, email: e.target.value })}
							fullWidth
							required
						/>
						<Stack direction='row' spacing={2}>
							<TextField
								label='Имя'
								value={editData.firstName}
								onChange={e => setEditData({ ...editData, firstName: e.target.value })}
								fullWidth
							/>
							<TextField
								label='Фамилия'
								value={editData.lastName}
								onChange={e => setEditData({ ...editData, lastName: e.target.value })}
								fullWidth
							/>
						</Stack>
						<TextField
							label={editDialog.isNew ? 'Пароль' : 'Новый пароль (оставьте пустым)'}
							type='password'
							value={password}
							onChange={e => setPassword(e.target.value)}
							fullWidth
							required={editDialog.isNew}
						/>
						<Stack direction='row' spacing={2}>
							<FormControl fullWidth>
								<InputLabel>Роль</InputLabel>
								<Select
									value={editData.role}
									label='Роль'
									onChange={e => setEditData({ ...editData, role: e.target.value as 'admin' | 'user' })}
								>
									<MenuItem value='user'>Пользователь</MenuItem>
									<MenuItem value='admin'>Администратор</MenuItem>
								</Select>
							</FormControl>
							<TextField
								label='Телефон'
								value={editData.phone || ''}
								onChange={e => setEditData({ ...editData, phone: e.target.value })}
								fullWidth
							/>
						</Stack>
						<TextField
							label='Bitrix User ID'
							value={editData.bitrixUserId || ''}
							onChange={e => setEditData({ ...editData, bitrixUserId: e.target.value })}
							fullWidth
							helperText='ID пользователя в Битрикс24 для привязки'
						/>
						<FormControlLabel
							control={
								<Switch
									checked={editData.isActive}
									onChange={e => setEditData({ ...editData, isActive: e.target.checked })}
								/>
							}
							label='Активен'
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditDialog({ open: false, user: null, isNew: false })}>
						Отмена
					</Button>
					<Button onClick={handleSave} variant='contained' disabled={saving}>
						{saving ? 'Сохранение...' : 'Сохранить'}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	)
}
