import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Form } from '../../types';

interface FormsListProps {
  forms: Form[];
  onAddForm: () => void;
  onEditForm: (id: string) => void;
  onDeleteForm: (id: string) => void;
  onViewForm: (id: string) => void;
}

const FormsList: React.FC<FormsListProps> = ({
  forms,
  onAddForm,
  onEditForm,
  onDeleteForm,
  onViewForm,
}) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Управление формами
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onAddForm}
        >
          Создать форму
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="таблица форм">
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Заголовок</TableCell>
              <TableCell>Количество полей</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {forms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body1" sx={{ py: 2 }}>
                    Нет доступных форм. Создайте новую форму.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              forms.map((form) => (
                <TableRow key={form.id || form._id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    {form.name}
                  </TableCell>
                  <TableCell>{form.title}</TableCell>
                  <TableCell>{Array.isArray(form.fields) ? form.fields.length : 0}</TableCell>
                  <TableCell>
                    <Chip
                      label={form.isActive ? 'Активна' : 'Неактивна'}
                      color={form.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="info"
                      onClick={() => onViewForm(form.id || form._id!)}
                      title="Просмотр формы"
                      size="small"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      color="primary"
                      onClick={() => onEditForm(form.id || form._id!)}
                      title="Редактировать форму"
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => onDeleteForm(form.id || form._id!)}
                      title="Удалить форму"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default FormsList;
