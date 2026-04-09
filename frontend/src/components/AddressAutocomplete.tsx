import React, { useState, useEffect, useRef } from 'react';
import Autocomplete, { AutocompleteChangeReason } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { useDebounce } from '../utils/useDebounce';
import { suggestAddress } from '../services/dadataService';
import Popper from '@mui/material/Popper';

// Тип данных из DaData API
export interface DadataAddress {
    value: string;
    data: {
        country: string | null;
        city: string | null;
        street: string | null;
        house: string | null;
        postal_code: string | null;
        geo_lat: string | null;
        geo_lon: string | null;
        clinic?: {
            id: string;
        }
        company?: {
            id: string;
        };
    };
}

// Тип данных, который возвращается родителю
export interface AddressData {
    country: string;
    city: string;
    street: string;
    number: string;
    postal_code: string;
    latitude: string;
    longitude: string;
    company_id: number;
    is_network: boolean;
    clinic_id: number
}

// Тип пропсов
interface Props {
    value: {
        object: AddressData | null;
        string: string;
    } | null;
    onChange: (value: {
        object: AddressData | null;
        string: string;
    }) => void;
    error?: boolean;
    helperText?: string;
}

export const AddressAutocomplete: React.FC<Props> = ({
    value,
    onChange,
    error,
    helperText,
}) => {
    // Состояние поля ввода
    const [inputValue, setInputValue] = useState<string>(value?.string || '');
    const [options, setOptions] = useState<DadataAddress[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const debouncedValue = useDebounce(inputValue, 300);

    const inputRef = useRef<HTMLDivElement>(null);
    const [showTooltip, setShowTooltip] = useState(false);

    // Проверка на обрезанный текст
    useEffect(() => {
        const checkOverflow = () => {
            if (inputRef.current) {
                const isTruncated =
                    inputRef.current.offsetWidth < inputRef.current.scrollWidth;
                setShowTooltip(isTruncated);
            }
        };

        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [inputValue]);

    useEffect(() => {
        if (value?.string) {
            setInputValue(value.string);
        }
    }, [value]);

    useEffect(() => {
        if (!debouncedValue.trim()) return;

        const fetchSuggestions = async () => {
            setIsLoading(true);
            try {
                const suggestions = await suggestAddress(debouncedValue);
                setOptions(suggestions);
            } catch (e: any) {
                console.error(e);

                if (e.response?.data?.message) {
                    setModalMessage(e.response.data.message);
                } else if (e.message.includes('Forbidden')) {
                    setModalMessage(
                        'Ошибка Dadata: Подсказки адресов недоступны для вашего аккаунта. Проверьте тариф или ключ API.'
                    );
                } else {
                    setModalMessage('Не удалось загрузить подсказки. Попробуйте позже.');
                }

                setIsErrorModalOpen(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSuggestions();
    }, [debouncedValue]);

    useEffect(() => {
        console.log('options изменились:', options);
    }, [options]);


    const handleSelect = (
        event: React.ChangeEvent<{}>,
        newValue: string | DadataAddress | null,
        reason: AutocompleteChangeReason
    ) => {

        if (reason === 'selectOption' && typeof newValue !== 'string') {

            const address: AddressData = {
                country: newValue?.data.country || '',
                city: newValue?.data.city || '',
                street: newValue?.data.street || '',
                number: newValue?.data.house || '',
                postal_code: newValue?.data.postal_code || '',
                latitude: newValue?.data.geo_lat || '',
                longitude: newValue?.data.geo_lon || '',
                company_id: parseInt(newValue?.data.company?.id || '0', 10) || 0,
                is_network: false,
                clinic_id: parseInt(newValue?.data.clinic?.id || '0', 10) || 0,
            };

            onChange({
                object: address,
                string: newValue?.value || '',
            });

            setInputValue(newValue?.value || '');
        } else if (reason === 'clear') {
            onChange({
                object: null,
                string: '',
            });

            setInputValue('');
        } else if (typeof newValue === 'string') {
            onChange({
                object: null,
                string: newValue,
            });
            console.log(newValue)
            setInputValue(newValue);
        }
    };

    const handleCloseModal = () => {
        setIsErrorModalOpen(false);
    };

    return (
        <>

            <div>
                <Autocomplete
                    filterOptions={(x) => x}
                    options={options}
                    getOptionLabel={(option) =>
                        typeof option === 'string' ? option : option.value
                    }
                    value={options.find(option => option.value === inputValue) || null}
                    inputValue={inputValue}
                    onInputChange={(event, newInputValue) => {
                        setInputValue(newInputValue);
                        onChange({
                            object: null,
                            string: newInputValue,
                        });
                    }}

                    onChange={handleSelect}
                    freeSolo
                    openOnFocus
                    PopperComponent={(props) => (
                        <Popper
                            {...props}
                            placement="top"
                            modifiers={[
                                {
                                    name: 'flip',
                                    enabled: false,
                                },
                                {
                                    name: 'preventOverflow',
                                    options: {
                                        altAxis: true,
                                        altBoundary: true,
                                        tether: true,
                                        boundariesElement: 'viewport',
                                    },
                                },
                            ]}
                        />
                    )}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            inputRef={inputRef}
                            label="Адрес"
                            variant="outlined"
                            fullWidth
                            error={error}
                            multiline
                            rows={4}
                            helperText={helperText}
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            }}
                        />
                    )}
                />
            </div>

            {/* Модальное окно с ошибкой */}
            <Dialog open={isErrorModalOpen} onClose={handleCloseModal}>
                <DialogTitle>Ошибка</DialogTitle>
                <DialogContent>
                    <DialogContentText>{modalMessage}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal} color="primary">
                        Закрыть
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};