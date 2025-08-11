export const getFieldStyles = (
	compact: boolean,
	isMobile: boolean = false
) => ({
	textField:
		compact || isMobile
			? {
					'& .MuiInputBase-root': {
						fontSize: isMobile ? '16px' : '0.875rem', // 16px минимум для iOS чтобы не было зума
						minHeight: isMobile ? '40px' : '44px', // Увеличил чуть-чуть для 16px шрифта
					},
					'& .MuiInputBase-input': {
						padding: isMobile ? '8px 8px' : '10px 12px', // Увеличил padding для мобильных под 16px шрифт
						fontSize: isMobile ? '16px' : 'inherit', // Принудительно 16px для iOS
					},
					'& .MuiInputLabel-root': {
						fontSize: isMobile ? '0.75rem' : '0.85rem',
						transform: isMobile
							? 'translate(8px, 8px) scale(1)'
							: 'translate(12px, 10px) scale(1)',
						'&.MuiInputLabel-shrink': {
							transform: isMobile
								? 'translate(8px, -6px) scale(0.75)'
								: 'translate(12px, -8px) scale(0.75)',
						},
					},
					'& .MuiFormHelperText-root': {
						margin: isMobile ? '1px 0 0' : '2px 0 0',
						fontSize: isMobile ? '0.65rem' : '0.7rem',
					},
					'& .MuiOutlinedInput-notchedOutline': {
						borderWidth: isMobile ? '1px' : '1px',
					},
					'& .MuiSelect-select': {
						padding: isMobile ? '6px 8px' : '10px 12px',
					},
			  }
			: undefined,

	container:
		compact || isMobile
			? {
					marginBottom: isMobile ? '6px' : '8px',
			  }
			: {
					marginBottom: '15px',
			  },
})
