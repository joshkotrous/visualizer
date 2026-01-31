"use client";

import { useState, useEffect } from "react";
import { X, Play, Mic, Monitor, Sparkles } from "lucide-react";

const STORAGE_KEY = "visualizer-welcome-seen";

export function WelcomeDialog() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen the welcome dialog before
    const hasSeenWelcome = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative max-w-md w-full mx-4 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pt-8">
          <h2 className="text-xl font-semibold text-white mb-6">Welcome to Visualizer</h2>

          <div className="space-y-5">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-300">
                1
              </div>
              <div>
                <p className="text-white font-medium">Click Start</p>
                <p className="text-zinc-400 text-sm mt-0.5">
                  Select <Play className="w-3.5 h-3.5 inline mx-1" /> Start at the top left
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-300">
                2
              </div>
              <div>
                <p className="text-white font-medium">Choose Audio Source</p>
                <p className="text-zinc-400 text-sm mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Mic className="w-3.5 h-3.5" /> Microphone
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Monitor className="w-3.5 h-3.5" /> System Audio
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span>Both</span>
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-300">
                3
              </div>
              <div>
                <p className="text-white font-medium">Play Some Music</p>
                <p className="text-zinc-400 text-sm mt-0.5">
                  Put on your favorite tracks
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-300">
                4
              </div>
              <div>
                <p className="text-white font-medium">Enjoy Sick Visuals</p>
                <p className="text-zinc-400 text-sm mt-0.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Watch the magic happen
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-full mt-8 py-2.5 px-4 bg-white text-black font-medium rounded hover:bg-zinc-200 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
