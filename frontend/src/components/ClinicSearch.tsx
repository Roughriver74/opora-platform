import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { clinicService, BitrixCompany } from '../services/clinicService';

interface ClinicSearchProps {
  onSelectCompany?: (company: BitrixCompany) => void;
}

export const ClinicSearch: React.FC<ClinicSearchProps> = ({ onSelectCompany }) => {
  const [inn, setInn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<BitrixCompany[]>([]);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!inn) {
      setError('Введите ИНН для поиска');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const results = await clinicService.searchClinicsByInn(inn);
      setCompanies(results);
      
      if (results.length === 0) {
        setError('Компании с указанным ИНН не найдены');
      }
    } catch (err) {
      console.error('Ошибка при поиске клиник:', err);
      setError('Произошла ошибка при поиске. Пожалуйста, попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanyClick = (company: BitrixCompany) => {
    if (onSelectCompany) {
      onSelectCompany(company);
    } else {
      // Если нет обработчика, просто открываем страницу компании
      navigate(`/companies/${company.ID}/edit`);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Поиск компании по ИНН
      </Typography>
      
      <Box display="flex" alignItems="center" mb={2}>
        <TextField
          label="ИНН компании"
          variant="outlined"
          fullWidth
          value={inn}
          onChange={(e) => setInn(e.target.value)}
          placeholder="Например: 7806109207"
          sx={{ mr: 2 }}
        />
        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={handleSearch}
          disabled={isLoading}
        >
          Поиск
        </Button>
      </Box>

      {isLoading && (
        <Box display="flex" justifyContent="center" my={2}>
          <CircularProgress size={24} />
        </Box>
      )}

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {companies.length > 0 && (
        <>
          <Typography variant="subtitle1" gutterBottom>
            Найденные компании:
          </Typography>
          <List>
            {companies.map((company, index) => (
              <React.Fragment key={company.ID}>
                <ListItem 
                  button 
                  onClick={() => handleCompanyClick(company)}
                  sx={{ 
                    '&:hover': { 
                      bgcolor: 'rgba(0, 0, 0, 0.04)' 
                    } 
                  }}
                >
                  <ListItemText
                    primary={company.TITLE}
                    secondary={
                      <Box>
                        <Typography variant="body2" component="span">
                          ИНН: {company.UF_CRM_1741267701427 || 'Не указан'}
                        </Typography>
                        {company.ADDRESS && (
                          <Typography variant="body2" component="div">
                            Адрес: {company.ADDRESS}
                          </Typography>
                        )}
                        {company.CITY && (
                          <Typography variant="body2" component="div">
                            Город: {company.CITY}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                {index < companies.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </>
      )}
    </Paper>
  );
};
