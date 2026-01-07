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
  Stack,
  Tooltip,
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
  const totalForms = forms.length;
  const activeForms = forms.filter((form) => form.isActive).length;
  const inactiveForms = totalForms - activeForms;
  const actionButtonSx = {
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: 'background.paper',
    '&:hover': {
      bgcolor: 'action.hover',
    },
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ md: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
            Управление формами
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
            <Chip label={`Всего: ${totalForms}`} size="small" />
            <Chip
              label={`Активные: ${activeForms}`}
              color="success"
              variant="outlined"
              size="small"
            />
            <Chip
              label={`Неактивные: ${inactiveForms}`}
              variant="outlined"
              size="small"
            />
          </Stack>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onAddForm}
          sx={{
            textTransform: 'none',
            boxShadow: 'none',
            alignSelf: { xs: 'flex-start', md: 'center' },
            '&:hover': { boxShadow: 'none' },
          }}
        >
          Создать форму
        </Button>
      </Stack>

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Table
          sx={{
            minWidth: 650,
            '& .MuiTableCell-root': { py: 1.5 },
          }}
          aria-label="таблица форм"
        >
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Название
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Заголовок
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Количество полей
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Статус
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Действия
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {forms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    Нет доступных форм. Создайте новую форму.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              forms.map((form) => {
                const formId = form.id || form._id;

                if (!formId) {
                  return null;
                }

                return (
                  <TableRow
                    hover
                    key={formId}
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                    }}
                  >
                    <TableCell component="th" scope="row">
                      <Typography variant="subtitle2">{form.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {form.title}
                      </Typography>
                    </TableCell>
                    <TableCell>{Array.isArray(form.fields) ? form.fields.length : 0}</TableCell>
                    <TableCell>
                      <Chip
                        label={form.isActive ? 'Активна' : 'Неактивна'}
                        color={form.isActive ? 'success' : 'default'}
                        size="small"
                        variant={form.isActive ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="Просмотр формы">
                          <IconButton
                            color="info"
                            onClick={() => onViewForm(formId)}
                            aria-label="Просмотр формы"
                            size="small"
                            sx={actionButtonSx}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Редактировать форму">
                          <IconButton
                            color="primary"
                            onClick={() => onEditForm(formId)}
                            aria-label="Редактировать форму"
                            size="small"
                            sx={actionButtonSx}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Удалить форму">
                          <IconButton
                            color="error"
                            onClick={() => onDeleteForm(formId)}
                            aria-label="Удалить форму"
                            size="small"
                            sx={actionButtonSx}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default FormsList;
