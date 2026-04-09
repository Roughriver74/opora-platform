import React from 'react';
import { Button, ButtonProps, Tooltip } from '@mui/material';

interface CenteredIconButtonProps extends ButtonProps {
  icon: React.ReactNode;
  text?: string;
  showText?: boolean;
  tooltipText?: string;
}

const CenteredIconButton: React.FC<CenteredIconButtonProps> = ({
  icon,
  text,
  showText = true,
  tooltipText,
  ...buttonProps
}) => {
  const buttonContent = (
    <Button
      {...buttonProps}
      sx={{
        ...buttonProps.sx,
        minWidth: showText ? undefined : '40px',
        width: showText ? undefined : '40px',
        height: showText ? undefined : '40px',
        padding: showText ? undefined : '8px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {showText ? (
        <>
          {icon}
          {text && <span style={{ marginLeft: '8px' }}>{text}</span>}
        </>
      ) : (
        icon
      )}
    </Button>
  );

  return tooltipText && !showText ? (
    <Tooltip title={tooltipText} arrow>
      {buttonContent}
    </Tooltip>
  ) : (
    buttonContent
  );
};

export default CenteredIconButton;
