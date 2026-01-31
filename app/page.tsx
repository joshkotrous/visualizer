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
        <div className="p-4">
          <div className="border flex justify-center items-center gap-8 overflow-visible">
            <div className=" w-[280px] h-[200px] overflow-visible">
              <DysonSphere />
            </div>
            <div className="w-[280px] h-[200px] overflow-visible">
              <ParticleCloud />
            </div>
            <div className="w-[280px] h-[200px] overflow-visible">
              <SineWaveGrid />
            </div>
            <div className="w-[280px] h-[200px] overflow-visible">
              <DNAHelix />
            </div>
          </div>

          <div className="border border-t-0 flex justify-center items-center gap-8 overflow-visible">
            <div className="border-r w-[280px] h-[200px] overflow-visible">
              <MagiCore />
            </div>
            <div className=" border-r w-[280px] h-[200px] overflow-visible">
              <RadarSweep />
            </div>
            <div className="w-[280px] h-[200px] grid grid-cols-2 overflow-visible ">
              <NeuralWeb />
              <div className="grid border-l  grid-cols-1">
                <div className="border-b overflow-visible">
                  <NeuralPulse />
                </div>
                <div className="overflow-visible">
                  <NeuralStorm />
                </div>
              </div>
            </div>
            <div className="border-l w-[280px] h-[200px] overflow-visible">
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
