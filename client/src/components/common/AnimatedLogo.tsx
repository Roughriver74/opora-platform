import React from 'react'
import { keyframes } from '@emotion/react'
import { Box } from '@mui/material'

interface AnimatedLogoProps {
	size?: number
	variant?: 'default' | 'white' | 'dark'
}

const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`

const fadeIn = keyframes`
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
`

const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
	size = 80,
	variant = 'white',
}) => {
	const colors = {
		default: {
			primary: '#1B4965',
			accent: '#5FA8D3',
		},
		white: {
			primary: '#FFFFFF',
			accent: '#5FA8D3',
		},
		dark: {
			primary: '#1B4965',
			accent: '#FFFFFF',
		},
	}

	const colorScheme = colors[variant]

	return (
		<Box
			sx={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				animation: `${fadeIn} 0.8s ease-out`,
			}}
		>
			<Box
				sx={{
					animation: `${pulse} 2s ease-in-out infinite`,
				}}
			>
				<svg
					width={size}
					height={size}
					viewBox='0 0 64 64'
					xmlns='http://www.w3.org/2000/svg'
				>
					{/* Base slab */}
					<rect x='6' y='54' width='52' height='7' rx='2' fill={colorScheme.primary} />
					{/* Plinth */}
					<rect x='12' y='48' width='40' height='7' rx='1' fill={colorScheme.primary} />
					{/* Shaft */}
					<rect x='20' y='14' width='24' height='35' fill={colorScheme.accent} />
					{/* Capital */}
					<rect x='12' y='8' width='40' height='7' rx='1' fill={colorScheme.primary} />
					{/* Abacus top */}
					<rect x='6' y='3' width='52' height='6' rx='2' fill={colorScheme.primary} />
				</svg>
			</Box>
		</Box>
	)
}

export default AnimatedLogo
