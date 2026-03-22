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
		<div className={`flex items-center ${className}`}>
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
		</div>
	)
}

export default Logo
