export const getFieldStyles = (compact: boolean) => ({
	textField: compact
		? {
				'& .MuiInputBase-root': {
					fontSize: '0.875rem',
					minHeight: '44px', // Уменьшаем высоту поля
				},
				'& .MuiInputBase-input': {
					padding: '10px 12px', // Уменьшаем внутренние отступы
				},
				'& .MuiInputLabel-root': {
					fontSize: '0.85rem', // Уменьшаем размер лейбла
				},
				'& .MuiFormHelperText-root': {
					margin: '2px 0 0',
					fontSize: '0.7rem',
				},
		  }
		: undefined,

	container: compact
		? {
				marginBottom: '8px',
		  }
		: {
				marginBottom: '15px',
		  },
})
