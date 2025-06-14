export const getFieldStyles = (compact: boolean) => ({
  textField: compact ? {
    '& .MuiInputBase-root': {
      fontSize: '0.875rem'
    },
    '& .MuiFormHelperText-root': {
      margin: '2px 0 0',
      fontSize: '0.7rem'
    }
  } : undefined,
  
  container: compact ? { 
    marginBottom: '8px' 
  } : { 
    marginBottom: '15px' 
  }
});
