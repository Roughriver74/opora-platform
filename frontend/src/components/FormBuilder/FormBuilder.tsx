// frontend/src/components/FormBuilder/FormBuilder.tsx
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Alert, Box, Button, CircularProgress, Snackbar } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import FieldList from './FieldList';
import FieldPreviewDialog from './FieldPreviewDialog';
import FieldSettingsDrawer from './FieldSettingsDrawer';
import { EntityType, FieldDefinition, FormTemplate, generateKey } from './types';

interface Props {
  entityType: EntityType;
}

const DRAWER_WIDTH = 420;

const FormBuilder: React.FC<Props> = ({ entityType }) => {
  const queryClient = useQueryClient();
  const { isOrgAdmin } = useAuth();

  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  // Check if Bitrix24 is configured (org has webhook)
  const { data: settings } = useQuery(['globalSettings'], async () => {
    const res = await api.get('/settings/');
    return res.data as Record<string, string>;
  });
  const hasBitrix = !!(settings?.bitrix24_webhook_url);

  const { isLoading } = useQuery<FormTemplate>(
    ['formTemplate', entityType],
    async () => {
      const res = await api.get(`/form-templates/${entityType}`);
      return res.data;
    },
    {
      onSuccess: data => {
        setFields(data.fields ?? []);
        setHasChanges(false);
      },
    },
  );

  const saveMutation = useMutation(
    async (fieldsData: FieldDefinition[]) => {
      const res = await api.put(`/form-templates/${entityType}`, { fields: fieldsData });
      return res.data;
    },
    {
      onSuccess: () => {
        setHasChanges(false);
        queryClient.invalidateQueries(['formTemplate', entityType]);
        setSnackbar({ open: true, message: 'Шаблон формы сохранён', severity: 'success' });
      },
      onError: () => {
        setSnackbar({ open: true, message: 'Ошибка при сохранении', severity: 'error' });
      },
    },
  );

  const markChanged = useCallback(() => setHasChanges(true), []);

  const addField = () => {
    const newKey = generateKey(`Поле ${fields.length + 1}`);
    let uniqueKey = newKey;
    let suffix = 1;
    while (fields.some(f => f.key === uniqueKey)) {
      uniqueKey = `${newKey}_${suffix}`;
      suffix++;
    }
    const newField: FieldDefinition = {
      key: uniqueKey,
      label: '',
      type: 'text',
      required: false,
    };
    const newIndex = fields.length;
    setFields(prev => [...prev, newField]);
    setSelectedIndex(newIndex);
    markChanged();
  };

  const deleteField = (index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
    setSelectedIndex(null);
    markChanged();
  };

  const updateField = (index: number, patch: Partial<FieldDefinition>) => {
    setFields(prev => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
    markChanged();
  };

  const reorderFields = (newFields: FieldDefinition[]) => {
    setFields(newFields);
    markChanged();
  };

  const selectedField = selectedIndex !== null ? fields[selectedIndex] : null;

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ display: 'flex', gap: 0 }}>
      {/* Main content */}
      <Box
        sx={{
          flex: 1,
          transition: 'margin-right 0.3s',
          mr: selectedField ? `${DRAWER_WIDTH}px` : 0,
        }}
      >
        {/* Toolbar */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={() => setPreviewOpen(true)}
          >
            Просмотр
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!hasChanges || saveMutation.isLoading || !isOrgAdmin}
            onClick={() => saveMutation.mutate(fields)}
          >
            {hasChanges ? 'Сохранить *' : 'Сохранено'}
          </Button>
        </Box>

        <FieldList
          fields={fields}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          onDelete={deleteField}
          onReorder={reorderFields}
          onAdd={addField}
        />
      </Box>

      {/* Drawer */}
      <FieldSettingsDrawer
        open={!!selectedField}
        field={selectedField}
        entityType={entityType}
        hasBitrix={hasBitrix}
        onClose={() => setSelectedIndex(null)}
        onChange={patch => selectedIndex !== null && updateField(selectedIndex, patch)}
      />

      <FieldPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        entityType={entityType}
        fields={fields}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default FormBuilder;
