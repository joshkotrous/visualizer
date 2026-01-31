"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";

export type AudioSource = "microphone" | "system" | "both";

interface AudioMetrics {
  bass: number;      // 0-1, low frequencies (20-250Hz)
  mid: number;       // 0-1, mid frequencies (250-2000Hz)
  treble: number;    // 0-1, high frequencies (2000-20000Hz)
  overall: number;   // 0-1, overall volume level
}

interface AudioContextState {
  isInitialized: boolean;
  isListening: boolean;
  error: string | null;
  waveformData: Uint8Array | null;
  frequencyData: Uint8Array | null;
  analyserNode: AnalyserNode | null;
  currentSource: AudioSource | null;
  audioMetrics: AudioMetrics;
}

interface AudioContextActions {
  startAudio: (source: AudioSource) => Promise<void>;
  stopAudio: () => void;
}

type AudioContextValue = AudioContextState & AudioContextActions;

const AudioContext = createContext<AudioContextValue | null>(null);

const FFT_SIZE = 2048;

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<Uint8Array | null>(null);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [currentSource, setCurrentSource] = useState<AudioSource | null>(null);
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics>({
    bass: 0,
    mid: 0,
    treble: 0,
    overall: 0,
  });

  const audioContextRef = useRef<globalThis.AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourcesRef = useRef<MediaStreamAudioSourceNode[]>([]);
  const streamsRef = useRef<MediaStream[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const waveformBufferRef = useRef<Uint8Array | null>(null);
  const frequencyBufferRef = useRef<Uint8Array | null>(null);

  // Cleanup function that can be called from event listeners
  const cleanup = useCallback(() => {
    // Stop animation loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Disconnect and close audio nodes
    sourcesRef.current.forEach((source) => {
      source.disconnect();
    });
    sourcesRef.current = [];

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
      setAnalyserNode(null);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop all tracks in all streams
    streamsRef.current.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });
    streamsRef.current = [];

    setIsListening(false);
    setWaveformData(null);
    setFrequencyData(null);
    setCurrentSource(null);
    setAudioMetrics({ bass: 0, mid: 0, treble: 0, overall: 0 });
  }, []);

  const updateAudioData = useCallback(() => {
    if (!analyserRef.current || !waveformBufferRef.current || !frequencyBufferRef.current) {
      return;
    }

    // Get time-domain data (waveform)
    analyserRef.current.getByteTimeDomainData(waveformBufferRef.current);
    // Get frequency data
    analyserRef.current.getByteFrequencyData(frequencyBufferRef.current);

    // Calculate audio metrics from frequency data
    // FFT_SIZE = 2048, so frequencyBinCount = 1024
    // Each bin represents ~23.4Hz (48000Hz sample rate / 2048)
    const freqData = frequencyBufferRef.current;
    const binCount = freqData.length;
    
    // Bass: ~20-250Hz (bins 0-10)
    let bassSum = 0;
    const bassEnd = Math.floor(binCount * 0.01); // ~10 bins
    for (let i = 0; i < bassEnd; i++) {
      bassSum += freqData[i];
    }
    const bass = bassSum / (bassEnd * 255);
    
    // Mid: ~250-2000Hz (bins 10-85)
    let midSum = 0;
    const midStart = bassEnd;
    const midEnd = Math.floor(binCount * 0.08);
    for (let i = midStart; i < midEnd; i++) {
      midSum += freqData[i];
    }
    const mid = midSum / ((midEnd - midStart) * 255);
    
    // Treble: ~2000-20000Hz (bins 85-850)
    let trebleSum = 0;
    const trebleStart = midEnd;
    const trebleEnd = Math.floor(binCount * 0.8);
    for (let i = trebleStart; i < trebleEnd; i++) {
      trebleSum += freqData[i];
    }
    const treble = trebleSum / ((trebleEnd - trebleStart) * 255);
    
    // Overall: average of all frequencies
    let overallSum = 0;
    for (let i = 0; i < binCount; i++) {
      overallSum += freqData[i];
    }
    const overall = overallSum / (binCount * 255);

    // Create new arrays for state updates to trigger re-renders
    setWaveformData(new Uint8Array(waveformBufferRef.current));
    setFrequencyData(new Uint8Array(frequencyBufferRef.current));
    setAudioMetrics({ bass, mid, treble, overall });

    animationFrameRef.current = requestAnimationFrame(updateAudioData);
  }, []);

  const startAudio = useCallback(async (source: AudioSource) => {
    try {
      setError(null);

      const streams: MediaStream[] = [];

      // Get microphone stream if needed
      if (source === "microphone" || source === "both") {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          video: false,
        });
        
        const micTracks = micStream.getAudioTracks();
        if (micTracks.length === 0) {
          throw new Error("No microphone audio track available. Please check your microphone permissions.");
        }
        
        // Listen for track end
        micTracks[0].addEventListener("ended", () => {
          cleanup();
        });
        
        streams.push(micStream);
      }

      // Get system audio stream if needed
      if (source === "system" || source === "both") {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          video: true, // Required for getDisplayMedia, but we won't use it
        });

        // Stop the video track immediately since we only need audio
        displayStream.getVideoTracks().forEach((track) => track.stop());

        const systemTracks = displayStream.getAudioTracks();
        if (systemTracks.length === 0) {
          // Cleanup any mic stream we already got
          streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
          throw new Error("No system audio track available. Make sure to check 'Share audio' when selecting a tab or window.");
        }

        // Listen for track end
        systemTracks[0].addEventListener("ended", () => {
          cleanup();
        });

        streams.push(displayStream);
      }

      streamsRef.current = streams;
      setCurrentSource(source);

      // Create audio context
      const audioCtx = new window.AudioContext();
      audioContextRef.current = audioCtx;

      // Create analyser node
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      setAnalyserNode(analyser);

      // Create and connect sources from all streams
      const sources: MediaStreamAudioSourceNode[] = [];
      for (const stream of streams) {
        const mediaSource = audioCtx.createMediaStreamSource(stream);
        mediaSource.connect(analyser);
        sources.push(mediaSource);
      }
      sourcesRef.current = sources;
      // Note: We don't connect to destination to avoid feedback

      // Initialize buffers
      const bufferLength = analyser.frequencyBinCount;
      waveformBufferRef.current = new Uint8Array(bufferLength);
      frequencyBufferRef.current = new Uint8Array(bufferLength);

      setIsInitialized(true);
      setIsListening(true);

      // Start the animation loop
      updateAudioData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to access audio";
      setError(message);
      console.error("Audio initialization error:", err);
    }
  }, [updateAudioData, cleanup]);

  const stopAudio = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  const value: AudioContextValue = {
    isInitialized,
    isListening,
    error,
    waveformData,
    frequencyData,
    analyserNode,
    currentSource,
    audioMetrics,
    startAudio,
    stopAudio,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
}
