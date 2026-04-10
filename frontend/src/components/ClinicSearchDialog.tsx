import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';
import { clinicService, BitrixCompany } from '../services/clinicService';

interface ClinicSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectClinic: (clinic: BitrixCompany) => void;
  onCreateVisit?: (clinic: BitrixCompany) => void;
}

export const ClinicSearchDialog: React.FC<ClinicSearchDialogProps> = ({
  open,
  onClose,
  onSelectClinic,
  onCreateVisit,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<BitrixCompany[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    setSearchError(null);
    
    try {
      let results: BitrixCompany[] = [];
      
      // Проверяем, является ли поисковый запрос ИНН (только цифры)
      const isInn = /^\d+$/.test(searchTerm.trim());
      
      if (isInn) {
        // Если это ИНН, используем метод поиска по ИНН
        console.log('Поиск по ИНН:', searchTerm);
        results = await clinicService.searchClinicsByInn(searchTerm);
      } else {
        // Иначе используем метод поиска по названию
        console.log('Поиск по названию:', searchTerm);
        results = await clinicService.searchClinicsByName(searchTerm);
      }
      
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('Компании не найдены. Попробуйте изменить поисковый запрос.');
      }
    } catch (error) {
      console.error('Error searching clinics:', error);
      setSearchError('Ошибка при поиске компаний. Пожалуйста, попробуйте еще раз.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectClinic = (clinic: BitrixCompany) => {
    onSelectClinic(clinic);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="sm"
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          Поиск компании
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box mb={2}>
          <TextField
            autoFocus
            margin="dense"
            label="Введите название компании или ИНН"
            type="text"
            fullWidth
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="search"
                    onClick={handleSearch}
                    edge="end"
                  >
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
        
        <Box mb={2}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSearch}
            disabled={isSearching || !searchTerm.trim()}
            fullWidth
          >
            Поиск
          </Button>
        </Box>
        
        {isSearching && (
          <Box display="flex" justifyContent="center" my={3}>
            <CircularProgress />
          </Box>
        )}
        
        {searchError && !isSearching && (
          <Typography color="error" align="center" variant="body2">
            {searchError}
          </Typography>
        )}
        
        {!isSearching && searchResults.length > 0 && (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Результаты поиска ({searchResults.length}):
            </Typography>
            <List>
              {searchResults.map((clinic) => (
                <React.Fragment key={clinic.ID}>
                  <ListItem 
                    button 
                    onClick={() => handleSelectClinic(clinic)}
                    sx={{ flexDirection: 'column', alignItems: 'flex-start' }}
                  >
                    <ListItemText 
                      primary={clinic.TITLE} 
                      secondary={
                        <Box>
                          {clinic.UF_CRM_1741267701427 && (
                            <Typography variant="body2" component="span" display="block">
                              ИНН: {clinic.UF_CRM_1741267701427}
                            </Typography>
                          )}
                          {clinic.ADDRESS && (
                            <Typography variant="body2" component="span" display="block">
                              Адрес: {clinic.ADDRESS}
                            </Typography>
                          )}
                          {clinic.CITY && (
                            <Typography variant="body2" component="span" display="block">
                              Город: {clinic.CITY}
                            </Typography>
                          )}
                          
                          {/* Кнопка создания визита */}
                          {onCreateVisit && (
                            <Box mt={1}>
                              <Button 
                                variant="outlined" 
                                size="small" 
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation(); // Предотвращаем всплытие клика
                                  onCreateVisit(clinic);
                                }}
                              >
                                Создать визит
                              </Button>
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};
