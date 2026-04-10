// frontend/src/components/FormBuilder/FormBuilderPage.tsx
import { Box, Tab, Tabs, Typography } from '@mui/material';
import React, { useState } from 'react';
import FormBuilder from './FormBuilder';
import { ENTITY_TYPE_LABELS, EntityType } from './types';

const ENTITY_TABS: EntityType[] = ['visit', 'clinic', 'contact', 'network_clinic'];

const FormBuilderPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EntityType>('visit');

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Редактор форм
      </Typography>

      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val as EntityType)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {ENTITY_TABS.map(et => (
          <Tab key={et} label={ENTITY_TYPE_LABELS[et]} value={et} />
        ))}
      </Tabs>

      <FormBuilder key={activeTab} entityType={activeTab} />
    </Box>
  );
};

export default FormBuilderPage;
