import React, { useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Typography,
  useMediaQuery,
  useTheme,
  SelectChangeEvent,
  Button,
  Divider,
} from "@mui/material";

// Теперь фильтр — просто столбец + значение (условие like подразумевается)
export interface FilterOption {
  column: string;
  value: string;
  operator: 'contains'
}

export interface Column {
  id: string;
  label: string;
  operator: 'contains'
  // type больше не используется для логики фильтрации (всё как строка + like)
}

interface Props {
  columns: Column[];
  initialFilters?: FilterOption[];
  onApply: (filters: FilterOption[]) => void;
}

const FilterForm: React.FC<Props> = ({
  columns,
  initialFilters = [],
  onApply,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [filters, setFilters] = useState<FilterOption[]>(() => {
    if (initialFilters.length > 0) {
      return initialFilters.map((f) => ({
        column: f.column || columns[0]?.id || "",
        value: f.value || "",
        operator: 'contains'
      }));
    }
    return [{ column: columns[0]?.id || "", value: "", operator: 'contains' }];
  });

  const handleColumnChange = (index: number, e: SelectChangeEvent<string>) => {
    const newFilters = [...filters];
    newFilters[index].column = e.target.value;
    setFilters(newFilters);
  };

  const handleValueChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newFilters = [...filters];
    newFilters[index].value = e.target.value;
    setFilters(newFilters);
  };



  const handleRemoveFilter = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters.length ? newFilters : [{ column: columns[0]?.id || "", value: "", operator: 'contains' }]);
  };

  const handleApply = () => {
    const validFilters = filters
      .filter((f) => f.column && f.value.trim() !== "")
      .map((f) => ({
        column: f.column,
        value: f.value.trim(),
        operator: 'contains' as const,
      }));
    onApply(validFilters);
  };

  return (
    <Box
      sx={{
        p: 2,
        backgroundColor: "background.paper",
        borderRadius: '20px',
        mb: 3,
      }}
    >
      <Typography variant="h6" gutterBottom>
        Фильтры
      </Typography>

      {filters.map((filter, index) => (
        <Grid container spacing={2} alignItems="center" key={index} sx={{ mb: 1 }}>
          {/* Столбец */}
          <Grid item xs={12} sm={5}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Столбец</InputLabel>
              <Select
                value={filter.column}
                label="Столбец"
                onChange={(e) => handleColumnChange(index, e)}
                disabled={!columns.length}
              >
                {columns.map((col) => (
                  <MenuItem key={col.id} value={col.id}>
                    {col.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Значение */}
          <Grid item xs={10} sm={6}>
            <TextField
              fullWidth
              label="Значение"
              value={filter.value}
              onChange={(e) => handleValueChange(index, e)}
              placeholder="Введите значение для поиска"
              size={isMobile ? "small" : "medium"}
            />
          </Grid>

          {/* Кнопка удаления */}
          <Grid item xs={2} sx={{ textAlign: "right" }}>
            {filters.length > 1 && (
              <Button
                size="small"
                color="error"
                onClick={() => handleRemoveFilter(index)}
              >
                ✕
              </Button>
            )}
          </Grid>
        </Grid>
      ))}



      <Divider sx={{ my: 2 }} />

      <Box sx={{ textAlign: "right" }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleApply}
          disabled={filters.every((f) => !f.column || !f.value.trim())}
        >
          Применить фильтры
        </Button>
      </Box>
    </Box>
  );
};

export default FilterForm;