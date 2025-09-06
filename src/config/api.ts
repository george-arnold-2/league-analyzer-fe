// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://la-backend-r0s6evltf-george-arnolds-projects.vercel.app';

// API endpoints
export const API_ENDPOINTS = {
  players: `${API_BASE_URL}/api/players`,
} as const;
