import { Components, Theme } from '@mui/material/styles';

export const getComponentOverrides = (mode: 'light' | 'dark'): Components<Theme> => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        scrollbarWidth: 'thin',
        scrollbarColor: mode === 'light' ? '#CBD5E1 transparent' : '#475569 transparent',
      },
      '::-webkit-scrollbar': {
        width: '6px',
        height: '6px',
      },
      '::-webkit-scrollbar-thumb': {
        borderRadius: '3px',
        background: mode === 'light' ? '#CBD5E1' : '#475569',
      },
    },
  },
  MuiButton: {
    defaultProps: {
      disableElevation: true,
    },
    styleOverrides: {
      root: {
        borderRadius: 10,
        padding: '8px 20px',
        fontWeight: 600,
        transition: 'all 0.2s ease',
      },
      contained: {
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: mode === 'light'
            ? '0 4px 12px rgba(26, 86, 219, 0.25)'
            : '0 4px 12px rgba(96, 165, 250, 0.2)',
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
        borderRadius: 16,
        border: mode === 'light' ? '1px solid #E2E8F0' : '1px solid #334155',
        boxShadow: mode === 'light'
          ? '0 1px 3px rgba(0, 0, 0, 0.04)'
          : '0 1px 3px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: mode === 'light'
            ? '0 4px 16px rgba(0, 0, 0, 0.08)'
            : '0 4px 16px rgba(0, 0, 0, 0.4)',
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
      elevation1: {
        boxShadow: mode === 'light'
          ? '0 1px 3px rgba(0, 0, 0, 0.06)'
          : '0 1px 3px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        backgroundColor: mode === 'light' ? '#FFFFFF' : '#1E293B',
        color: mode === 'light' ? '#0F172A' : '#F1F5F9',
        borderBottom: mode === 'light' ? '1px solid #E2E8F0' : '1px solid #334155',
        boxShadow: 'none',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: mode === 'light' ? '#FFFFFF' : '#0F172A',
        borderRight: mode === 'light' ? '1px solid #E2E8F0' : '1px solid #1E293B',
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
          borderRadius: 10,
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        fontWeight: 500,
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: mode === 'light' ? '1px solid #F1F5F9' : '1px solid #1E293B',
      },
      head: {
        fontWeight: 600,
        backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        '&:hover': {
          backgroundColor: mode === 'light'
            ? 'rgba(26, 86, 219, 0.04)'
            : 'rgba(96, 165, 250, 0.06)',
        },
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 16,
        boxShadow: mode === 'light'
          ? '0 24px 48px rgba(0, 0, 0, 0.12)'
          : '0 24px 48px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 10,
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: 8,
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
            ? 'rgba(26, 86, 219, 0.08)'
            : 'rgba(96, 165, 250, 0.12)',
          '&:hover': {
            backgroundColor: mode === 'light'
              ? 'rgba(26, 86, 219, 0.12)'
              : 'rgba(96, 165, 250, 0.16)',
          },
        },
      },
    },
  },
  MuiFab: {
    styleOverrides: {
      root: {
        borderRadius: 14,
        boxShadow: mode === 'light'
          ? '0 4px 14px rgba(26, 86, 219, 0.3)'
          : '0 4px 14px rgba(96, 165, 250, 0.2)',
      },
    },
  },
});
