import { useEffect } from 'react';
import {
  exportAsCSV,
  exportAsZip,
  pointStorage,
  settingsStorage,
  type PointSettings,
} from './localStorage';
import type { InsertPoint } from './schema/schema';
import { useORStore } from './store/openroad-store';

// Custom hooks wrapping the localStorage layer, so components never touch
// storage and the Zustand store directly at the same time.

export const usePoints = () => {
  const { points, setPoints, addPoint, updatePoint, deletePoint } = useORStore();

  const savePoint = (data: InsertPoint) => {
    const savedPoint = pointStorage.save(data);
    addPoint(savedPoint);
    return savedPoint;
  };

  const updatePointById = (id: string, data: Partial<InsertPoint>) => {
    const updatedPoint = pointStorage.update(id, data);
    if (updatedPoint) {
      updatePoint(id, updatedPoint);
    }
    return updatedPoint;
  };

  const deletePointById = (id: string) => {
    pointStorage.delete(id);
    deletePoint(id);
  };

  return {
    data: points,
    setAll: setPoints,
    save: savePoint,
    update: updatePointById,
    delete: deletePointById,
  };
};

export const useSettings = () => {
  const { settings, setSettings } = useORStore();

  const saveSettings = (next: PointSettings) => {
    const saved = settingsStorage.save(next);
    setSettings(saved);
    return saved;
  };

  return {
    data: settings,
    save: saveSettings,
  };
};

// Export hook
export const useExport = () => {
  return {
    exportAsZip,
    exportAsCSV,
  };
};

// Hook to load all data from localStorage on app start
export const useLoadFromStorage = () => {
  const { loadFromStorage } = useORStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);
};
