import React from 'react'

interface LogoProps {
	size?: number
	showText?: boolean
	variant?: 'default' | 'white' | 'dark'
	className?: string
}

const Logo: React.FC<LogoProps> = ({
	size = 40,
	showText = true,
	variant = 'default',
	className = '',
}) => {
	const colors = {
		default: {
			bg: '#2563eb',
			hexagon: '#ffffff',
			innerHexagon: '#2563eb',
			text: '#ffffff',
			brandText: '#2563eb',
		},
		white: {
			bg: '#ffffff',
			hexagon: '#2563eb',
			innerHexagon: '#ffffff',
			text: '#2563eb',
			brandText: '#ffffff',
		},
		dark: {
			bg: '#1f2937',
			hexagon: '#ffffff',
			innerHexagon: '#1f2937',
			text: '#ffffff',
			brandText: '#ffffff',
		},
	}

	const colorScheme = colors[variant]

	return (
		<div className={`flex items-center ${className}`}>
			<svg
				width={size}
				height={size}
				viewBox='0 0 32 32'
				xmlns='http://www.w3.org/2000/svg'
				style={{ marginRight: showText ? '8px' : '0' }}
			>
				{/* Фон */}
				<rect width='32' height='32' fill={colorScheme.bg} rx='4' />

				{/* Шестиугольник */}
				<polygon
					points='16,6 24,11 24,21 16,26 8,21 8,11'
					fill={colorScheme.hexagon}
				/>

				{/* Внутренний шестиугольник */}
				<polygon
					points='16,12 20,14.5 20,17.5 16,20 12,17.5 12,14.5'
					fill={colorScheme.innerHexagon}
				/>

				{/* Буква Б */}
				<text
					x='16'
					y='16'
					fontFamily='Arial, sans-serif'
					fontSize='6'
					fontWeight='bold'
					textAnchor='middle'
					dominantBaseline='central'
					fill={colorScheme.text}
				>
					Б
				</text>
			</svg>

			{showText && (
				<span
					style={{
						color: colorScheme.brandText,
						fontSize: `${size * 0.6}px`,
						fontWeight: 'bold',
						fontFamily: 'system-ui, -apple-system, sans-serif',
					}}
				>
					БетонЭкспресс
				</span>
			)}
		</div>
	)
}

export default Logo
