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

// Sparse Web - Fewer nodes, longer connections, more spread out
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
  #define NUM_NODES 8
  
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  float hash1(float n) {
    return fract(sin(n) * 43758.5453);
  }
  
  float lineDist(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }
  
  vec2 getNodePos(int i, float time, float midSigned) {
    float fi = float(i);
    float angle = hash1(fi * 234.567) * 6.28318;
    float radius = 0.25 + hash1(fi * 876.543) * 0.4;
    vec2 basePos = vec2(cos(angle), sin(angle)) * radius;
    
    // Slower, wider movement
    float moveSpeed = 0.2 + midSigned * 0.15;
    float moveAmp = 0.08 + abs(midSigned) * 0.04;
    basePos.x += sin(time * moveSpeed + fi * 2.1) * moveAmp;
    basePos.y += cos(time * moveSpeed * 0.7 + fi * 2.7) * moveAmp;
    
    return basePos;
  }
  
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv = uv * 2.0 - 1.0;
    uv.x *= u_aspect;
    uv *= 1.1;
    
    float bassSigned = (u_bass - 0.5) * 2.0;
    float midSigned = (u_mid - 0.5) * 2.0;
    float trebleSigned = (u_treble - 0.5) * 2.0;
    
    float brightness = 0.0;
    
    vec2 nodes[NUM_NODES];
    for (int i = 0; i < NUM_NODES; i++) {
      nodes[i] = getNodePos(i, u_time, midSigned * u_intensity);
    }
    
    // Long-range connections
    for (int i = 0; i < NUM_NODES; i++) {
      for (int j = 0; j < NUM_NODES; j++) {
        if (j <= i) continue;
        vec2 nodeA = nodes[i];
        vec2 nodeB = nodes[j];
        
        float nodeDist = length(nodeA - nodeB);
        
        // Higher threshold - connect even distant nodes
        if (nodeDist < 0.9) {
          float connectionStrength = smoothstep(0.9, 0.3, nodeDist);
          
          float d = lineDist(uv, nodeA, nodeB);
          // Thinner lines
          float line = smoothstep(0.015, 0.004, d) * connectionStrength * 0.5;
          
          // Slower, larger pulses
          float pulseSpeed = 1.2 + bassSigned * u_intensity * 0.5;
          float pulsePos = fract(u_time * pulseSpeed * 0.2 + hash(vec2(float(i), float(j))));
          vec2 pulsePoint = mix(nodeA, nodeB, pulsePos);
          float pulseDist = length(uv - pulsePoint);
          float pulse = smoothstep(0.06, 0.0, pulseDist) * connectionStrength;
          pulse *= 0.6 + u_bass * u_intensity * 1.2;
          
          brightness += line;
          brightness += pulse * 0.9;
        }
      }
    }
    
    // Larger nodes
    for (int i = 0; i < NUM_NODES; i++) {
      vec2 nodePos = nodes[i];
      float d = length(uv - nodePos);
      
      float baseSize = 0.035;
      float nodeSize = baseSize + bassSigned * u_intensity * 0.015;
      
      float core = smoothstep(nodeSize, nodeSize * 0.25, d);
      float glow = smoothstep(nodeSize * 4.0, nodeSize, d) * 0.35;
      
      float flicker = 1.0 + trebleSigned * u_intensity * 0.3 * sin(u_time * 8.0 + float(i) * 1.8);
      
      brightness += (core + glow) * flicker;
    }
    
    // Larger central hub
    float hubDist = length(uv);
    float hubSize = 0.055 + bassSigned * u_intensity * 0.025;
    float hub = smoothstep(hubSize, hubSize * 0.25, hubDist);
    float hubGlow = smoothstep(hubSize * 5.0, hubSize, hubDist) * 0.25;
    brightness += (hub + hubGlow) * 1.3;
    
    // Hub connections to all nodes
    for (int i = 0; i < NUM_NODES; i++) {
      vec2 nodePos = nodes[i];
      float d = lineDist(uv, vec2(0.0), nodePos);
      float line = smoothstep(0.01, 0.003, d) * 0.3;
      brightness += line;
      
      // Slow hub pulses
      float pulsePos = fract(u_time * 0.8 + hash1(float(i)));
      vec2 pulsePoint = nodePos * pulsePos;
      float pulseDist = length(uv - pulsePoint);
      float pulse = smoothstep(0.05, 0.0, pulseDist) * (0.4 + u_bass * u_intensity * 0.8);
      brightness += pulse * 0.6;
    }
    
    // Edge fade
    float screenDist = max(abs(uv.x / u_aspect), abs(uv.y));
    float edgeFade = smoothstep(1.0, 0.7, screenDist);
    brightness *= edgeFade;
    
    vec3 col = u_color * brightness;
    float alpha = smoothstep(0.01, 0.1, brightness);
    
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

export default function NeuralStorm() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme() as { theme: { config: { shader?: string; primary: string } } | null };
  const { audioMetrics, intensity } = useAudio();
  const animationRef = useRef<number | null>(null);
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
