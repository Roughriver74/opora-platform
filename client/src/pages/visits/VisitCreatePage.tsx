import React from 'react'
import { Box, Typography, Paper } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { visitService } from '../../services/visitService'
import { CreateVisitData } from '../../types/visit'
import { VisitForm } from '../../components/visits/VisitForm'

const VisitCreatePage: React.FC = () => {
	const navigate = useNavigate()

	const handleSubmit = async (data: CreateVisitData) => {
		await visitService.createVisit(data)
		navigate('/visits')
	}

	const handleCancel = () => {
		navigate('/visits')
	}

	return (
		<Box p={3} maxWidth={600} mx='auto'>
			<Typography variant='h5' fontWeight={600} mb={3}>
				Новый визит
			</Typography>
			<Paper variant='outlined' sx={{ p: 3 }}>
				<VisitForm onSubmit={handleSubmit} onCancel={handleCancel} />
			</Paper>
		</Box>
	)
}

export default VisitCreatePage
