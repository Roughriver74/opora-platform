import { api } from './api';

export interface VisitPhoto {
  id: number;
  visit_id: number;
  organization_id: number;
  file_path: string;
  thumbnail_path: string | null;
  latitude: number | null;
  longitude: number | null;
  taken_at: string | null;
  uploaded_at: string;
  file_size_bytes: number | null;
}

/**
 * Returns the absolute URL for a stored photo file.
 * In production the frontend is served from the same origin as the backend
 * (nginx proxies /api/* to uvicorn and /uploads/* to the static volume),
 * so we use window.location.origin.
 * In development REACT_APP_API_URL is something like "http://localhost:8000/api",
 * so we strip the trailing "/api" suffix to get the server root.
 */
const getPhotoBaseUrl = (): string => {
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
  // Remove trailing "/api" if present so we get the server root
  return apiUrl.replace(/\/api\/?$/, '');
};

export const visitPhotoService = {
  upload: (
    visitId: number,
    file: File,
    latitude?: number,
    longitude?: number,
    takenAt?: string,
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    if (latitude !== undefined) formData.append('latitude', String(latitude));
    if (longitude !== undefined) formData.append('longitude', String(longitude));
    if (takenAt !== undefined) formData.append('taken_at', takenAt);
    return api
      .post<VisitPhoto>(`/visits/${visitId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  list: (visitId: number) =>
    api.get<VisitPhoto[]>(`/visits/${visitId}/photos`).then((r) => r.data),

  delete: (photoId: number) =>
    api.delete(`/visits/photos/${photoId}`),

  /**
   * Builds a full URL for a photo given its stored relative path.
   * filePath is stored as "{org_id}/{filename}".
   * Static files are served at /uploads/photos/ on the backend.
   */
  getPhotoUrl: (filePath: string): string => {
    const base = getPhotoBaseUrl();
    return `${base}/uploads/photos/${filePath}`;
  },
};
