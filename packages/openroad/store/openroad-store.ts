import { create } from 'zustand';
import { pointStorage, settingsStorage, type PointSettings } from '../localStorage';
import type { Point } from '../schema/schema';

interface OpenRoadStore {
  points: Point[];
  settings: PointSettings;

  // Point highlighted from the table so its map marker stands out (and vice
  // versa). Not persisted — it only tracks the current hover/selection.
  selectedPointId: string | null;
  setSelectedPointId: (id: string | null) => void;

  setPoints: (points: Point[]) => void;
  addPoint: (point: Point) => void;
  updatePoint: (id: string, point: Point) => void;
  deletePoint: (id: string) => void;

  setSettings: (settings: PointSettings) => void;

  // Load from localStorage
  loadFromStorage: () => void;
}

export const useORStore = create<OpenRoadStore>((set) => ({
  points: pointStorage.getAll(),
  settings: settingsStorage.get(),

  selectedPointId: null,
  setSelectedPointId: (selectedPointId) => set({ selectedPointId }),

  setPoints: (points) => set({ points }),
  addPoint: (point) => set((state) => ({ points: [...state.points, point] })),
  updatePoint: (id, point) => set((state) => ({
    points: state.points.map(p => p.id === id ? point : p),
  })),
  deletePoint: (id) => set((state) => ({
    points: state.points.filter(p => p.id !== id),
  })),

  setSettings: (settings) => set({ settings }),

  loadFromStorage: () => set({
    points: pointStorage.getAll(),
    settings: settingsStorage.get(),
  }),
}));
