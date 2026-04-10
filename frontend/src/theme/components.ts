import { Components, Theme } from '@mui/material/styles';

// OPORA Component Overrides — matches landing page design
// borderRadius: 8 (small), 12 (cards), 16 (buttons/pills)
// Shadows: subtle, warm-toned

export const getComponentOverrides = (mode: 'light' | 'dark'): Components<Theme> => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        scrollbarWidth: 'thin',
        scrollbarColor: mode === 'light' ? '#D6D3D1 transparent' : '#44403C transparent',
      },
      '::-webkit-scrollbar': {
        width: '6px',
        height: '6px',
      },
      '::-webkit-scrollbar-thumb': {
        borderRadius: '3px',
        background: mode === 'light' ? '#D6D3D1' : '#44403C',
      },
    },
  },
  MuiButton: {
    defaultProps: {
      disableElevation: true,
    },
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: '10px 20px',
        fontWeight: 600,
        textTransform: 'none',
        transition: 'all 0.2s ease',
      },
      contained: {
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: mode === 'light'
            ? '0 4px 12px rgba(5, 150, 105, 0.3)'
            : '0 4px 12px rgba(52, 211, 153, 0.2)',
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
      },
      outlined: {
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
        borderRadius: 12,
        border: mode === 'light' ? '1px solid #E7E5E4' : '1px solid #292524',
        boxShadow: mode === 'light'
          ? '0 1px 2px rgba(0, 0, 0, 0.05)'
          : '0 1px 3px rgba(0, 0, 0, 0.3)',
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: mode === 'light'
            ? '0 4px 12px rgba(0, 0, 0, 0.08)'
            : '0 4px 12px rgba(0, 0, 0, 0.4)',
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        backgroundImage: 'none',
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        backgroundColor: mode === 'light'
          ? 'rgba(250, 250, 249, 0.9)'
          : 'rgba(12, 10, 9, 0.9)',
        backdropFilter: 'blur(8px)',
        color: mode === 'light' ? '#1C1917' : '#FAFAF9',
        boxShadow: 'none',
        borderBottom: mode === 'light'
          ? '1px solid #E7E5E4'
          : '1px solid #292524',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: mode === 'light' ? '#FFFFFF' : '#1C1917',
        borderRight: mode === 'light' ? '1px solid #E7E5E4' : '1px solid #292524',
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
      size: 'small',
    },
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        fontWeight: 500,
        fontSize: '0.75rem',
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: mode === 'light' ? '1px solid #F5F5F4' : '1px solid #292524',
      },
      head: {
        fontWeight: 600,
        backgroundColor: mode === 'light' ? '#FAFAF9' : '#0C0A09',
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        '&:hover': {
          backgroundColor: mode === 'light'
            ? 'rgba(5, 150, 105, 0.04)'
            : 'rgba(52, 211, 153, 0.06)',
        },
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 16,
        boxShadow: mode === 'light'
          ? '0 20px 40px rgba(0, 0, 0, 0.12)'
          : '0 20px 40px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: 6,
        fontSize: '0.75rem',
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        minHeight: 44,
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        margin: '2px 8px',
        '&.Mui-selected': {
          backgroundColor: mode === 'light'
            ? 'rgba(5, 150, 105, 0.08)'
            : 'rgba(52, 211, 153, 0.12)',
          '&:hover': {
            backgroundColor: mode === 'light'
              ? 'rgba(5, 150, 105, 0.12)'
              : 'rgba(52, 211, 153, 0.16)',
          },
        },
      },
    },
  },
  MuiFab: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: mode === 'light'
          ? '0 4px 14px rgba(5, 150, 105, 0.3)'
          : '0 4px 14px rgba(52, 211, 153, 0.2)',
      },
    },
  },
  MuiBottomNavigation: {
    styleOverrides: {
      root: {
        backgroundColor: 'transparent',
      },
    },
  },
  MuiBottomNavigationAction: {
    styleOverrides: {
      root: {
        '&.Mui-selected': {
          color: mode === 'light' ? '#059669' : '#34D399',
        },
      },
    },
  },
});
