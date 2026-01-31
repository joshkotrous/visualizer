"use client";

import { useRef, useEffect } from "react";
import { useTheme } from "../providers/themeProvider";
import { useAudio } from "../../contexts/AudioContext";

const vertexShader = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec3 u_color;
  uniform float u_aspect;
  uniform float u_bass;
  uniform float u_mid;
  uniform float u_treble;
  uniform float u_intensity;
  
  // Isometric projection helpers (flipped direction)
  vec2 toIso(vec3 p) {
    float isoX = (p.z - p.x) * 0.866;
    float isoY = (p.x + p.z) * 0.5 - p.y;
    return vec2(isoX, isoY);
  }
  
  // Glow function - tighter falloff
  float glow(float d, float radius, float intensity) {
    return radius / (d * d * intensity + radius);
  }
  
  // Draw a glowing line segment
  float lineDist(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }
  
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv = uv * 2.0 - 1.0;
    uv.x *= u_aspect;
    
    // Scale and position the grid
    uv *= 1.4;
    uv.y -= 0.1;
    
    vec3 col = vec3(0.0);
    float totalGlow = 0.0;
    
    // Grid parameters
    int numWaves = 8;
    float gridDepth = 6.0;
    float gridWidth = 4.0;
    // Center audio so wave height can increase AND decrease from base
    float bassSigned = (u_bass - 0.5) * 2.0;
    float baseWaveHeight = 0.4;
    float waveHeight = baseWaveHeight + bassSigned * u_intensity * 0.3;
    
    // Draw multiple sine wave lines in isometric view
    float waveSpacing = 1.2;
    for (int w = 0; w < 3; w++) {
      float waveOffset = float(w) * waveSpacing - waveSpacing;
      float wavePhase = float(w) * 0.7;
      
      // Different time multipliers for each wave for variation
      float timeVar = 1.0 + float(w) * 0.3;
      float timeOffset = float(w) * 0.5;
      
      // Each wave is a series of connected line segments
      vec2 prevPoint = vec2(0.0);
      bool hasPrev = false;
      
      for (int i = 0; i < 32; i++) {
        float t = float(i) / 31.0;
        float x = t * gridWidth - gridWidth * 0.5;
        float z = waveOffset;
        
        // Multiple overlapping sine waves with variation per wave - smoother motion
        // Audio-reactive: mids and treble have strong effect on speed and shake
        float midSigned = (u_mid - 0.5) * 2.0;
        float trebleSigned = (u_treble - 0.5) * 2.0;
        float speedBoost = 1.0 + (midSigned * 0.7 + trebleSigned * 0.8) * u_intensity * 1.2;
        float y = sin(x * 2.0 + u_time * (1.2 + float(w) * 0.3) * speedBoost + wavePhase) * waveHeight * 0.5;
        y += sin(x * 3.5 - u_time * (0.8 + float(w) * 0.2) * speedBoost + wavePhase * 2.0) * waveHeight * 0.25;
        y += sin(x * 1.2 + u_time * (1.5 - float(w) * 0.2) * speedBoost + wavePhase * 0.5) * waveHeight * 0.25;
        
        // Add high-frequency shake - mids add wobble, treble adds sharpness
        y += sin(x * 10.0 + u_time * 6.0) * midSigned * u_intensity * 0.12;
        y += sin(x * 15.0 + u_time * 8.0) * trebleSigned * u_intensity * 0.18;
        y += sin(x * 25.0 - u_time * 12.0) * trebleSigned * u_intensity * 0.12;
        y += sin(x * 40.0 + u_time * 15.0) * trebleSigned * u_intensity * 0.06;
        
        // Fade at edges
        float edgeFade = smoothstep(0.0, 0.2, t) * smoothstep(1.0, 0.8, t);
        y *= edgeFade;
        
        // Project to isometric
        vec3 pos3d = vec3(x, y, z);
        vec2 isoPos = toIso(pos3d) * 0.4;
        
        if (hasPrev) {
          float d = lineDist(uv, prevPoint, isoPos);
          
          // Distance-based intensity (closer waves brighter)
          float depthFade = 1.0 - float(w) / 5.0;
          
          // Core line - sharp
          float core = smoothstep(0.045, 0.008, d) * depthFade * 0.9;
          
          // Inner glow
          float innerGlow = glow(d, 0.02, 100.0) * depthFade * 0.4;
          
          // Outer glow - subtle
          float outerGlow = glow(d, 0.04, 30.0) * depthFade * 0.15;
          
          totalGlow += core + innerGlow + outerGlow;
        }
        
        prevPoint = isoPos;
        hasPrev = true;
      }
    }
    
    // Draw horizontal grid lines (depth lines) - align with wave positions
    // Waves are at z = -1.2, 0, 1.2, so grid lines at -1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8
    for (int i = 0; i < 7; i++) {
      float z = float(i) * 0.6 - 1.8;
      
      vec2 startIso = toIso(vec3(-gridWidth * 0.5, 0.0, z)) * 0.4;
      vec2 endIso = toIso(vec3(gridWidth * 0.5, 0.0, z)) * 0.4;
      
      float d = lineDist(uv, startIso, endIso);
      float gridCore = smoothstep(0.002, 0.0, d) * 0.1;
      float gridGlow = glow(d, 0.001, 800.0) * 0.08;
      totalGlow += gridCore + gridGlow;
    }
    
    // Draw vertical grid lines - match sine wave extent
    float gridDepthExtent = 1.8; // matches horizontal grid extent
    for (int i = 0; i < 10; i++) {
      float t = float(i) / 9.0;
      float x = t * gridWidth - gridWidth * 0.5;
      
      vec2 startIso = toIso(vec3(x, 0.0, -gridDepthExtent)) * 0.4;
      vec2 endIso = toIso(vec3(x, 0.0, gridDepthExtent)) * 0.4;
      
      float d = lineDist(uv, startIso, endIso);
      float gridCore = smoothstep(0.002, 0.0, d) * 0.1;
      float gridGlow = glow(d, 0.001, 800.0) * 0.08;
      totalGlow += gridCore + gridGlow;
    }
    
    // Edge fade to prevent glow overflow
    vec2 edgeUV = gl_FragCoord.xy / u_resolution;
    float edgeFadeX = smoothstep(0.0, 0.15, edgeUV.x) * smoothstep(1.0, 0.85, edgeUV.x);
    float edgeFadeY = smoothstep(0.0, 0.15, edgeUV.y) * smoothstep(1.0, 0.85, edgeUV.y);
    float edgeFade = edgeFadeX * edgeFadeY;
    totalGlow *= edgeFade;
    
    // Apply color with glow
    col = u_color * totalGlow;
    
    // Add subtle scan line effect
    float scanLine = sin(gl_FragCoord.y * 1.5) * 0.04 + 0.96;
    col *= scanLine;
    
    // Tone mapping - prevent blowout
    col = col / (col + 0.6);
    
    // Alpha based on brightness
    float alpha = min(1.0, totalGlow * 1.5) * edgeFade;
    
    gl_FragColor = vec4(col, alpha);
  }
