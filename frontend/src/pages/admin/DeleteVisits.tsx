import React, { useState } from 'react';
import {
    TextField,
    FormControlLabel,
    Switch,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Box,
    Typography,
    Button,
} from '@mui/material';

import { visitService } from '../../services/visitService';

const DeleteVisits: React.FC = () => {
    const [inputValue, setInputValue] = useState<string>('');
    const [useBitrixId, setUseBitrixId] = useState<boolean>(false);
    const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isValidId = inputValue && !isNaN(Number(inputValue));

    const handleDelete = async () => {
        if (!isValidId) return;

        try {
            const idToDelete = Number(inputValue);

            const deleteParams = useBitrixId
                ? { visit_bitrix_id: idToDelete }
                : { visit_id: idToDelete };

            await visitService.deleteVisit(deleteParams);

            setSuccessMessage(
                `Визит с ${useBitrixId ? 'bitrixId' : 'id'} ${idToDelete} успешно удален!`
            );
        } catch (error) {
            console.error('Ошибка удаления визита:', error);
            setErrorMessage('Во время удаления произошла ошибка!');
        } finally {
            setConfirmOpen(false);
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 600, margin: 'auto' }}>
            <Typography variant="h5" gutterBottom>
                Удалить визит
            </Typography>

            <TextField
                label="Введите ID"
                type="number"
                fullWidth
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                inputProps={{ min: 1 }}
                sx={{ mb: 2 }}
            />

            <FormControlLabel
                control={
                    <Switch
                        checked={useBitrixId}
                        onChange={(e) => setUseBitrixId(e.target.checked)}
                        disabled={!isValidId}
                        color="primary"
                    />
                }
                label={useBitrixId ? 'Удалить по bitrixId' : 'Удалить по id'}
            />

            <Button
                variant="contained"
                color="error"
                onClick={() => setConfirmOpen(true)}
                disabled={!isValidId}
                fullWidth
            >
                Удалить визит
            </Button>

            {/* Модальное окно подтверждения */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>Подтверждение</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Вы действительно хотите удалить визит с{' '}
                        <strong>{useBitrixId ? 'bitrixId' : 'id'}</strong> —{' '}
                        <strong>{inputValue}</strong>?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDelete} color="error" autoFocus>
                        Да
                    </Button>
                    <Button onClick={() => setConfirmOpen(false)} color="inherit">
                        Нет
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!successMessage} onClose={() => setSuccessMessage(null)}>
                <DialogTitle>Успех</DialogTitle>
                <DialogContent>
                    <DialogContentText>{successMessage}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSuccessMessage(null)} color="primary">
                        Ок
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Сообщение об ошибке */}
            <Dialog open={!!errorMessage} onClose={() => setErrorMessage(null)}>
                <DialogTitle>Ошибка</DialogTitle>
                <DialogContent>
                    <DialogContentText color="error">{errorMessage}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setErrorMessage(null)} color="primary">
                        Закрыть
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DeleteVisits;