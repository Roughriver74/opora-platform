import React, { useState } from 'react';
import { Button, CircularProgress, Alert } from '@mui/material';
import { LocationOn, Logout } from '@mui/icons-material';
import { api } from '../services/api';

interface CheckinButtonProps {
  visitId: number;
  checkinAt: string | null;
  checkoutAt: string | null;
  onUpdate: () => void;
}

export default function CheckinButton({
  visitId,
  checkinAt,
  checkoutAt,
  onUpdate,
}: CheckinButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = (): Promise<{ latitude: number; longitude: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Геолокация не поддерживается'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => reject(new Error('Не удалось определить местоположение')),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });

  const handleCheckin = async () => {
    setLoading(true);
    setError(null);
    try {
      const coords = await getLocation();
      await api.post(`/visits/${visitId}/checkin`, coords);
      onUpdate();
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const coords = await getLocation();
      await api.post(`/visits/${visitId}/checkout`, coords);
      onUpdate();
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkoutAt) {
    return null;
  }

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      {!checkinAt ? (
        <Button
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={20} /> : <LocationOn />}
          onClick={handleCheckin}
          disabled={loading}
          fullWidth
          size="large"
        >
          Начать визит
        </Button>
      ) : (
        <Button
          variant="contained"
          color="secondary"
          startIcon={loading ? <CircularProgress size={20} /> : <Logout />}
          onClick={handleCheckout}
          disabled={loading}
          fullWidth
          size="large"
        >
          Завершить визит
        </Button>
      )}
    </>
  );
}
