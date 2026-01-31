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
  
  // Pseudo-random
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  float hash1(float n) {
    return fract(sin(n) * 43758.5453);
  }
  
  // Noise for static
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
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 uv = fragCoord / u_resolution;
    vec2 centered = uv * 2.0 - 1.0;
    centered.x *= u_aspect;
    
    // Scale down to fit in container
    centered *= 1.3;
    
    // Audio processing
    float bassSigned = (u_bass - 0.5) * 2.0;
    float midSigned = (u_mid - 0.5) * 2.0;
    float trebleSigned = (u_treble - 0.5) * 2.0;
    
    vec3 col = vec3(0.0);
    
    // Polar coordinates
    float radius = length(centered);
    float angle = atan(centered.y, centered.x);
    
    // Sweep line - speed affected by treble
    float sweepSpeed = 1.5 + trebleSigned * u_intensity * 0.5;
    float sweepAngle = mod(u_time * sweepSpeed, TAU) - PI;
    float angleDiff = mod(angle - sweepAngle + PI, TAU) - PI;
    
    // Sweep trail (fades behind the sweep line) - more diffuse/glowy
    float sweepTrail = smoothstep(0.0, -1.8, angleDiff) * smoothstep(-PI, -1.2, angleDiff);
    float sweepLine = smoothstep(0.06, 0.0, abs(angleDiff)) * 0.6;
    
    // Concentric range rings - breathe with bass, rougher edges
    float baseRingSpacing = 0.2;
    float ringSpacing = baseRingSpacing + bassSigned * u_intensity * 0.03;
    float rings = 0.0;
    for (int i = 1; i <= 4; i++) {
      float ringRadius = float(i) * ringSpacing;
      float ringDist = abs(radius - ringRadius);
      // Add noise to ring edges for roughness
      float ringNoise = noise(vec2(angle * 10.0, float(i) + u_time * 0.1)) * 0.008;
      rings += smoothstep(0.02 + ringNoise, 0.005, ringDist) * 0.4;
    }
    
    // Outer circle - rougher
    float outerNoise = noise(vec2(angle * 15.0, u_time * 0.2)) * 0.015;
    float outerRing = smoothstep(0.84 + outerNoise, 0.8, radius) * smoothstep(0.76, 0.8, radius);
    
    // Cross hairs - slightly thicker, rougher
    float crossNoise = noise(fragCoord * 0.1 + u_time) * 0.003;
    float crossH = smoothstep(0.012 + crossNoise, 0.004, abs(centered.y)) * smoothstep(0.85, 0.15, abs(centered.x));
    float crossV = smoothstep(0.012 + crossNoise, 0.004, abs(centered.x)) * smoothstep(0.85, 0.15, abs(centered.y));
    float cross = (crossH + crossV) * 0.25;
    
    // Radar contacts/blips - triggered by bass, more pixelated look
    float contacts = 0.0;
    float bassLevel = u_bass * u_intensity;
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      float contactAngle = hash1(fi * 123.456) * TAU - PI;
      float contactRadius = hash1(fi * 789.012) * 0.55 + 0.15;
      
      float contactAngleDiff = mod(contactAngle - sweepAngle + PI, TAU) - PI;
      float timeSinceSweep = -contactAngleDiff / sweepSpeed;
      
      float blipLife = 2.5;
      float blipFade = smoothstep(blipLife, 0.0, timeSinceSweep) * step(0.0, timeSinceSweep);
      
      float threshold = 0.15 + fi * 0.08;
      float blipActive = step(threshold, bassLevel);
      
      vec2 contactPos = vec2(cos(contactAngle), sin(contactAngle)) * contactRadius;
      float distToContact = length(centered - contactPos);
      
      // Blockier blip shape
      float blip = smoothstep(0.05, 0.02, distToContact) * blipFade * blipActive;
      // Add flicker
      blip *= 0.7 + 0.3 * step(0.5, hash(vec2(fi, floor(u_time * 8.0))));
      contacts += blip;
    }
    
    // Center dot
    float centerDot = smoothstep(0.035, 0.015, radius);
    
    // Edge fade to prevent clipping
    float screenDist = max(abs(centered.x / u_aspect), abs(centered.y));
    float edgeFade = smoothstep(1.0, 0.7, screenDist);
    
    // Combine all elements
    float brightness = 0.0;
    brightness += sweepTrail * 0.35 * smoothstep(0.85, 0.0, radius);
    brightness += sweepLine * smoothstep(0.85, 0.0, radius);
    brightness += rings * 0.5;
    brightness += outerRing * 0.6;
    brightness += cross;
    brightness += contacts * 1.2;
    brightness += centerDot * 0.6;
    
    // Apply edge fade
    brightness *= edgeFade;
    
    // Ambient glow in center - more diffuse
    brightness += smoothstep(0.85, 0.0, radius) * 0.08;
    
    // === CRT EFFECTS ===
    
    // Scanlines
    float scanline = sin(fragCoord.y * 2.5) * 0.5 + 0.5;
    scanline = smoothstep(0.3, 0.7, scanline);
    brightness *= 0.85 + scanline * 0.15;
    
    // Horizontal noise bands (interference)
    float interference = noise(vec2(u_time * 2.0, fragCoord.y * 0.05));
    interference = smoothstep(0.6, 0.8, interference) * 0.15;
    brightness += interference * brightness;
    
    // Static noise
    float staticNoise = hash(fragCoord + u_time * 100.0);
    staticNoise = smoothstep(0.97, 1.0, staticNoise) * 0.3;
    brightness += staticNoise;
    
    // Subtle flicker
    float flicker = 0.97 + 0.03 * sin(u_time * 30.0) * sin(u_time * 17.0);
    brightness *= flicker;
    
    // Screen edge darkening (vignette within radar)
    float vignette = smoothstep(0.9, 0.4, radius);
    brightness *= 0.7 + vignette * 0.3;
    
    col = u_color * brightness;
    
    // Slight color fringing on edges
    float fringe = smoothstep(0.5, 0.8, radius) * 0.1;
    col.r *= 1.0 + fringe;
    col.b *= 1.0 - fringe * 0.5;
    
    // Transparent background
    float alpha = smoothstep(0.02, 0.12, brightness);
    
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

export default function RadarSweep() {
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
