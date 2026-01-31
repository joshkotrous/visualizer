"use client";
import { Waveform } from "./components/Waveform";
import { AudioControls } from "./components/AudioControls";
import DysonSphere from "./components/shaders/DysonSphere";
import ParticleCloud from "./components/shaders/ParticleCloud";
import { ThemeProvider } from "./components/providers/themeProvider";
import SineWaveGrid from "./components/shaders/SineWaveGrid";
import { AsciiAudioEffect } from "./components/shaders/AsciiAudioEffect";
import { ThemeDropdown } from "./components/ThemeDropdown";
export default function Home() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ThemeProvider>
        <div className="flex shrink-0">
          <AudioControls />
          <ThemeDropdown />
        </div>
        <div className="flex justify-center items-center gap-8 p-4 overflow-visible">
          <div className="w-[280px] h-[200px] overflow-visible">
            <DysonSphere />
          </div>
          <div className="w-[280px] h-[200px] overflow-visible">
            <ParticleCloud />
          </div>
          <div className="w-[280px] h-[200px] overflow-visible">
            <SineWaveGrid />
          </div>
        </div>

        <div className="flex justify-center items-center gap-8 p-4 overflow-visible">
          <div className="w-[280px] h-[200px] overflow-visible">
            <AsciiAudioEffect />
          </div>
        </div>
        <div className="shrink-0">
          <Waveform height={150} />
        </div>
      </ThemeProvider>
    </div>
  );
}
