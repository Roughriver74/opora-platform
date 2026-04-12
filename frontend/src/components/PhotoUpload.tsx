import React, { useRef, useState } from 'react';
import { Button, CircularProgress, Alert } from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
import { visitPhotoService } from '../services/visitPhotoService';

interface PhotoUploadProps {
  visitId: number;
  onUploaded: () => void;
}

export default function PhotoUpload({ visitId, onUploaded }: PhotoUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      let lat: number | undefined;
      let lon: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation?.getCurrentPosition(resolve, reject, { timeout: 5000 }),
        );
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch {
        // Координаты не обязательны
      }
      await visitPhotoService.upload(visitId, file, lat, lon);
      onUploaded();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Ошибка загрузки фото');
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <Button
        variant="outlined"
        startIcon={loading ? <CircularProgress size={20} /> : <PhotoCamera />}
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        fullWidth
      >
        Сделать фото
      </Button>
    </>
  );
}
