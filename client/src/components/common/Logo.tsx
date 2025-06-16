import React from 'react'

interface LogoProps {
	size?: number
	showText?: boolean
	variant?: 'default' | 'white' | 'dark'
	className?: string
}

const Logo: React.FC<LogoProps> = ({
	size = 40,
	showText = false,
	variant = 'default',
	className = '',
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
		<div className={`flex items-center ${className}`}>
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
		</div>
	)
}

export default Logo
