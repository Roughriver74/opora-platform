import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import useBitrixOptions, { BitrixDataSource } from '../../hooks/useBitrixOptions';
import { FormFieldOption } from '../../types';

interface BitrixOptionsLoaderProps {
  onOptionsLoaded: (options: FormFieldOption[]) => void;
  currentOptions?: FormFieldOption[];
}

const BitrixOptionsLoader: React.FC<BitrixOptionsLoaderProps> = ({
  onOptionsLoaded,
  currentOptions = [],
}) => {
  const [selectedSource, setSelectedSource] = useState<string>('');
  const { options, loading, error, loadOptions, clearOptions } = useBitrixOptions();

  const dataSources = [
    { value: 'products', label: 'Товары/Услуги' },
    { value: 'companies', label: 'Компании' },
    { value: 'contacts', label: 'Контакты' },
  ];

  const handleSourceChange = (sourceType: string) => {
    setSelectedSource(sourceType);
    clearOptions();
  };

  const handleLoadOptions = async () => {
    if (!selectedSource) return;

    const source: BitrixDataSource = {
      type: selectedSource as 'products' | 'companies' | 'contacts',
    };

    await loadOptions(source);
  };

  const handleApplyOptions = () => {
    onOptionsLoaded(options);
  };

  const handleClearOptions = () => {
    clearOptions();
    onOptionsLoaded([]);
  };

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Загрузка значений из Битрикс24
      </Typography>
      
      <Stack spacing={2}>
        <FormControl fullWidth size="small">
          <InputLabel>Источник данных</InputLabel>
          <Select
            value={selectedSource}
            onChange={(e) => handleSourceChange(e.target.value)}
            label="Источник данных"
          >
            {dataSources.map((source) => (
              <MenuItem key={source.value} value={source.value}>
                {source.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={handleLoadOptions}
            disabled={!selectedSource || loading}
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            size="small"
          >
            {loading ? 'Загрузка...' : 'Загрузить значения'}
          </Button>

          {options.length > 0 && (
            <Button
              variant="contained"
              onClick={handleApplyOptions}
              size="small"
              color="primary"
            >
              Применить ({options.length})
            </Button>
          )}

          {currentOptions.length > 0 && (
            <Button
              variant="outlined"
              onClick={handleClearOptions}
              size="small"
              color="error"
            >
              Очистить
            </Button>
          )}
        </Stack>

        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        {options.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Загружено значений: {options.length}
            </Typography>
            <Box sx={{ maxHeight: 100, overflow: 'auto', mt: 1 }}>
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {options.slice(0, 10).map((option, index) => (
                  <Chip
                    key={index}
                    label={option.label}
                    size="small"
                    variant="outlined"
                  />
                ))}
                {options.length > 10 && (
                  <Chip
                    label={`+${options.length - 10} еще`}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                )}
              </Stack>
            </Box>
          </Box>
        )}

        {currentOptions.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Текущие значения: {currentOptions.length}
            </Typography>
            <Box sx={{ maxHeight: 100, overflow: 'auto', mt: 1 }}>
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {currentOptions.slice(0, 10).map((option, index) => (
                  <Chip
                    key={index}
                    label={option.label}
                    size="small"
                    color="primary"
                  />
                ))}
                {currentOptions.length > 10 && (
                  <Chip
                    label={`+${currentOptions.length - 10} еще`}
                    size="small"
                    color="primary"
                  />
                )}
              </Stack>
            </Box>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default BitrixOptionsLoader;
