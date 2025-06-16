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
			hexagon1: '#54C3C3',
			hexagon2: 'black',
		},
		white: {
			hexagon1: '#FFFFFF',
			hexagon2: '#54C3C3',
		},
		dark: {
			hexagon1: '#54C3C3',
			hexagon2: '#FFFFFF',
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
					viewBox='0 1800 2902 2082'
					xmlns='http://www.w3.org/2000/svg'
				>
					<polygon
						points='1011.17,1828.11 417.29,2856.83 802.78,3524.55 802.79,3524.56 1437.69,3524.56 1437.67,3524.55 1573.46,3524.55 1958.92,2856.92 1627.98,2283.72 2045.16,2283.72 2376.05,2856.83 1782.13,3885.53 593.9,3885.53 297.06,3371.34 0,2856.83 593.9,1828.11'
						fill={colorScheme.hexagon1}
					/>
					<polygon
						points='2308.21,1828.11 1119.99,1828.11 526.09,2856.83 856.95,3429.92 1274.24,3429.92 943.38,2856.83 1328.88,2189.08 2099.54,2189.08 2485.06,2856.83 1891.14,3885.53 2308.21,3885.53 2902.13,2856.83'
						fill={colorScheme.hexagon2}
					/>
				</svg>
			</Box>
		</Box>
	)
}

export default AnimatedLogo
