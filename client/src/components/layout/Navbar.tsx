import React from 'react';
import { AppBar, Box, Toolbar, Typography, Button, Container } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import HomeIcon from '@mui/icons-material/Home';

const Navbar: React.FC = () => {
  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            noWrap
            component={RouterLink}
            to="/"
            sx={{
              mr: 2,
              display: 'flex',
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.1rem',
              color: 'inherit',
              textDecoration: 'none',
              alignItems: 'center',
            }}
          >
            <img 
              src="/logo.png" 
              alt="Бетон-Экспресс" 
              style={{ height: '40px', marginRight: '10px' }}
              onError={(e) => {
                // Если изображение не загружено, удаляем src
                e.currentTarget.style.display = 'none';
              }}
            />
            БЕТОН-ЭКСПРЕСС
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex' }}>
            <Button
              component={RouterLink}
              to="/"
              color="inherit"
              startIcon={<HomeIcon />}
              sx={{ my: 2, display: 'flex' }}
            >
              Главная
            </Button>
            <Button
              component={RouterLink}
              to="/admin"
              color="inherit"
              startIcon={<AdminPanelSettingsIcon />}
              sx={{ my: 2, display: 'flex' }}
            >
              Администрирование
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
