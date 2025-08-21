import { useState, useEffect, useCallback } from 'react';
import { useSystemSettings } from './useSystemSettings';

export interface MosaicoItem {
  id: string;
  name: string;
  url: string;
  type: string; // "image" o "video"
  position: number; // 1 para Mosaico 1, 2 para Mosaico 2
  duration?: number; // duración en segundos para imágenes
}

interface UseMosaicItemsResult {
  mosaico1Items: MosaicoItem[];
  mosaico2Items: MosaicoItem[];
  isLoading: boolean;
  error: string | null;
  refreshMosaicItems: () => Promise<void>;
}

export function useMosaicItems(screenId: string): UseMosaicItemsResult {
  const [mosaico1Items, setMosaico1Items] = useState<MosaicoItem[]>([]);
  const [mosaico2Items, setMosaico2Items] = useState<MosaicoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSystemSettings();

  // Función para cargar los elementos de mosaico desde la API
  const fetchMosaicItems = useCallback(async () => {
    if (!screenId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Obtener los elementos de mosaico desde la API
      const response = await fetch(`/api/screens/${screenId}/mosaic-items`);
      
      if (!response.ok) {
        throw new Error(`Error al cargar elementos de mosaico: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Separar los elementos por posición
      const mosaico1 = data.filter((item: MosaicoItem) => item.position === 1);
      const mosaico2 = data.filter((item: MosaicoItem) => item.position === 2);
      
      setMosaico1Items(mosaico1);
      setMosaico2Items(mosaico2);
      
      console.log(`✅ Elementos de mosaico cargados - Mosaico 1: ${mosaico1.length}, Mosaico 2: ${mosaico2.length}`);
    } catch (err) {
      console.error('❌ Error al cargar elementos de mosaico:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar elementos de mosaico');
    } finally {
      setIsLoading(false);
    }
  }, [screenId]);

  // Cargar elementos de mosaico al iniciar
  useEffect(() => {
    fetchMosaicItems();
  }, [fetchMosaicItems]);

  // Función para refrescar manualmente los elementos de mosaico
  const refreshMosaicItems = useCallback(async () => {
    await fetchMosaicItems();
  }, [fetchMosaicItems]);

  return {
    mosaico1Items,
    mosaico2Items,
    isLoading,
    error,
    refreshMosaicItems
  };
}