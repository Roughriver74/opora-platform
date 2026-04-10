import React, { useState, useEffect } from 'react';
import { Alert, Collapse } from '@mui/material';
import { WifiOff } from '@mui/icons-material';

const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <Collapse in={isOffline}>
      <Alert
        severity="warning"
        icon={<WifiOff fontSize="small" />}
        sx={{
          borderRadius: 0,
          py: 0.5,
          fontSize: '0.8rem',
          '& .MuiAlert-message': {
            py: 0,
          },
        }}
      >
        Нет подключения к интернету
      </Alert>
    </Collapse>
  );
};

export default OfflineIndicator;
