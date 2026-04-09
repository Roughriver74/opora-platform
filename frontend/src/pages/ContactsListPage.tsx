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
  Paper,
  IconButton,
  Button,
  Chip,
  Alert
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import EditIcon from '@mui/icons-material/Edit';
import SyncIcon from '@mui/icons-material/Sync';
import { contactService, Contact } from '../services/contactService';

const ContactsListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          Contacts (LPR)
        </Typography>
        <Box>
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ mr: 2 }}
            onClick={() => navigate('/contacts/new')}
          >
            Add New Contact
          </Button>
          <LoadingButton
            variant="outlined"
            startIcon={<SyncIcon />}
            loading={syncMutation.isLoading}
            onClick={() => syncMutation.mutate()}
          >
            Sync with Bitrix24
          </LoadingButton>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Sync Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts?.map((contact: Contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>{contact.name}</TableCell>
                    <TableCell>{contact.contact_type || 'LPR'}</TableCell>
                    <TableCell>
                      {contact.dynamic_fields?.email ? 
                        Array.isArray(contact.dynamic_fields.email) ? 
                          contact.dynamic_fields.email.map((item: any) => item.VALUE).join(', ') : 
                          contact.dynamic_fields.email 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {contact.dynamic_fields?.phone ? 
                        Array.isArray(contact.dynamic_fields.phone) ? 
                          contact.dynamic_fields.phone.map((item: any) => item.VALUE).join(', ') : 
                          contact.dynamic_fields.phone 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={contact.sync_status || 'unknown'}
                        color={getSyncStatusColor(contact.sync_status || 'unknown')}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/contacts/${contact.id}`)}
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {contacts?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="textSecondary" py={2}>
                        No contacts found. Add a new contact or sync with Bitrix24.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ContactsListPage;
