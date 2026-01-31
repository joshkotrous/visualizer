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
  
  float hash(float n) {
    return fract(sin(n) * 43758.5453);
  }
  
  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  // Simple orthographic isometric projection (no perspective distortion)
  vec2 project(vec3 p) {
    // Isometric: x goes right-down, z goes left-down, y goes up
    float isoX = (p.x - p.z) * 0.866; // cos(30°)
    float isoY = (p.x + p.z) * 0.5 + p.y; // sin(30°) + y
    return vec2(isoX, isoY) * 0.55; // Scale to fit
  }
  
  // Depth for fading (further = dimmer)
  float getDepth(vec3 p) {
    return p.z - p.x; // Back-left is further
  }
  
  // Distance to projected line segment
  float lineDist(vec2 uv, vec2 a, vec2 b) {
    vec2 pa = uv - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }
  
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv = uv * 2.0 - 1.0;
    uv.x *= u_aspect;
    uv.y -= 0.05; // Slight vertical offset
    
    float bass = u_bass * u_intensity;
    float mid = u_mid * u_intensity;
    float treble = u_treble * u_intensity;
    
    // Breathing expansion effect (like Dyson Sphere)
    float bassSigned = (u_bass - 0.5) * 2.0;
    float midSigned = (u_mid - 0.5) * 2.0;
    float combinedBreath = bassSigned * 1.2 + midSigned * 0.4;
    combinedBreath = clamp(combinedBreath, -0.9, 0.9);
    
    // Expansion multiplier - expands on peaks, contracts on lows
    // Increased base distance and reactivity for layer spacing
    float layerExpansion = 1.0 + combinedBreath * u_intensity * 0.5;
    float nodeSpread = 1.0 + combinedBreath * u_intensity * 0.2;
    
    float glow = 0.0;
    
    // Network: 5 layers, each is a grid of nodes (rows x cols)
    // Layers go from back-left to front-right (z axis)
    
    int nodesX[5]; // nodes per row
    nodesX[0] = 3;
    nodesX[1] = 5;
    nodesX[2] = 6;
    nodesX[3] = 5;
    nodesX[4] = 3;
    
    int nodesY[5]; // rows per layer
    nodesY[0] = 4;
    nodesY[1] = 5;
    nodesY[2] = 6;
    nodesY[3] = 5;
    nodesY[4] = 4;
    
    // Layer Z positions - increased base distance, expands/contracts with audio
    float baseSpacing = 0.7; // Increased from 0.5
    float layerZ[5];
    layerZ[0] = -2.0 * baseSpacing * layerExpansion;
    layerZ[1] = -1.0 * baseSpacing * layerExpansion;
    layerZ[2] = 0.0;
    layerZ[3] = 1.0 * baseSpacing * layerExpansion;
    layerZ[4] = 2.0 * baseSpacing * layerExpansion;
    
    // Draw connections between layers
    for (int layer = 0; layer < 4; layer++) {
      float z1 = layerZ[layer];
      float z2 = layerZ[layer + 1];
      int nx1 = nodesX[layer];
      int ny1 = nodesY[layer];
      int nx2 = nodesX[layer + 1];
      int ny2 = nodesY[layer + 1];
      
      // Sample connections (not all, for performance)
      for (int iy1 = 0; iy1 < 6; iy1++) {
        if (iy1 >= ny1) break;
        for (int ix1 = 0; ix1 < 6; ix1++) {
          if (ix1 >= nx1) break;
          
          float x1 = (float(ix1) - float(nx1 - 1) * 0.5) * 0.35 * nodeSpread;
          float y1 = (float(iy1) - float(ny1 - 1) * 0.5) * 0.3 * nodeSpread;
          vec3 p1 = vec3(x1, y1, z1);
          
          // Connect to a few nodes in next layer
          for (int iy2 = 0; iy2 < 6; iy2++) {
            if (iy2 >= ny2) break;
            for (int ix2 = 0; ix2 < 6; ix2++) {
              if (ix2 >= nx2) break;
              
              float connStrength = hash2(vec2(float(layer * 1000 + iy1 * 100 + ix1), float(iy2 * 10 + ix2)));
              if (connStrength < 0.94) continue; // Only draw very few connections
              
              float x2 = (float(ix2) - float(nx2 - 1) * 0.5) * 0.35 * nodeSpread;
              float y2 = (float(iy2) - float(ny2 - 1) * 0.5) * 0.3 * nodeSpread;
              vec3 p2 = vec3(x2, y2, z2);
              
              vec2 proj1 = project(p1);
              vec2 proj2 = project(p2);
              
              float d = lineDist(uv, proj1, proj2);
              
              // Depth fade
              float avgDepth = (getDepth(p1) + getDepth(p2)) * 0.5;
              float depthFade = smoothstep(2.0, -2.0, avgDepth) * 0.6 + 0.4;
              
              // Flow pulse along connection
              float flowSpeed = 1.2 + mid * 0.8;
              float flowPos = fract(u_time * flowSpeed * 0.3 + connStrength * 5.0);
              
              vec2 lineDir = proj2 - proj1;
              float lineLen = length(lineDir);
              if (lineLen > 0.001) {
                float projDist = dot(uv - proj1, lineDir / lineLen);
                float t = clamp(projDist / lineLen, 0.0, 1.0);
                float pulse = smoothstep(0.18, 0.0, abs(t - flowPos)) * 0.8;
                
                float conn = smoothstep(0.006, 0.002, d);
                
                float activation = 0.0;
                if (layer < 1) activation = bass * 0.8;
                else if (layer < 3) activation = mid * 0.8;
                else activation = treble * 0.8;
                
                glow += conn * depthFade * (0.1 + pulse * (0.6 + activation * 1.5));
              }
            }
          }
        }
      }
    }
    
    // Draw nodes as a 3D grid per layer
    for (int layer = 0; layer < 5; layer++) {
      float z = layerZ[layer];
      int nx = nodesX[layer];
      int ny = nodesY[layer];
      
      for (int iy = 0; iy < 6; iy++) {
        if (iy >= ny) break;
        for (int ix = 0; ix < 6; ix++) {
          if (ix >= nx) break;
          
          float x = (float(ix) - float(nx - 1) * 0.5) * 0.35 * nodeSpread;
          float y = (float(iy) - float(ny - 1) * 0.5) * 0.3 * nodeSpread;
          vec3 pos3D = vec3(x, y, z);
          vec2 pos2D = project(pos3D);
          
          float d = length(uv - pos2D);
          
          // Depth fade
          float depth = getDepth(pos3D);
          float depthFade = smoothstep(2.0, -2.0, depth) * 0.6 + 0.4;
          
          // Node size varies slightly with depth
          float nodeSize = 0.018 * (1.0 - depth * 0.08);
          
          // Activation - each node responds individually to audio
          float phase = float(layer) * 0.7 + float(ix) * 0.5 + float(iy) * 0.3;
          float nodeHash = hash(float(layer * 100 + iy * 10 + ix));
          
          // Base activation
          float activation = 0.15;
          
          // Each node picks up different frequencies based on its hash
          float bassResponse = smoothstep(0.0, 0.6, nodeHash) * bass * 1.5;
          float midResponse = smoothstep(0.3, 0.9, nodeHash) * mid * 1.5;
          float trebleResponse = smoothstep(0.5, 1.0, nodeHash) * treble * 1.5;
          
          // Layer-based primary response
          if (layer == 0 || layer == 1) {
            activation += bassResponse * 1.2 + midResponse * 0.4 + trebleResponse * 0.2;
          } else if (layer == 2) {
            activation += bassResponse * 0.4 + midResponse * 1.2 + trebleResponse * 0.4;
          } else {
            activation += bassResponse * 0.2 + midResponse * 0.4 + trebleResponse * 1.2;
          }
          
          // Individual node pulsing at different rates
          float pulseSpeed = 2.0 + nodeHash * 2.0;
          activation *= 0.5 + sin(u_time * pulseSpeed + phase) * 0.5;
          
          // Random "firing" - some nodes light up more on beats
          float fireThreshold = 0.7 - (bass + mid) * u_intensity * 0.4;
          if (nodeHash > fireThreshold) {
            activation += (bass + mid * 0.5) * u_intensity * 0.8;
          }
          
          // Node ring
          float ring = smoothstep(nodeSize * 1.1, nodeSize * 0.85, d) - 
                       smoothstep(nodeSize * 0.75, nodeSize * 0.5, d);
          glow += ring * depthFade * 0.9;
          
          // Node fill
          float fill = smoothstep(nodeSize * 0.8, nodeSize * 0.15, d);
          glow += fill * depthFade * activation * 1.3;
          
          // Glow halo
          float halo = smoothstep(nodeSize * 3.5, nodeSize, d);
          glow += halo * depthFade * activation * 0.25;
        }
      }
    }
    
    // Draw layer outlines (wireframe boxes)
    for (int layer = 0; layer < 5; layer++) {
      float z = layerZ[layer];
      int nx = nodesX[layer];
      int ny = nodesY[layer];
      float hw = (float(nx - 1) * 0.5 * 0.35 + 0.08) * nodeSpread; // half width
      float hh = (float(ny - 1) * 0.5 * 0.3 + 0.08) * nodeSpread;  // half height
      
      // Four corners
      vec3 tl = vec3(-hw, hh, z);
      vec3 tr = vec3(hw, hh, z);
      vec3 bl = vec3(-hw, -hh, z);
      vec3 br = vec3(hw, -hh, z);
      
      vec2 ptl = project(tl);
      vec2 ptr = project(tr);
      vec2 pbl = project(bl);
      vec2 pbr = project(br);
      
      float depth = getDepth(vec3(0.0, 0.0, z));
      float depthFade = smoothstep(2.0, -2.0, depth) * 0.5 + 0.5;
      
      // Frame lines
      float frame = 0.0;
      frame += smoothstep(0.005, 0.002, lineDist(uv, ptl, ptr));
      frame += smoothstep(0.005, 0.002, lineDist(uv, pbl, pbr));
      frame += smoothstep(0.005, 0.002, lineDist(uv, ptl, pbl));
      frame += smoothstep(0.005, 0.002, lineDist(uv, ptr, pbr));
      
      glow += frame * depthFade * 0.15;
    }
    
    
    // Soft vignette
    vec2 vignetteUV = gl_FragCoord.xy / u_resolution;
    float vignette = smoothstep(0.0, 0.15, vignetteUV.x) * smoothstep(1.0, 0.85, vignetteUV.x);
    vignette *= smoothstep(0.0, 0.15, vignetteUV.y) * smoothstep(1.0, 0.85, vignetteUV.y);
    glow *= vignette;
    
    vec3 col = u_color * glow;
    col = col / (col + 0.5);
    
    float alpha = min(1.0, glow * 1.5);
    gl_FragColor = vec4(col, alpha);
  }
