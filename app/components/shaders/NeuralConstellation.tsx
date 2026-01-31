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

// Clustered Web - Nodes grouped in clusters with inter-cluster connections
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
  #define NUM_CLUSTERS 3
  #define NODES_PER_CLUSTER 4
  
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
  
  // Get cluster center position
  vec2 getClusterCenter(int cluster, float time, float midSigned) {
    float fc = float(cluster);
    float angle = fc * 2.094395 + 0.5; // 120 degrees apart
    float radius = 0.35;
    vec2 basePos = vec2(cos(angle), sin(angle)) * radius;
    
    // Orbit slowly
    float orbitSpeed = 0.15 + midSigned * 0.1;
    basePos.x += sin(time * orbitSpeed + fc * 2.0) * 0.08;
    basePos.y += cos(time * orbitSpeed * 0.8 + fc * 2.5) * 0.08;
    
    return basePos;
  }
  
  // Get node position within a cluster
  vec2 getNodeInCluster(vec2 clusterCenter, int nodeIdx, float time, float bassSigned) {
    float fn = float(nodeIdx);
    float angle = fn * 1.5708 + time * 0.3; // 90 degrees apart, rotating
    float radius = 0.12 + bassSigned * 0.03;
    return clusterCenter + vec2(cos(angle), sin(angle)) * radius;
  }
  
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv = uv * 2.0 - 1.0;
    uv.x *= u_aspect;
    uv *= 1.15;
    
    float bassSigned = (u_bass - 0.5) * 2.0;
    float midSigned = (u_mid - 0.5) * 2.0;
    float trebleSigned = (u_treble - 0.5) * 2.0;
    
    float brightness = 0.0;
    
    // Central hub
    float hubDist = length(uv);
    float hubSize = 0.045 + bassSigned * u_intensity * 0.02;
    float hub = smoothstep(hubSize, hubSize * 0.3, hubDist);
    float hubGlow = smoothstep(hubSize * 4.0, hubSize, hubDist) * 0.25;
    brightness += (hub + hubGlow) * 1.2;
    
    // Draw clusters
    for (int c = 0; c < NUM_CLUSTERS; c++) {
      vec2 clusterCenter = getClusterCenter(c, u_time, midSigned * u_intensity);
      
      // Draw cluster center node (larger)
      float ccDist = length(uv - clusterCenter);
      float ccSize = 0.03 + bassSigned * u_intensity * 0.01;
      brightness += smoothstep(ccSize, ccSize * 0.3, ccDist) * 0.9;
      brightness += smoothstep(ccSize * 3.0, ccSize, ccDist) * 0.2;
      
      // Connect cluster center to main hub
      float hubLine = lineDist(uv, vec2(0.0), clusterCenter);
      brightness += smoothstep(0.012, 0.003, hubLine) * 0.35;
      
      // Hub-to-cluster pulse
      float hubPulsePos = fract(u_time * 1.2 + float(c) * 0.33);
      vec2 hubPulsePoint = clusterCenter * hubPulsePos;
      float hubPulseDist = length(uv - hubPulsePoint);
      brightness += smoothstep(0.04, 0.0, hubPulseDist) * (0.4 + u_bass * u_intensity * 0.8);
      
      // Draw nodes within cluster
      for (int n = 0; n < NODES_PER_CLUSTER; n++) {
        vec2 nodePos = getNodeInCluster(clusterCenter, n, u_time, bassSigned * u_intensity);
        float d = length(uv - nodePos);
        
        float nodeSize = 0.02 + trebleSigned * u_intensity * 0.008;
        float core = smoothstep(nodeSize, nodeSize * 0.3, d);
        float glow = smoothstep(nodeSize * 3.0, nodeSize, d) * 0.25;
        float flicker = 1.0 + trebleSigned * u_intensity * 0.3 * sin(u_time * 10.0 + float(c * 4 + n) * 1.7);
        brightness += (core + glow) * flicker * 0.85;
        
        // Connect to cluster center
        float toCenter = lineDist(uv, clusterCenter, nodePos);
        brightness += smoothstep(0.008, 0.002, toCenter) * 0.3;
        
        // Connect to next node in cluster (ring connection)
        vec2 nextNode = getNodeInCluster(clusterCenter, (n + 1), u_time, bassSigned * u_intensity);
        float toNext = lineDist(uv, nodePos, nextNode);
        brightness += smoothstep(0.006, 0.001, toNext) * 0.2;
        
        // Pulse within cluster
        float pulsePos = fract(u_time * 2.0 + hash1(float(c * 4 + n)));
        vec2 pulsePoint = mix(clusterCenter, nodePos, pulsePos);
        float pulseDist = length(uv - pulsePoint);
        brightness += smoothstep(0.03, 0.0, pulseDist) * (0.3 + u_bass * u_intensity * 0.5);
      }
    }
    
    // Inter-cluster connections (between adjacent clusters)
    for (int c = 0; c < NUM_CLUSTERS; c++) {
      vec2 thisCluster = getClusterCenter(c, u_time, midSigned * u_intensity);
      vec2 nextCluster = getClusterCenter((c + 1), u_time, midSigned * u_intensity);
      
      float interLine = lineDist(uv, thisCluster, nextCluster);
      brightness += smoothstep(0.008, 0.002, interLine) * 0.2;
      
      // Inter-cluster pulse
      float interPulsePos = fract(u_time * 0.8 + float(c) * 0.33);
      vec2 interPulsePoint = mix(thisCluster, nextCluster, interPulsePos);
      float interPulseDist = length(uv - interPulsePoint);
      brightness += smoothstep(0.035, 0.0, interPulseDist) * (0.25 + u_mid * u_intensity * 0.5);
    }
    
    // Edge fade
    float screenDist = max(abs(uv.x / u_aspect), abs(uv.y));
    float edgeFade = smoothstep(1.0, 0.65, screenDist);
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

export default function NeuralConstellation() {
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
