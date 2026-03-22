import React from 'react'
import { Chip } from '@mui/material'
import { VisitStatus } from '../../types/visit'

interface VisitStatusBadgeProps {
	status: VisitStatus
}

const statusConfig: Record<VisitStatus, { label: string; color: 'info' | 'success' | 'default' | 'error' }> = {
	planned: { label: 'Запланирован', color: 'info' },
	completed: { label: 'Выполнен', color: 'success' },
	cancelled: { label: 'Отменён', color: 'default' },
	failed: { label: 'Неудачный', color: 'error' },
}

export const VisitStatusBadge: React.FC<VisitStatusBadgeProps> = ({ status }) => {
	const config = statusConfig[status] ?? { label: status, color: 'default' as const }
	return <Chip label={config.label} color={config.color} size='small' />
}
