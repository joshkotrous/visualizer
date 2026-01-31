import { Waveform } from "./components/Waveform";
import { AudioControls } from "./components/AudioControls";
import DysonSphere from "./components/shaders/DysonSphere";
import ParticleCloud from "./components/shaders/ParticleCloud";
import { ThemeProvider } from "./components/providers/themeProvider";
import SineWaveGrid from "./components/shaders/SineWaveGrid";
export default function Home() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ThemeProvider>
        <div className="flex shrink-0">
          <AudioControls />
        </div>
        <div className="flex justify-center items-center gap-4 p-4">
          <div className="w-[280px] h-[200px]">
            <DysonSphere />
          </div>
          <div className="w-[280px] h-[200px]">
            <ParticleCloud />
          </div>
          <div className="w-[280px] h-[200px]">
            <SineWaveGrid />
          </div>
        </div>
        <div className="shrink-0">
          <Waveform height={150} />
        </div>
      </ThemeProvider>
    </div>
  );
}
