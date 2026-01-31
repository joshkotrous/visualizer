"use client";
import { Waveform } from "./components/Waveform";
import { AudioControls } from "./components/AudioControls";
import DysonSphere from "./components/shaders/DysonSphere";
import ParticleCloud from "./components/shaders/ParticleCloud";
import { ThemeProvider } from "./components/providers/themeProvider";
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

export default function Home() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ThemeProvider>
        <div className="flex shrink-0">
          <AudioControls />
          <ThemeDropdown />
        </div>
        
        <div className="flex-1 p-4 overflow-auto flex items-start justify-center">
          {/* Main grid - 4 columns, responsive */}
          <div className="grid grid-cols-4 w-full max-w-[1120px]">
            {/* Row 1 */}
            <div className="aspect-[7/5] border border-white/20 overflow-hidden">
              <DysonSphere />
            </div>
            <div className="aspect-[7/5] border border-l-0 border-white/20 overflow-hidden">
              <ParticleCloud />
            </div>
            <div className="aspect-[7/5] border border-l-0 border-white/20 overflow-hidden">
              <SineWaveGrid />
            </div>
            <div className="aspect-[7/5] border border-l-0 border-white/20 overflow-hidden">
              <DNAHelix />
            </div>
            
            {/* Row 2 */}
            <div className="aspect-[7/5] border border-t-0 border-white/20 overflow-hidden">
              <MagiCore />
            </div>
            <div className="aspect-[7/5] border border-t-0 border-l-0 border-white/20 overflow-hidden">
              <RadarSweep />
            </div>
            {/* Neural Web cell with nested grid */}
            <div className="aspect-[7/5] border border-t-0 border-l-0 border-white/20 overflow-hidden flex">
              <div className="w-1/2 h-full border-r border-white/20 overflow-hidden">
                <NeuralWeb />
              </div>
              <div className="w-1/2 h-full flex flex-col">
                <div className="w-full h-1/2 border-b border-white/20 overflow-hidden">
                  <NeuralPulse />
                </div>
                <div className="w-full h-1/2 overflow-hidden">
                  <NeuralStorm />
                </div>
              </div>
            </div>
            <div className="aspect-[7/5] border border-t-0 border-l-0 border-white/20 overflow-hidden">
              <AsciiAudioEffect />
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <Waveform height={150} />
        </div>
      </ThemeProvider>
    </div>
  );
}
