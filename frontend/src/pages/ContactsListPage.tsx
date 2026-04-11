import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CircularProgress,
  Typography,
  Alert,
  Chip,
  Grid,
  Button,
  Fab,
  Avatar,
  TextField,
  TablePagination,
  InputAdornment,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import PersonIcon from '@mui/icons-material/Person';
import SyncIcon from '@mui/icons-material/Sync';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { contactService, Contact } from '../services/contactService';

const ContactsListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, isError } = useQuery(
    ['contacts', page, pageSize, search],
    () => contactService.getContacts(page + 1, pageSize, search || undefined),
    { keepPreviousData: true }
  );

  const syncMutation = useMutation(
    () => contactService.syncContactsFromBitrix(),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['contacts']);
      }
    }
  );

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const getSyncStatusSx = (status: string) => {
    switch (status) {
      case 'synced':
        return { bgcolor: 'success.main', color: '#fff' };
      case 'pending':
        return { bgcolor: 'warning.main', color: '#fff' };
      case 'error':
        return { bgcolor: 'error.main', color: '#fff' };
      default:
        return { bgcolor: 'text.secondary', color: '#fff' };
    }
  };

  if (isLoading && !data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Ошибка загрузки контактов. Попробуйте обновить страницу.
        </Alert>
      </Box>
    );
  }

  const contacts = data?.items || [];
  const total = data?.total || 0;

  return (
    <Box p={3} pb={12}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Контакты</Typography>
        <Box display="flex" gap={1}>
          {!isMobile && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/contacts/new')}
              sx={{ borderRadius: '20px' }}
            >
              Создать контакт
            </Button>
          )}
          <LoadingButton
            variant="outlined"
            size="small"
            loading={syncMutation.isLoading}
            onClick={() => syncMutation.mutate()}
            sx={{ borderRadius: '20px', minWidth: 'auto', px: 1.5 }}
          >
            <SyncIcon />
          </LoadingButton>
        </Box>
      </Box>

      <Box mb={2}>
        <TextField
          size="small"
          placeholder="Поиск по имени..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyPress={handleKeyPress}
          onBlur={handleSearch}
          fullWidth
          sx={{ maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {contacts.length === 0 ? (
        <Alert severity="info">
          {search ? `Контакты по запросу "${search}" не найдены.` : 'Контакты не найдены. Создайте новый контакт.'}
        </Alert>
      ) : (
        <>
          <Grid container spacing={2}>
            {contacts.map((contact: Contact) => {
              const email = contact.dynamic_fields?.email
                ? Array.isArray(contact.dynamic_fields.email)
                  ? contact.dynamic_fields.email.map((item: any) => item.VALUE).join(', ')
                  : contact.dynamic_fields.email
                : '';
              const phone = contact.dynamic_fields?.phone
                ? Array.isArray(contact.dynamic_fields.phone)
                  ? contact.dynamic_fields.phone.map((item: any) => item.VALUE).join(', ')
                  : contact.dynamic_fields.phone
                : '';

              return (
                <Grid item xs={12} md={6} lg={4} key={contact.id}>
                  <Card
                    sx={{ borderRadius: 4, overflow: 'hidden', height: '100%', cursor: 'pointer' }}
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                  >
                    <Box display="flex" alignItems="center" p={2}>
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                        <PersonIcon />
                      </Avatar>
                      <Box flexGrow={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {contact.name}
                        </Typography>
                        {phone && (
                          <Typography variant="body2" color="text.secondary">
                            {phone}
                          </Typography>
                        )}
                      </Box>
                      <Box display="flex" flexDirection="column" alignItems="flex-end">
                        <Chip
                          size="small"
                          label={contact.sync_status || 'unknown'}
                          sx={{ mb: 1, height: 20, fontSize: '0.7rem', ...getSyncStatusSx(contact.sync_status || 'unknown') }}
                        />
                        <ArrowForwardIosIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(e) => {
              setPageSize(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="На странице:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} из ${count}`}
            sx={{ mt: 2 }}
          />
        </>
      )}

      {isMobile && (
        <Fab
          color="primary"
          onClick={() => navigate('/contacts/new')}
          sx={{ position: 'fixed', bottom: 84, right: 20 }}
        >
          <AddIcon fontSize="large" />
        </Fab>
      )}
    </Box>
  );
};

export default ContactsListPage;
