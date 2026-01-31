"use client";

import { useRef, useEffect } from "react";
import { useTheme } from "../providers/themeProvider";
import { useAudio } from "../../contexts/AudioContext";
import { usePerformance, getFrameDelay } from "../../contexts/PerformanceContext";

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
  
  #define PI 3.14159265359
  #define TAU 6.28318530718
  
  // Glow function
  float glow(float d, float radius, float intensity) {
    return radius / (d * d * intensity + radius);
  }
  
  // Distance to line segment
  float lineDist(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }
  
  // Get helix strand position at height y
  vec2 getHelixPos(float y, float time, float phase, float radius) {
    float angle = y * 4.0 + time + phase;
    return vec2(cos(angle) * radius, y);
  }
  
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv = uv * 2.0 - 1.0;
    uv.x *= u_aspect;
    
    // Scale to fit
    uv *= 1.1;
    
    // Audio processing
    float bassSigned = (u_bass - 0.5) * 2.0;
    float midSigned = (u_mid - 0.5) * 2.0;
    float trebleSigned = (u_treble - 0.5) * 2.0;
    float audioLevel = u_bass * 0.4 + u_mid * 0.35 + u_treble * 0.25;
    
    vec3 col = vec3(0.0);
    float brightness = 0.0;
    
    // Helix parameters
    float rotSpeed = 1.5 + midSigned * u_intensity * 0.8;
    float time = u_time * rotSpeed;
    
    // Helix radius breathes with bass
    float baseRadius = 0.25;
    float helixRadius = baseRadius + bassSigned * u_intensity * 0.08;
    
    // Flow pulse parameters - multiple waves traveling along the helix
    float flowSpeed = 2.0 + audioLevel * u_intensity * 2.0;
    float pulseWidth = 0.3 + trebleSigned * u_intensity * 0.1;
    
    // Draw the two strands
    float strandGlow = 0.0;
    float flowGlow = 0.0;
    
    // Sample points along the helix
    const float NUM_SAMPLES = 40.0;
    float yRange = 1.8;
    
    for (int ii = 0; ii < 40; ii++) {
      float i = float(ii);
      float t = i / NUM_SAMPLES;
      float y = t * yRange * 2.0 - yRange;
      float nextY = (i + 1.0) / NUM_SAMPLES * yRange * 2.0 - yRange;
      
      // Strand 1
      float angle1 = y * 4.0 + time;
      float nextAngle1 = nextY * 4.0 + time;
      float x1 = cos(angle1) * helixRadius;
      float nextX1 = cos(nextAngle1) * helixRadius;
      float z1 = sin(angle1);
      
      // Strand 2 (opposite phase)
      float angle2 = y * 4.0 + time + PI;
      float nextAngle2 = nextY * 4.0 + time + PI;
      float x2 = cos(angle2) * helixRadius;
      float nextX2 = cos(nextAngle2) * helixRadius;
      float z2 = sin(angle2);
      
      // Depth-based brightness (front strands brighter)
      float depth1 = (z1 + 1.0) * 0.5;
      float depth2 = (z2 + 1.0) * 0.5;
      
      // Line segments for strands
      vec2 p1 = vec2(x1, y);
      vec2 p1next = vec2(nextX1, nextY);
      vec2 p2 = vec2(x2, y);
      vec2 p2next = vec2(nextX2, nextY);
      
      // Distance to strand segments
      float d1 = lineDist(uv, p1, p1next);
      float d2 = lineDist(uv, p2, p2next);
      
      // Strand thickness varies with depth
      float thickness1 = 0.025 + depth1 * 0.015;
      float thickness2 = 0.025 + depth2 * 0.015;
      
      // Base glow effect
      float glow1 = smoothstep(thickness1, thickness1 * 0.3, d1) * (0.4 + depth1 * 0.6);
      float glow2 = smoothstep(thickness2, thickness2 * 0.3, d2) * (0.4 + depth2 * 0.6);
      
      strandGlow += glow1 * 0.15;
      strandGlow += glow2 * 0.15;
      
      // === FLOW EFFECT - Traveling pulses along the strands ===
      // Multiple flow waves with different speeds
      float normalizedY = (y + yRange) / (yRange * 2.0); // 0 to 1
      
      // Wave 1 - Main bass-reactive pulse (travels up)
      float wave1Pos = fract(u_time * flowSpeed * 0.3);
      float wave1Dist = abs(normalizedY - wave1Pos);
      wave1Dist = min(wave1Dist, 1.0 - wave1Dist); // Wrap around
      float wave1 = smoothstep(pulseWidth, 0.0, wave1Dist);
      wave1 *= (0.5 + u_bass * u_intensity * 1.5);
      
      // Wave 2 - Secondary mid-reactive pulse (travels down)
      float wave2Pos = fract(-u_time * flowSpeed * 0.25 + 0.5);
      float wave2Dist = abs(normalizedY - wave2Pos);
      wave2Dist = min(wave2Dist, 1.0 - wave2Dist);
      float wave2 = smoothstep(pulseWidth * 0.8, 0.0, wave2Dist);
      wave2 *= (0.3 + u_mid * u_intensity * 1.0);
      
      // Wave 3 - Fast treble sparkles
      float wave3Pos = fract(u_time * flowSpeed * 0.5 + 0.33);
      float wave3Dist = abs(normalizedY - wave3Pos);
      wave3Dist = min(wave3Dist, 1.0 - wave3Dist);
      float wave3 = smoothstep(pulseWidth * 0.5, 0.0, wave3Dist);
      wave3 *= (0.2 + u_treble * u_intensity * 0.8);
      
      float flowPulse = wave1 + wave2 + wave3;
      
      // Apply flow to strands (stronger when closer to strand)
      float flowOnStrand1 = smoothstep(thickness1 * 3.0, thickness1 * 0.5, d1) * flowPulse * depth1;
      float flowOnStrand2 = smoothstep(thickness2 * 3.0, thickness2 * 0.5, d2) * flowPulse * depth2;
      
      flowGlow += flowOnStrand1 * 0.25;
      flowGlow += flowOnStrand2 * 0.25;
      
      // Base pair rungs (connecting the two strands)
      if (mod(i, 4.0) < 1.0) {
        // Only draw rung when both strands are roughly at same depth (side view)
        float avgDepth = (depth1 + depth2) * 0.5;
        float depthDiff = abs(z1 - z2);
        
        // Rung connects the two strands
        float rungDist = lineDist(uv, p1, p2);
        float rungThickness = 0.015 + avgDepth * 0.01;
        float rungGlow = smoothstep(rungThickness, rungThickness * 0.2, rungDist);
        rungGlow *= smoothstep(2.0, 0.5, depthDiff); // Fade when strands are at different depths
        rungGlow *= (0.3 + avgDepth * 0.5);
        
        // Pulse effect on rungs - now also affected by flow
        float rungFlow = (flowPulse * 0.5 + 0.5);
        float pulse = 1.0 + trebleSigned * u_intensity * 0.5 * sin(i * 0.5 + u_time * 5.0);
        strandGlow += rungGlow * 0.3 * pulse * rungFlow;
        
        // Extra glow on rungs when flow passes through
        flowGlow += rungGlow * flowPulse * 0.2 * smoothstep(2.0, 0.5, depthDiff);
      }
    }
    
    // Combine base strand glow with flow effect
    brightness = strandGlow + flowGlow;
    
    // Overall audio-reactive brightness boost
    float audioBoost = 1.0 + audioLevel * u_intensity * 0.5;
    brightness *= audioBoost;
    
    // Edge fade
    float screenDist = max(abs(uv.x / u_aspect), abs(uv.y));
    float edgeFade = smoothstep(1.0, 0.7, screenDist);
    brightness *= edgeFade;
    
    // Vertical fade at top and bottom
    float vertFade = smoothstep(1.0, 0.7, abs(uv.y));
    brightness *= vertFade;
    
    col = u_color * brightness;
    
    // Transparent background
    float alpha = smoothstep(0.01, 0.12, brightness);
    
    gl_FragColor = vec4(col, alpha);
  }
