import { Components, Theme } from '@mui/material/styles';

export const getComponentOverrides = (mode: 'light' | 'dark'): Components<Theme> => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        WebkitFontSmoothing: 'antialiased',
        overscrollBehaviorY: 'none', // Prevent bounce effect breaking standard feel
        scrollbarWidth: 'none', // Hide standard scrollbar for native feel
        '&::-webkit-scrollbar': {
          display: 'none'
        }
      },
    },
  },
  MuiButton: {
    defaultProps: {
      disableElevation: true,
      variant: 'contained',
      fullWidth: true,
    },
    styleOverrides: {
      root: {
        borderRadius: 16, // Very round buttons
        padding: '14px 20px', // Thicker mobile size
        fontWeight: 600,
        fontSize: '1rem',
        textTransform: 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      contained: {
        '&:active': {
          transform: 'scale(0.96)',
        },
      },
      outlined: {
        padding: '12.5px 20px',
        borderWidth: '1.5px',
        '&:hover': {
          borderWidth: '1.5px',
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 20, // Mobile style large radius
        border: 'none', // Native cards usually just have subtle shadows or flat background
        boxShadow: mode === 'light'
          ? '0 2px 10px rgba(0, 0, 0, 0.04)'
          : '0 2px 10px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 20,
        backgroundImage: 'none',
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(28, 28, 30, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)', // Safari support
        color: mode === 'light' ? '#000000' : '#FFFFFF',
        boxShadow: 'none',
        borderBottom: `0.5px solid ${mode === 'light' ? 'rgba(60, 60, 67, 0.3)' : 'rgba(84, 84, 88, 0.65)'}`,
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
      size: 'medium', // Full height for touch targets
    },
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 16,
          backgroundColor: mode === 'light' ? '#FFFFFF' : '#1C1C1E', // Fill color
        },
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: mode === 'light' ? '#E5E5EA' : '#3A3A3C',
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        fontWeight: 600,
        fontSize: '0.75rem',
      },
    },
  },
  MuiList: {
    styleOverrides: {
      root: {
        padding: '8px',
      }
    }
  },
  MuiListItem: {
    styleOverrides: {
      root: {
        borderRadius: 16,
        marginBottom: '8px',
        backgroundColor: mode === 'light' ? '#FFFFFF' : '#1C1C1E', // List items as cards
      }
    }
  },
  MuiFab: {
    styleOverrides: {
      root: {
        borderRadius: 24, // Round but large
        height: 64,
        width: 64,
        boxShadow: mode === 'light'
          ? '0 8px 24px rgba(0, 122, 255, 0.4)'
          : '0 8px 24px rgba(10, 132, 255, 0.3)',
      },
    },
  },
});
