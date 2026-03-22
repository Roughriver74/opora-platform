import React from 'react'
import { Card, CardContent, CardActionArea, Typography, Box } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { Visit } from '../../types/visit'
import { VisitStatusBadge } from './VisitStatusBadge'

interface VisitCardProps {
	visit: Visit
}

export const VisitCard: React.FC<VisitCardProps> = ({ visit }) => {
	const navigate = useNavigate()

	const formattedDate = new Date(visit.date).toLocaleString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})

	const companyName = visit.company?.name ?? visit.companyName ?? '—'
	const truncatedComment =
		visit.comment && visit.comment.length > 100
			? visit.comment.slice(0, 100) + '...'
			: visit.comment

	return (
		<Card variant='outlined'>
			<CardActionArea onClick={() => navigate(`/visits/${visit.id}`)}>
				<CardContent>
					<Box display='flex' justifyContent='space-between' alignItems='flex-start' mb={1}>
						<Typography variant='subtitle2' color='text.secondary'>
							{formattedDate}
						</Typography>
						<VisitStatusBadge status={visit.status} />
					</Box>
					<Typography variant='h6' gutterBottom noWrap>
						{companyName}
					</Typography>
					{visit.visitType && (
						<Typography variant='body2' color='text.secondary' gutterBottom>
							{visit.visitType}
						</Typography>
					)}
					{truncatedComment && (
						<Typography variant='body2' color='text.secondary'>
							{truncatedComment}
						</Typography>
					)}
				</CardContent>
			</CardActionArea>
		</Card>
	)
}
