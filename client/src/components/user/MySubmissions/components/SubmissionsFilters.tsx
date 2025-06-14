import React from 'react';
import {
  Paper,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { SubmissionsFiltersProps } from '../types';

export const SubmissionsFilters: React.FC<SubmissionsFiltersProps> = ({
  filters,
  onFilterChange,
  bitrixStages,
  users,
  isAdmin
}) => {
  const handleResetFilters = () => {
    onFilterChange({});
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <TextField
          label="Поиск"
          value={filters.search || ''}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1 }} />
          }}
          size="small"
          sx={{ minWidth: 200 }}
        />
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Статус</InputLabel>
          <Select
            value={filters.status || ''}
            onChange={(e) => onFilterChange({ status: e.target.value || undefined })}
            label="Статус"
          >
            <MenuItem value="">Все статусы</MenuItem>
            {bitrixStages.map((stage) => (
              <MenuItem key={stage.id} value={stage.id}>{stage.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {isAdmin && (
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Пользователь</InputLabel>
            <Select
              value={filters.userId || ''}
              onChange={(e) => onFilterChange({ userId: e.target.value || undefined })}
              label="Пользователь"
            >
              <MenuItem value="">Все пользователи</MenuItem>
              {users.map((user) => (
                <MenuItem key={user._id} value={user._id}>
                  {user.firstName} {user.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Button
          startIcon={<FilterIcon />}
          onClick={handleResetFilters}
          variant="outlined"
          size="small"
        >
          Сбросить фильтры
        </Button>
      </Stack>
    </Paper>
  );
}; 