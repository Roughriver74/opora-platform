import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Box, CircularProgress, Typography } from '@mui/material';

const useGetLprForClinic = (bitrixId: string | number | null | undefined) => {
    const [lprName, setLprName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!bitrixId) return;

        const fetchLpr = async () => {
            setIsLoading(true);
            try {
                const response = await api.post(`/network-clinics/doctor?company_id=${Number(bitrixId)}`);
                const data = response.data;
                if (Array.isArray(data)) {
                    if (data.length === 0) {
                        setLprName('Отсутствует');
                        return;
                    }

                    const formatted = data
                        .map(contact => {
                            const fullName = [contact.LAST_NAME, contact.NAME, contact.SECOND_NAME].filter(Boolean).join(' ');
                            const post = contact.POST ? `(${contact.POST})` : '';
                            return `${fullName} ${post}`.trim();
                        })
                        .join(', ');

                    setLprName(formatted);
                } else {
                    setLprName('Отсутствует');
                }
            } catch (err) {
                console.error('Ошибка загрузки контактов:', err);
                setError(err as Error);
                setLprName('Ошибка');
            } finally {
                setIsLoading(false);
            }
        };

        fetchLpr();
    }, [bitrixId]);

    return { lprName, isLoading, error };
};

const LprCell: React.FC<{ bitrixId?: string | number | null }> = ({ bitrixId }) => {
    const { lprName, isLoading } = useGetLprForClinic(bitrixId);

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                <Typography variant="body2">Загрузка...</Typography>
            </Box>
        );
    }

    return <>{lprName}</>;
};

export default LprCell