"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface PerformanceSettings {
  pixelRatio: number; // 0.5 = half res, 1 = full res, 2 = retina
  targetFPS: number; // 15, 30, 60
}

interface PerformanceContextType {
  settings: PerformanceSettings;
  setPixelRatio: (ratio: number) => void;
  setTargetFPS: (fps: number) => void;
}

const defaultSettings: PerformanceSettings = {
  pixelRatio: 1,
  targetFPS: 60,
};

const PerformanceContext = createContext<PerformanceContextType>({
  settings: defaultSettings,
  setPixelRatio: () => {},
  setTargetFPS: () => {},
});

export function PerformanceProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PerformanceSettings>(defaultSettings);

  const setPixelRatio = (ratio: number) => {
    setSettings((prev) => ({ ...prev, pixelRatio: ratio }));
  };

  const setTargetFPS = (fps: number) => {
    setSettings((prev) => ({ ...prev, targetFPS: fps }));
  };

  return (
    <PerformanceContext.Provider value={{ settings, setPixelRatio, setTargetFPS }}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformance() {
  return useContext(PerformanceContext);
}

// Helper to calculate frame delay for throttling
export function getFrameDelay(targetFPS: number): number {
  if (targetFPS >= 60) return 0; // No throttling
  return 1000 / targetFPS;
}