`;

function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return [r, g, b];
}

interface TransformerNetProps {
  className?: string;
}

export default function TransformerNet({ className = "" }: TransformerNetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const { theme } = useTheme() as { theme: { config: { shader?: string; primary: string } } | null };
  const { audioMetrics, intensity } = useAudio();
  const { settings } = usePerformance();
  const perfRef = useRef(settings);

  useEffect(() => {
    perfRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !theme) return;

    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: true,
      alpha: true,
      antialias: true,
    });
    if (!gl) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, perfRef.current.pixelRatio);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const vShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vShader, vertexShader);
    gl.compileShader(vShader);

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

    const positions = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, "u_time");
    const resolutionLoc = gl.getUniformLocation(program, "u_resolution");
    const colorLoc = gl.getUniformLocation(program, "u_color");
    const aspectLoc = gl.getUniformLocation(program, "u_aspect");
    const bassLoc = gl.getUniformLocation(program, "u_bass");
    const midLoc = gl.getUniformLocation(program, "u_mid");
    const trebleLoc = gl.getUniformLocation(program, "u_treble");
    const intensityLoc = gl.getUniformLocation(program, "u_intensity");

    const [r, g, b] = hexToRgb(theme?.config?.shader || theme?.config?.primary || "#22c55e");

    startTimeRef.current = performance.now();
    let currentAudio = { bass: 0, mid: 0, treble: 0, intensity: 1 };
    let lastFrameTime = 0;

    const render = (timestamp: number) => {
      const frameDelay = getFrameDelay(perfRef.current.targetFPS);
      if (frameDelay > 0 && timestamp - lastFrameTime < frameDelay) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }
      lastFrameTime = timestamp;

      const dpr = Math.min(window.devicePixelRatio || 1, perfRef.current.pixelRatio);
      const targetWidth = canvas.clientWidth * dpr;
      const targetHeight = canvas.clientHeight * dpr;
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

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

    const updateAudio = (metrics: { bass: number; mid: number; treble: number; intensity: number }) => {
      currentAudio = metrics;
    };

    (canvas as HTMLCanvasElement & { updateAudio?: typeof updateAudio }).updateAudio = updateAudio;

    render(performance.now());

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
    };
  }, [theme]);

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
