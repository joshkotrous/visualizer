"use client";

import { useState, useRef, useEffect } from "react";
import { useAudio, AudioSource } from "../contexts/AudioContext";
import { Play, Square, Mic, Monitor, ChevronDown } from "lucide-react";

const sourceOptions: { value: AudioSource; label: string }[] = [
  { value: "microphone", label: "Microphone" },
  { value: "system", label: "System Audio" },
  { value: "both", label: "Both" },
];

export function AudioControls() {
  const { isListening, error, currentSource, startAudio, stopAudio } = useAudio();
  const [selectedSource, setSelectedSource] = useState<AudioSource>("system");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStart = () => {
    startAudio(selectedSource);
    setIsOpen(false);
  };

  const handleSelectSource = (source: AudioSource) => {
    setSelectedSource(source);
    setIsOpen(false);
  };

  const SourceIcon = ({ source }: { source: AudioSource }) => (
    <span className="flex items-center gap-1">
      {(source === "microphone" || source === "both") && <Mic className="w-3.5 h-3.5" />}
      {(source === "system" || source === "both") && <Monitor className="w-3.5 h-3.5" />}
    </span>
  );

  return (
    <div className="flex items-center gap-4 p-4">
      {!isListening ? (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 p-1 px-2 text-sm"
          >
            <Play className="w-4 h-4" />
            Start
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 mt-1 min-w-[160px] rounded border border-zinc-800 bg-zinc-950 py-1 shadow-lg z-10">
              {sourceOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelectSource(option.value)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-800 ${
                    selectedSource === option.value ? "text-white" : "text-zinc-400"
                  }`}
                >
                  <SourceIcon source={option.value} />
                  {option.label}
                  {selectedSource === option.value && (
                    <span className="ml-auto text-zinc-500">●</span>
                  )}
                </button>
              ))}
              <div className="my-1 border-t border-zinc-800" />
              <button
                onClick={handleStart}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-white transition-colors hover:bg-zinc-800"
              >
                <Play className="w-3.5 h-3.5" />
                Start with {sourceOptions.find(o => o.value === selectedSource)?.label}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 text-sm text-zinc-500">
            <SourceIcon source={currentSource!} />
          </div>
          <button
            onClick={stopAudio}
            className="flex items-center gap-1.5 p-1 px-2 text-sm"
          >
            <Square className="w-4 h-4" />
            Stop
          </button>
        </>
      )}

      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}