`;

// Convert hex color to RGB (0-1 range)
function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return [r, g, b];
}

interface SineWaveGridProps {
  className?: string;
}

export default function SineWaveGrid({ className = "" }: SineWaveGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const { theme } = useTheme();
  const { audioMetrics, intensity } = useAudio();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !theme) return;

    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: true,
      alpha: true,
      antialias: true,
    });
    if (!gl) return;

    // Resize handler
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    // Compile shaders
    const vShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vShader, vertexShader);
    gl.compileShader(vShader);

    if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
      console.error("Vertex shader error:", gl.getShaderInfoLog(vShader));
    }

    const fShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fShader, fragmentShader);
    gl.compileShader(fShader);

    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
      console.error("Fragment shader error:", gl.getShaderInfoLog(fShader));
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Full screen quad
    const positions = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const timeLoc = gl.getUniformLocation(program, "u_time");
    const resolutionLoc = gl.getUniformLocation(program, "u_resolution");
    const colorLoc = gl.getUniformLocation(program, "u_color");
    const aspectLoc = gl.getUniformLocation(program, "u_aspect");
    const bassLoc = gl.getUniformLocation(program, "u_bass");
    const midLoc = gl.getUniformLocation(program, "u_mid");
    const trebleLoc = gl.getUniformLocation(program, "u_treble");
    const intensityLoc = gl.getUniformLocation(program, "u_intensity");

    const [r, g, b] = hexToRgb(theme.config.shader || theme.config.primary);

    startTimeRef.current = performance.now();
    
    // Store audio ref for render loop
    let currentAudio = { bass: 0, mid: 0, treble: 0, intensity: 1 };

    const render = () => {
      const time = (performance.now() - startTimeRef.current) / 1000;
      const aspect = canvas.width / canvas.height;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      gl.uniform1f(timeLoc, time);
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
      gl.uniform3f(colorLoc, r, g, b);
      gl.uniform1f(aspectLoc, aspect);
      gl.uniform1f(bassLoc, currentAudio.bass);
      gl.uniform1f(midLoc, currentAudio.mid);
      gl.uniform1f(trebleLoc, currentAudio.treble);
      gl.uniform1f(intensityLoc, currentAudio.intensity);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationRef.current = requestAnimationFrame(render);
    };
    
    // Update audio values from external source
    const updateAudio = (metrics: { bass: number; mid: number; treble: number; intensity: number }) => {
      currentAudio = metrics;
    };
    
    // Store update function on canvas for external access
    (canvas as HTMLCanvasElement & { updateAudio?: typeof updateAudio }).updateAudio = updateAudio;

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
    };
  }, [theme]);

  // Update audio metrics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasWithAudio = canvas as HTMLCanvasElement & { updateAudio?: (metrics: { bass: number; mid: number; treble: number; intensity: number }) => void };
    if (canvasWithAudio.updateAudio) {
      canvasWithAudio.updateAudio({ ...audioMetrics, intensity });
    }
  }, [audioMetrics, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ background: "transparent" }}
    />
  );
}
