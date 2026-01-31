"use client";

import { usePerformance } from "../contexts/PerformanceContext";

export function PerformanceControls() {
  const { settings, setPixelRatio, setTargetFPS } = usePerformance();

  return (
    <div className="flex items-center gap-4 px-4 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-white/60">Resolution:</span>
        <select
          value={settings.pixelRatio}
          onChange={(e) => setPixelRatio(parseFloat(e.target.value))}
          className="bg-transparent border border-white/20 rounded px-2 py-1 text-white/80 text-xs"
        >
          <option value={0.5} className="bg-black">Low (0.5x)</option>
          <option value={0.75} className="bg-black">Medium (0.75x)</option>
          <option value={1} className="bg-black">High (1x)</option>
          <option value={2} className="bg-black">Ultra (2x)</option>
        </select>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-white/60">FPS:</span>
        <select
          value={settings.targetFPS}
          onChange={(e) => setTargetFPS(parseInt(e.target.value))}
          className="bg-transparent border border-white/20 rounded px-2 py-1 text-white/80 text-xs"
        >
          <option value={15} className="bg-black">15</option>
          <option value={30} className="bg-black">30</option>
          <option value={60} className="bg-black">60</option>
        </select>
      </div>
    </div>
  );
}
