"use client";

import { useRef, useEffect, useState } from "react";
import { useAudio } from "../contexts/AudioContext";

interface WaveformProps {
  height?: number;
  lineColor?: string;
  backgroundColor?: string;
}

export function Waveform({
  height = 200,
  lineColor = "#22c55e",
  backgroundColor = "#0a0a0a",
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const { waveformData, isListening } = useAudio();

  // Handle resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (!waveformData || !isListening) {
      // Draw flat line when not listening
      ctx.beginPath();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    // Draw waveform
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;

    const sliceWidth = width / waveformData.length;
    let x = 0;

    for (let i = 0; i < waveformData.length; i++) {
      // Convert byte value (0-255) to normalized value (0-1)
      const v = waveformData[i] / 255.0;
      // Map to canvas height
      const y = v * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();
  }, [waveformData, width, height, lineColor, backgroundColor, isListening]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: "100%", height }}
      />
    </div>
  );
}
