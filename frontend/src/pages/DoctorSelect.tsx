import { useEffect, useState } from 'react';
import {
    Box,
    CircularProgress,
    FormControl,
    Select,
    MenuItem,
    Checkbox,
    ListItemText,
} from '@mui/material';
import { getBitrixApiUrl } from '../constants/api';

interface Doctor {
    ID: string;
    NAME: string;
    LAST_NAME: string;
    EMAIL?: Array<{ VALUE: string }>;
    PHONE?: Array<{ VALUE: string }>;
    POST?: string | null;
}



const useGetContacts = (bitrixId: string | number | null) => {
    const [contacts, setContacts] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!bitrixId) return;

        const fetchContacts = async () => {
            setLoading(true);
            try {
                const response = await fetch(getBitrixApiUrl('crm.contact.list'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filter: { COMPANY_ID: bitrixId },
                        select: ['ID', 'NAME', 'LAST_NAME', 'EMAIL', 'PHONE', 'POST'],
                    }),
                });

                if (!response.ok) throw new Error('Failed to fetch contacts');

                const data = await response.json();
                const result = data.result || [];

                setContacts(result);
            } catch (error) {
                console.error('Ошибка при загрузке контактов:', error);
                setContacts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchContacts();
    }, [bitrixId]);

    return { contacts, loading };
};

interface ContactSelectProps {
    companyId: string | number | null;
    value?: string[] | null;
    onChange?: (contactIds: string[] | null) => void;
}

const DoctorSelect: React.FC<ContactSelectProps> = ({ companyId, value, onChange }) => {
    const { contacts, loading } = useGetContacts(companyId);

    const handleChange = (event: any) => {
        const selected = event.target.value as string[];
        const result = selected.length === 0 ? null : selected;
        if (onChange) onChange(result);
    };

    const formatContactName = (contact: Doctor): string => {
        const fullName = `${contact.LAST_NAME} ${contact.NAME}`.trim();
        const phone = contact.PHONE?.[0]?.VALUE || '';
        const email = contact.EMAIL?.[0]?.VALUE || '';

        if (phone && email) return `${fullName} (${phone}, ${email})`;
        if (phone) return `${fullName} (${phone})`;
        if (email) return `${fullName} (${email})`;

        return fullName;
    };

    const selectedValue = Array.isArray(value) ? value : value ? [value] : [];

    return (
        <FormControl fullWidth>
            <Select
                label="Контакты"
                multiple
                displayEmpty
                value={selectedValue}
                onChange={handleChange}
                disabled={loading}
                endAdornment={
                    loading ? (
                        <Box sx={{ position: 'absolute', right: 30 }}>
                            <CircularProgress size={20} />
                        </Box>
                    ) : null
                }
                renderValue={(selected) => {
                    if (selected.length === 0) {
                        return <em>Лицо, принимающее решение</em>;
                    }

                    const names = contacts
                        .filter((c) => selected.includes(c.ID.toString()))
                        .map(formatContactName);

                    return names.join(', ');
                }}
                MenuProps={{
                    PaperProps: {
                        style: {
                            maxHeight: 400,
                            overflow: 'auto',
                        },
                    },
                }}
            >
                {contacts.map((contact) => (
                    <MenuItem key={contact.ID} value={contact.ID}>
                        <Checkbox checked={selectedValue.indexOf((contact.ID).toString()) > -1} />
                        <ListItemText primary={formatContactName(contact)} />
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};




export default DoctorSelect;