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
  
  #define PI 3.14159265359
  #define TAU 6.28318530718
  
  // Hex grid helpers
  vec2 hexCenter(vec2 p, float size) {
    vec2 c = vec2(1.0, 1.732);
    vec2 h = c * 0.5;
    vec2 a = mod(p, c) - h;
    vec2 b = mod(p - h, c) - h;
    return dot(a, a) < dot(b, b) ? a : b;
  }
  
  // Get hex cell ID
  vec2 hexId(vec2 p, float size) {
    vec2 c = vec2(1.0, 1.732) * size;
    vec2 h = c * 0.5;
    vec2 a = mod(p, c) - h;
    vec2 b = mod(p - h, c) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    return p - gv;
  }
  
  // Hexagon SDF
  float hexDist(vec2 p) {
    p = abs(p);
    float c = dot(p, normalize(vec2(1.0, 1.732)));
    return max(c, p.x);
  }
  
  // Pseudo-random
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  // Smooth noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv = uv * 2.0 - 1.0;
    uv.x *= u_aspect;
    
    // Audio processing - center around 0.5 for breathing
    float bassSigned = (u_bass - 0.5) * 2.0;
    float midSigned = (u_mid - 0.5) * 2.0;
    float trebleSigned = (u_treble - 0.5) * 2.0;
    
    vec3 col = vec3(0.0);
    
    // Hex grid scale - breathes with bass (smaller to fit in container)
    float baseScale = 6.0;
    float scale = baseScale + bassSigned * u_intensity * 1.0;
    vec2 hexUv = uv * scale;
    
    // Get hex cell info
    vec2 cellId = hexId(hexUv, 1.0);
    vec2 cellUv = hexCenter(hexUv, 1.0);
    float cellHash = hash(cellId * 0.1);
    
    // Distance from center of grid
    float distFromCenter = length(cellId) / scale;
    
    // Wave propagation from center - speed increases with mids
    float waveSpeed = 2.0 + midSigned * u_intensity * 1.5;
    float wave = sin(distFromCenter * 6.0 - u_time * waveSpeed) * 0.5 + 0.5;
    
    // Frequency-based activation zones
    // Bass = center, Mids = middle ring, Treble = outer
    float bassZone = smoothstep(0.4, 0.0, distFromCenter);
    float midZone = smoothstep(0.2, 0.4, distFromCenter) * smoothstep(0.8, 0.5, distFromCenter);
    float trebleZone = smoothstep(0.5, 0.9, distFromCenter);
    
    // Cell activation based on frequency bands
    float activation = 0.0;
    activation += bassZone * (0.5 + bassSigned * 0.5) * u_intensity;
    activation += midZone * (0.5 + midSigned * 0.5) * u_intensity;
    activation += trebleZone * (0.3 + trebleSigned * 0.7) * u_intensity;
    
    // Add wave propagation
    activation *= 0.5 + wave * 0.5;
    
    // Random flicker for treble response
    float flicker = noise(cellId + u_time * (3.0 + trebleSigned * 5.0));
    activation += trebleZone * flicker * trebleSigned * u_intensity * 0.5;
    
    // Hexagon edge glow
    float hexD = hexDist(cellUv);
    float hexSize = 0.45 + activation * 0.1;
    float edge = smoothstep(hexSize, hexSize - 0.08, hexD);
    float outline = smoothstep(hexSize - 0.02, hexSize - 0.08, hexD) - smoothstep(hexSize - 0.08, hexSize - 0.14, hexD);
    
    // Core glow (center of each hex)
    float core = smoothstep(0.25, 0.0, hexD) * activation;
    
    // Scanline effect
    float scanline = sin(uv.y * 80.0 + u_time * 2.0) * 0.5 + 0.5;
    scanline = smoothstep(0.3, 0.7, scanline);
    float scanPulse = sin(u_time * 0.5) * 0.5 + 0.5;
    
    // Combine layers
    float brightness = 0.0;
    brightness += outline * (0.4 + activation * 0.6);
    brightness += core * 1.2;
    brightness += edge * activation * 0.3;
    
    // Add subtle scanline overlay
    brightness *= 0.9 + scanline * 0.1 * scanPulse;
    
    // Base ambient glow
    brightness += 0.05 * (1.0 - distFromCenter);
    
    // Edge fade to prevent clipping - fade based on screen UV distance
    float screenDist = max(abs(uv.x / u_aspect), abs(uv.y));
    float edgeFade = smoothstep(1.0, 0.7, screenDist);
    brightness *= edgeFade;
    
    col = u_color * brightness;
    
    // Add slight color variation for depth
    col += u_color * 0.1 * (1.0 - distFromCenter) * (0.5 + bassSigned * 0.5) * edgeFade;
    
    // Transparent background - alpha based on brightness
    float alpha = smoothstep(0.02, 0.15, brightness);
    
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

export default function MagiCore() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme() as { theme: { config: { shader?: string; primary: string } } | null };
  const { audioMetrics, intensity } = useAudio();
  const animationRef = useRef<number>();
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const audioRef = useRef({ bass: 0, mid: 0, treble: 0, intensity: 1 });

  useEffect(() => {
    audioRef.current = { ...audioMetrics, intensity };
  }, [audioMetrics, intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: true, alpha: true });
    if (!gl) return;
    glRef.current = gl;

    // Compile shaders
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

    // Create quad
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

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
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

    render();

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