`;

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  }
  return [0.13, 0.77, 0.37];
}

export default function DNAHelix() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const { audioMetrics, intensity } = useAudio();
  const { settings } = usePerformance();
  const animationRef = useRef<number>(0);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const audioRef = useRef({ bass: 0, mid: 0, treble: 0, intensity: 1 });
  const perfRef = useRef(settings);

  useEffect(() => {
    perfRef.current = settings;
  }, [settings]);

  useEffect(() => {
    audioRef.current = { ...audioMetrics, intensity };
  }, [audioMetrics, intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: true, alpha: true });
    if (!gl) return;
    glRef.current = gl;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vertexShader);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fragmentShader);
    gl.compileShader(fs);

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error("Fragment shader error:", gl.getShaderInfoLog(fs));
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    programRef.current = program;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    const program = programRef.current;
    if (!canvas || !gl || !program) return;

    const shaderColor = theme?.config?.shader || theme?.config?.primary || "#22c55e";
    const [r, g, b] = hexToRgb(shaderColor);

    let lastFrameTime = 0;
    let currentPixelRatio = Math.min(window.devicePixelRatio || 1, perfRef.current.pixelRatio);

    const render = (timestamp: number) => {
      const frameDelay = getFrameDelay(perfRef.current.targetFPS);
      if (frameDelay > 0 && timestamp - lastFrameTime < frameDelay) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }
      lastFrameTime = timestamp;

      // Check for pixel ratio changes
      const newPixelRatio = Math.min(window.devicePixelRatio || 1, perfRef.current.pixelRatio);
      if (newPixelRatio !== currentPixelRatio) {
        currentPixelRatio = newPixelRatio;
      }

      const width = Math.floor(canvas.clientWidth * currentPixelRatio);
      const height = Math.floor(canvas.clientHeight * currentPixelRatio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program);

      const time = (Date.now() - startTimeRef.current) / 1000;
      const { bass, mid, treble, intensity: audioIntensity } = audioRef.current;

      gl.uniform1f(gl.getUniformLocation(program, "u_time"), time);
      gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), width, height);
      gl.uniform3f(gl.getUniformLocation(program, "u_color"), r, g, b);
      gl.uniform1f(gl.getUniformLocation(program, "u_aspect"), width / height);
      gl.uniform1f(gl.getUniformLocation(program, "u_bass"), bass);
      gl.uniform1f(gl.getUniformLocation(program, "u_mid"), mid);
      gl.uniform1f(gl.getUniformLocation(program, "u_treble"), treble);
      gl.uniform1f(gl.getUniformLocation(program, "u_intensity"), audioIntensity);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationRef.current = requestAnimationFrame(render);
    };

    render(performance.now());

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ background: "transparent" }}
    />
  );
}
