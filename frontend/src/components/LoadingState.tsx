import React from 'react';
import { Box, Skeleton } from '@mui/material';

interface LoadingStateProps {
  rows?: number;
}

const LoadingState: React.FC<LoadingStateProps> = ({ rows = 3 }) => {
  return (
    <Box sx={{ width: '100%', py: 2 }}>
      {/* Header skeleton */}
      <Skeleton
        variant="rectangular"
        height={28}
        width="40%"
        sx={{ borderRadius: 1, mb: 2 }}
      />

      {/* Row skeletons */}
      {Array.from({ length: rows }, (_, index) => (
        <Box key={index} sx={{ mb: 2 }}>
          <Skeleton
            variant="rectangular"
            height={56}
            sx={{
              borderRadius: 1.5,
              width: index === rows - 1 ? '85%' : '100%',
            }}
          />
        </Box>
      ))}

      {/* Secondary detail skeleton */}
      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
        <Skeleton
          variant="rectangular"
          height={20}
          width="25%"
          sx={{ borderRadius: 1 }}
        />
        <Skeleton
          variant="rectangular"
          height={20}
          width="15%"
          sx={{ borderRadius: 1 }}
        />
      </Box>
    </Box>
  );
};

export default LoadingState;
