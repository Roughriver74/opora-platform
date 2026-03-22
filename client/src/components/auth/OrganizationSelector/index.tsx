import React from 'react'
import {
	Box,
	Card,
	CardActionArea,
	CardContent,
	Container,
	Typography,
	Chip,
	CircularProgress,
} from '@mui/material'
import BusinessIcon from '@mui/icons-material/Business'
import { useAuth } from '../../../contexts/auth'
import { OrganizationRole } from '../../../types/organization'

const roleLabels: Record<OrganizationRole, string> = {
	org_admin: 'Администратор',
	manager: 'Менеджер',
	distributor: 'Дистрибьютор',
}

const roleColors: Record<OrganizationRole, 'primary' | 'default' | 'secondary'> = {
	org_admin: 'primary',
	manager: 'default',
	distributor: 'secondary',
}

export const OrganizationSelector: React.FC = () => {
	const { organizations, selectOrganization, isLoading } = useAuth()

	const handleSelect = async (orgId: string) => {
		await selectOrganization(orgId)
	}

	if (isLoading) {
		return (
			<Box
				display='flex'
				justifyContent='center'
				alignItems='center'
				minHeight='100vh'
			>
				<CircularProgress />
			</Box>
		)
	}

	return (
		<Container maxWidth='sm'>
			<Box
				display='flex'
				flexDirection='column'
				alignItems='center'
				justifyContent='center'
				minHeight='100vh'
				gap={3}
			>
				<Typography variant='h5' fontWeight={700} gutterBottom>
					Выберите организацию
				</Typography>
				<Typography variant='body1' color='text.secondary' sx={{ mb: 2 }}>
					Вы состоите в нескольких организациях. Выберите, с какой хотите
					работать.
				</Typography>

				{organizations.map(org => (
					<Card
						key={org.id}
						sx={{
							width: '100%',
							border: '1px solid',
							borderColor: 'divider',
							borderRadius: 2,
						}}
						elevation={0}
					>
						<CardActionArea onClick={() => handleSelect(org.id)}>
							<CardContent
								sx={{
									display: 'flex',
									alignItems: 'center',
									gap: 2,
									py: 2.5,
								}}
							>
								<BusinessIcon
									sx={{ fontSize: 40, color: 'primary.main' }}
								/>
								<Box sx={{ flexGrow: 1 }}>
									<Typography variant='subtitle1' fontWeight={600}>
										{org.name}
									</Typography>
									<Typography
										variant='body2'
										color='text.secondary'
									>
										{org.slug}
									</Typography>
								</Box>
								<Chip
									label={roleLabels[org.role] || org.role}
									color={roleColors[org.role] || 'default'}
									size='small'
									variant='outlined'
								/>
							</CardContent>
						</CardActionArea>
					</Card>
				))}
			</Box>
		</Container>
	)
}

export default OrganizationSelector
