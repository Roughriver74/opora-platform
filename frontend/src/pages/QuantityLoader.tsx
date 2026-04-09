// QuantityLoader.tsx
import { useEffect, useState } from 'react';
import { clinicService } from '../services/clinicService'; // твой сервис
import { alpha, Box, CircularProgress, InputAdornment, TextField, Theme, useMediaQuery } from '@mui/material';
import {

    List as ListIcon,

} from '@mui/icons-material'
interface QuantityLoaderProps {
    clinicId: string | null | undefined;
}

export const QuantityLoader: React.FC<QuantityLoaderProps> = ({ clinicId }) => {
    const [total, setTotal] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const isSmallScreen = useMediaQuery((theme: Theme) =>
        theme.breakpoints.down('sm')
    )
    useEffect(() => {
        const loadTotal = async () => {
            if (!clinicId) {
                setTotal(null);
                setLoading(false);
                return;
            }

            try {
                const response = await clinicService.getNetworkClinics(clinicId);
                setTotal(response.total || 0);
            } catch (error) {
                console.error('Ошибка загрузки количества филиалов:', error);
                setTotal(0);
            } finally {
                setLoading(false);
            }
        };

        loadTotal();
    }, [clinicId]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Загрузка...
            </Box>
        );
    }

    const fieldStyles = {
        '& .MuiOutlinedInput-root': {
            '& .MuiOutlinedInput-input': {
                padding: isSmallScreen ? '16px 14px' : '14px 16px',
            },
            backgroundColor: 'background.paper',
            borderRadius: isSmallScreen ? '8px' : 1,
            '& fieldset': {
                borderWidth: 1,
                borderColor: (theme: Theme) => alpha(theme.palette.divider, 0.8),
            },
            '&:hover fieldset': {
                borderColor: (theme: Theme) => theme.palette.primary.main,
            },
            '&.Mui-focused fieldset': {
                borderWidth: 1.5,
            },
        },
        '& .MuiInputLabel-root': {
            marginLeft: isSmallScreen ? '8px' : '4px',
            fontWeight: 500,
            fontSize: isSmallScreen ? '0.85rem' : '0.9rem',
            color: (theme: Theme) => theme.palette.text.secondary,
        },
        '& .MuiFormHelperText-root': {
            marginLeft: '8px',
            fontSize: '0.75rem',
        },
        mb: isSmallScreen ? 3 : 2.5,
        // Симметричные отступы для полей ввода на мобильной версии
        ...(isSmallScreen && {
            width: '100%', // Полная ширина в мобильной версии
            maxWidth: isSmallScreen ? '100%' : '500px', // Ограничение ширины для центрирования
        }),
    }

    return (

        <TextField
            fullWidth
            value={total ?? ''}
            label='Количество филиалов'
            type='text'
            InputProps={{
                readOnly: true,
                startAdornment: <InputAdornment position="start">
                    <ListIcon />
                </InputAdornment>,

            }}
            variant="outlined"
            size="small"
            sx={fieldStyles}

        />


    );
};