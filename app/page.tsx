"use client";
import { Waveform } from "./components/Waveform";
import { AudioControls } from "./components/AudioControls";
import DysonSphere from "./components/shaders/DysonSphere";
import ParticleCloud from "./components/shaders/ParticleCloud";
import { ThemeProvider, useTheme } from "./components/providers/themeProvider";
import SineWaveGrid from "./components/shaders/SineWaveGrid";
import { AsciiAudioEffect } from "./components/shaders/AsciiAudioEffect";
import MagiCore from "./components/shaders/MagiCore";
import RadarSweep from "./components/shaders/RadarSweep";
import NeuralWeb from "./components/shaders/NeuralWeb";
import NeuralPulse from "./components/shaders/NeuralPulse";
import NeuralStorm from "./components/shaders/NeuralStorm";
import NeuralConstellation from "./components/shaders/NeuralConstellation";
import DNAHelix from "./components/shaders/DNAHelix";
import { ThemeDropdown } from "./components/ThemeDropdown";
import BloomEffect from "./components/shaders/BloomEffect";
import ColoredNoiseOverlay from "./components/shaders/ColoredNoiseOverlay";
import TFTOverlay from "./components/shaders/TFTOverlay";
import { useAudio } from "./contexts/AudioContext";
import { PerformanceProvider } from "./contexts/PerformanceContext";
import { PerformanceControls } from "./components/PerformanceControls";
import { WelcomeDialog } from "./components/WelcomeDialog";

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
      result[3],
      16
    )}`;
  }
  return "34, 197, 94"; // fallback green
}

function VisualizerGrid() {
  const { theme } = useTheme() as {
    theme: { config: { border: string; primary: string } } | null;
  };
  const { audioMetrics, intensity } = useAudio();

  const borderColor =
    theme?.config?.border || theme?.config?.primary || "#22c55e";

  // Calculate glow intensity from audio (mids/highs weighted for responsiveness)
  const glowIntensity =
    (audioMetrics.treble * 0.4 +
      audioMetrics.mid * 0.4 +
      audioMetrics.bass * 0.2) *
    intensity;
  const glowSize = 3 + glowIntensity * 15; // 3px base, up to 18px at peak
  const glowOpacity = 0.15 + glowIntensity * 0.45; // 0.15 base, up to 0.6 at peak
  const borderOpacity = 0.2 + glowIntensity * 0.6; // 0.2 base, up to 0.8 at peak

  // Use gap approach: grid background = border color, gap reveals it as borders
  const borderRgb = hexToRgb(borderColor);
  const gridStyle = {
    backgroundColor: `rgba(${borderRgb}, ${borderOpacity})`,
    padding: "2px",
    boxShadow: `0 0 ${glowSize}px rgba(${borderRgb}, ${glowOpacity})`,
    transition: "box-shadow 0.05s ease-out, background-color 0.05s ease-out",
  };
  const gapStyle = { gap: "2px" };

  return (
    <div className="flex-1 p-4 overflow-auto flex items-start justify-center">
      {/* Main grid - 4 columns, responsive. Background shows through gap as borders */}
      <div
        className="grid grid-cols-4 w-full max-w-[1120px]"
        style={{ ...gridStyle, ...gapStyle }}
      >
        {/* Row 1-2 - DysonSphere spans 2 columns and 2 rows */}
        <div className="col-span-2 row-span-2 overflow-hidden bg-[#0a0a0a]">
          <DysonSphere />
        </div>

        {/* Row 1 right side */}
        <div className="aspect-[7/5] overflow-hidden bg-[#0a0a0a]">
          <SineWaveGrid />
        </div>
        <div className="aspect-[7/5] overflow-hidden bg-[#0a0a0a]">
          <ParticleCloud />
        </div>

        {/* Row 2 right side - Neural cluster */}
        <div
          className="col-span-2 aspect-[7/5] overflow-hidden flex"
          style={{ gap: "2px" }}
        >
          <div className="w-1/2 h-full overflow-hidden bg-[#0a0a0a]">
            <NeuralWeb />
          </div>
          <div className="w-1/2 h-full flex flex-col" style={{ gap: "2px" }}>
            <div className="w-full flex-1 overflow-hidden bg-[#0a0a0a]">
              <NeuralPulse />
            </div>
            <div className="w-full flex-1 overflow-hidden bg-[#0a0a0a]">
              <NeuralStorm />
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="aspect-[7/5] overflow-hidden bg-[#0a0a0a]">
          <DNAHelix />
        </div>
        <div className="aspect-[7/5] overflow-hidden bg-[#0a0a0a]">
          <MagiCore />
        </div>
        <div className="aspect-[7/5] overflow-hidden bg-[#0a0a0a]">
          <RadarSweep />
        </div>
        <div className="aspect-[7/5] overflow-hidden bg-[#0a0a0a]">
          <AsciiAudioEffect />
        </div>

        {/* Row 3 - Neural cluster spans full width */}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <PerformanceProvider>
        <ThemeProvider>
          <ColoredNoiseOverlay />
          {/* <MonochromeNoiseOverlay /> */}
          <TFTOverlay />
          <WelcomeDialog />
          <div className="flex shrink-0 items-center">
            <AudioControls />
            <ThemeDropdown />
            <PerformanceControls />
          </div>

          <VisualizerGrid />

          <div className="shrink-0">
            <Waveform height={150} />
          </div>
        </ThemeProvider>
      </PerformanceProvider>
    </div>
  );
}
