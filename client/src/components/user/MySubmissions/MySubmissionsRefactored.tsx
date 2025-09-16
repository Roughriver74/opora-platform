import React from 'react'
import { Box, Typography, Paper, Alert } from '@mui/material'
import { useMySubmissions } from './hooks/useMySubmissions'
import { SubmissionsFilters } from './components/SubmissionsFilters'
import { SubmissionsTable } from './components/SubmissionsTable'

const MySubmissions = () => {
	const {
		// Состояние
		submissions,
		loading,
		error,
		page,
		rowsPerPage,
		total,
		filters,
		bitrixStages,
		users,
		isAdmin,

		// Методы
		handleEditSubmission,
		handleCopySubmission,
		handleCancelSubmission,
		handleStatusChange,
		handleFilterChange,
		handlePageChange,
		handleRowsPerPageChange,
	} = useMySubmissions()

	if (loading && submissions.length === 0) {
		return (
			<Box
				display='flex'
				justifyContent='center'
				alignItems='center'
				minHeight='400px'
			>
				<Typography>Загрузка ваших заявок...</Typography>
			</Box>
		)
	}

	return (
		<Box>
			<Typography variant='h4' gutterBottom>
				Мои заявки
			</Typography>

			<Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
				{isAdmin
					? 'Здесь можно просматривать все заявки, изменять их статусы и редактировать данные.'
					: 'Здесь можно просматривать ваши заявки, изменять их статусы и редактировать данные.'}
			</Typography>

			{error && (
				<Alert severity='error' sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}

			{/* Фильтры */}
			<SubmissionsFilters
				filters={filters}
				onFilterChange={handleFilterChange}
				bitrixStages={bitrixStages}
				users={users}
				isAdmin={isAdmin}
			/>

			{submissions.length === 0 ? (
				<Paper sx={{ p: 4, textAlign: 'center' }}>
					<Typography variant='h6' color='textSecondary'>
						У вас пока нет заявок
					</Typography>
					<Typography variant='body2' color='textSecondary' sx={{ mt: 1 }}>
						Заполните форму заказа, чтобы создать первую заявку
					</Typography>
				</Paper>
			) : (
				<SubmissionsTable
					submissions={submissions}
					bitrixStages={bitrixStages}
					onEditSubmission={handleEditSubmission}
					onCopySubmission={handleCopySubmission}
					onCancelSubmission={handleCancelSubmission}
					onStatusChange={handleStatusChange}
					page={page}
					rowsPerPage={rowsPerPage}
					total={total}
					onPageChange={handlePageChange}
					onRowsPerPageChange={handleRowsPerPageChange}
				/>
			)}
		</Box>
	)
}

export default MySubmissions
