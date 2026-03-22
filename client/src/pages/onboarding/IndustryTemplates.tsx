import React from 'react'
import {
	Box,
	Card,
	CardActionArea,
	CardContent,
	Typography,
} from '@mui/material'

export interface ModuleSelection {
	orders: boolean
	visits: boolean
}

interface IndustryTemplate {
	label: string
	modules: ModuleSelection
	description: string
}

export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
	pharma: {
		label: 'Фарма',
		modules: { orders: true, visits: true },
		description: 'Медпреды: визиты + заказы препаратов',
	},
	fmcg: {
		label: 'FMCG',
		modules: { orders: true, visits: true },
		description: 'Торговые представители: визиты + заказы',
	},
	construction: {
		label: 'Стройматериалы',
		modules: { orders: true, visits: false },
		description: 'Заказы стройматериалов',
	},
	equipment: {
		label: 'Оборудование',
		modules: { orders: true, visits: true },
		description: 'Продажа + сервисные визиты',
	},
	service: {
		label: 'Сервис',
		modules: { orders: false, visits: true },
		description: 'Выездной сервис и обслуживание',
	},
	other: {
		label: 'Другое',
		modules: { orders: true, visits: true },
		description: 'Настроить вручную',
	},
}

interface IndustryTemplatesProps {
	selectedIndustry: string
	onSelect: (industryKey: string, modules: ModuleSelection) => void
}

const IndustryTemplates: React.FC<IndustryTemplatesProps> = ({
	selectedIndustry,
	onSelect,
}) => {
	return (
		<Box>
			<Typography variant='subtitle2' color='text.secondary' gutterBottom>
				Шаблон по отрасли — автоматически настроит модули
			</Typography>
			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
					gap: 1.5,
					mt: 1,
				}}
			>
				{Object.entries(INDUSTRY_TEMPLATES).map(([key, template]) => {
					const isSelected = selectedIndustry === key
					return (
						<Card
							key={key}
							variant='outlined'
							sx={{
								borderColor: isSelected ? 'primary.main' : 'divider',
								borderWidth: isSelected ? 2 : 1,
								transition: 'border-color 0.15s, box-shadow 0.15s',
								boxShadow: isSelected ? 2 : 0,
							}}
						>
							<CardActionArea
								onClick={() => onSelect(key, template.modules)}
								sx={{ height: '100%' }}
							>
								<CardContent sx={{ py: 1.5, px: 2 }}>
									<Typography
										variant='subtitle2'
										fontWeight={isSelected ? 700 : 500}
										color={isSelected ? 'primary.main' : 'text.primary'}
									>
										{template.label}
									</Typography>
									<Typography variant='caption' color='text.secondary'>
										{template.description}
									</Typography>
								</CardContent>
							</CardActionArea>
						</Card>
					)
				})}
			</Box>
		</Box>
	)
}

export default IndustryTemplates
