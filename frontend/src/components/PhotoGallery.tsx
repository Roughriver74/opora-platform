import React, { useState } from 'react';
import {
  ImageList,
  ImageListItem,
  ImageListItemBar,
  IconButton,
  Typography,
  Alert,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import { VisitPhoto, visitPhotoService } from '../services/visitPhotoService';

interface PhotoGalleryProps {
  photos: VisitPhoto[];
  onDeleted: () => void;
  canDelete?: boolean;
}

export default function PhotoGallery({ photos, onDeleted, canDelete = true }: PhotoGalleryProps) {
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (photoId: number) => {
    if (!window.confirm('Удалить фото?')) return;
    setDeleteError(null);
    try {
      await visitPhotoService.delete(photoId);
      onDeleted();
    } catch (e: any) {
      setDeleteError(e.response?.data?.detail || 'Не удалось удалить фото');
    }
  };

  if (photos.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 2 }}>
        Фотоотчёт пуст
      </Typography>
    );
  }

  return (
    <>
      {deleteError && <Alert severity="error" sx={{ mb: 1 }}>{deleteError}</Alert>}
      <ImageList cols={3} gap={8}>
      {photos.map((photo) => (
        <ImageListItem key={photo.id}>
          <img
            src={visitPhotoService.getPhotoUrl(photo.file_path)}
            alt={`Фото ${photo.id}`}
            loading="lazy"
            style={{ borderRadius: 8, objectFit: 'cover', height: 200 }}
          />
          <ImageListItemBar
            subtitle={photo.uploaded_at ? new Date(photo.uploaded_at).toLocaleTimeString('ru-RU') : ''}
            actionIcon={
              canDelete ? (
                <IconButton sx={{ color: 'rgba(255,255,255,0.7)' }} onClick={() => handleDelete(photo.id)}>
                  <Delete />
                </IconButton>
              ) : undefined
            }
          />
        </ImageListItem>
      ))}
    </ImageList>
    </>
  );
}
