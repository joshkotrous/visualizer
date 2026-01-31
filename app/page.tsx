import { Waveform } from "./components/Waveform";
import { AudioControls } from "./components/AudioControls";
import DysonSphere from "./components/shaders/DysonSphere";
import ParticleCloud from "./components/shaders/ParticleCloud";
import { ThemeProvider } from "./components/providers/themeProvider";
import SineWaveGrid from "./components/shaders/SineWaveGrid";
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <ThemeProvider>
        <AudioControls />
        <div className="grid grid-cols-3 gap-4  ">
          <DysonSphere />
          <ParticleCloud />
          <SineWaveGrid />
        </div>
        <Waveform height={200} />
      </ThemeProvider>
    </div>
  );
}
