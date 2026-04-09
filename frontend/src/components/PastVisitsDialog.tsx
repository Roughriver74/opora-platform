import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Box,
  Chip,
  IconButton,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Visit, visitStatusColors, visitStatusDisplayNames } from '../services/visitService';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CommentIcon from '@mui/icons-material/Comment';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CategoryIcon from '@mui/icons-material/Category';
import FlagIcon from '@mui/icons-material/Flag';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface PastVisitsDialogProps {
  open: boolean;
  onClose: () => void;
  companyId: number;
  companyName: string;
  visits: Visit[] | undefined;
  isLoading: boolean;
}

const PastVisitsDialog: React.FC<PastVisitsDialogProps> = ({
  open,
  onClose,
  companyId,
  companyName,
  visits,
  isLoading,
}) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMMM yyyy', { locale: ru });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Функция для получения значения динамического поля
  const getDynamicFieldValue = (visit: Visit, fieldId: string, defaultValue: string = '-') => {
    if (!visit.dynamic_fields) return defaultValue;
    return visit.dynamic_fields[fieldId] || defaultValue;
  };

  // Функция для получения типа визита (из динамических полей или обычного поля)
  const getVisitType = (visit: Visit) => {
    const dynamicType = getDynamicFieldValue(visit, 'ufcrm18type', '');
    return dynamicType || visit.visit_type || 'Визит';
  };

  // Функция для получения характера визита
  const getVisitNature = (visit: Visit) => {
    return getDynamicFieldValue(visit, '1732027859040', '-');
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        pb: 2
      }}>
        <Typography variant="h6">
          Прошлые визиты: {companyName}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2, minHeight: '300px' }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="300px">
            <CircularProgress />
          </Box>
        ) : visits && visits.length > 0 ? (
          <List>
            {visits.map((visit, index) => (
              <React.Fragment key={visit.id}>
                <ListItem 
                  alignItems="flex-start"
                  sx={{ 
                    cursor: 'default',  
                    borderRadius: 1,
                    mb: 1,
                    p: 2
                  }}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" component="span">
                            {getVisitType(visit)}
                          </Typography>
                          <Chip 
                            label={visitStatusDisplayNames[visit.status] || visit.status} 
                            size="small" 
                            color={visitStatusColors[visit.status]}
                          />
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box mt={1}>
                        <Grid container spacing={1}>
                          <Grid item xs={12} sm={6}>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                              <CalendarTodayIcon fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(visit.date)}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                              <CategoryIcon fontSize="small" color="action" />
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ 
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                Характер: {getVisitNature(visit)}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                              <CommentIcon fontSize="small" color="action" />
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ 
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                Комментарий: {getDynamicFieldValue(visit, 'ufcrm18comment', '-')}
                              </Typography>
                            </Box>
                          </Grid>
                          {visit.comment && (
                            <Grid item xs={12}>
                              <Box display="flex" alignItems="flex-start" gap={1}>
                                <CommentIcon fontSize="small" color="action" style={{ marginTop: '3px' }} />
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{ 
                                    wordBreak: 'break-word',
                                    whiteSpace: 'normal',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                >
                                  {visit.comment}
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                    }
                  />
                </ListItem>
                {index < visits.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" height="300px">
            <Typography variant="body1" color="text.secondary">
              Нет данных о прошлых визитах
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.12)', p: 2, justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          Всего визитов: {visits?.length || 0}
        </Typography>
        <Button onClick={onClose} variant="outlined">
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PastVisitsDialog;
