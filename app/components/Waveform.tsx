"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useAudio } from "../contexts/AudioContext";
import { useTheme } from "./providers/themeProvider";

interface WaveformProps {
  height?: number;
}

// Convert hex to rgba
function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
  }
  return `rgba(34, 197, 94, ${alpha})`;
}

export function Waveform({ height = 150 }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const [width, setWidth] = useState(800);
  const { waveformData, isListening } = useAudio();
  const { theme } = useTheme() as { theme: { config: { shader?: string; primary: string } } | null };
  const waveformRef = useRef<Uint8Array | null>(null);
  
  // Get shader color from theme
  const lineColor = theme?.config?.shader || theme?.config?.primary || "#22c55e";

  // Update waveform data ref
  useEffect(() => {
    waveformRef.current = waveformData;
  }, [waveformData]);

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

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, width, height);

    const data = waveformRef.current;
    
    // Draw center line (baseline)
    ctx.beginPath();
    ctx.strokeStyle = hexToRgba(lineColor, 0.2);
    ctx.lineWidth = 1;
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (!data || !isListening) {
      // Draw flat line with glow when not listening
      // Glow layer
      ctx.beginPath();
      ctx.strokeStyle = hexToRgba(lineColor, 0.3);
      ctx.lineWidth = 8;
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 15;
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Main line
      ctx.beginPath();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    } else {
      // Draw waveform with glow effect
      const sliceWidth = width / data.length;

      // Outer glow layer
      ctx.beginPath();
      ctx.strokeStyle = hexToRgba(lineColor, 0.15);
      ctx.lineWidth = 12;
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 20;
      
      let x = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 255.0;
        const y = v * height;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Middle glow layer
      ctx.beginPath();
      ctx.strokeStyle = hexToRgba(lineColor, 0.4);
      ctx.lineWidth = 5;
      
      x = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 255.0;
        const y = v * height;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();

      // Main waveform line
      ctx.beginPath();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      
      x = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 255.0;
        const y = v * height;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();
    }

    // Occasional interference line (subtle)
    if (Math.random() > 0.98) {
      const interferenceY = Math.random() * height;
      ctx.fillStyle = hexToRgba(lineColor, 0.15);
      ctx.fillRect(0, interferenceY, width, 1);
    }

    animationRef.current = requestAnimationFrame(render);
  }, [width, height, lineColor, isListening]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);

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
