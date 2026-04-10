import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CardActionArea,
  Avatar,
  Divider,
  Fab,
  Alert,
  Chip,
  Grid,
  Button,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import PersonIcon from '@mui/icons-material/Person';
import SyncIcon from '@mui/icons-material/Sync';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { contactService, Contact } from '../services/contactService';

const ContactsListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { data: contacts, isLoading, isError } = useQuery(
    ['contacts'],
    () => contactService.getContacts()
  );

  const syncMutation = useMutation(
    () => contactService.syncContactsFromBitrix(),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['contacts']);
      }
    }
  );

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
        return 'success';
      case 'pending':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  if (isLoading) {
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
          Error loading contacts. Please try again later.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3} pb={12}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
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
            startIcon={<SyncIcon />}
            loading={syncMutation.isLoading}
            onClick={() => syncMutation.mutate()}
            sx={{ borderRadius: '20px' }}
          >
            Синхронизация
          </LoadingButton>
        </Box>
      </Box>

      {contacts?.length === 0 ? (
        <Alert severity="info">
          Контакты не найдены. Создайте новый контакт.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {contacts?.map((contact: Contact) => {
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
                <Card sx={{ borderRadius: 4, overflow: 'hidden', height: '100%' }}>
                  <CardActionArea onClick={() => navigate(`/contacts/${contact.id}`)}>
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
                          color={getSyncStatusColor(contact.sync_status || 'unknown')}
                          sx={{ mb: 1, height: 20, fontSize: '0.7rem' }}
                        />
                        <ArrowForwardIosIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      </Box>
                    </Box>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
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
