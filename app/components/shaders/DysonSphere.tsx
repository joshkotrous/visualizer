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
  
  // Rotation matrices
  mat3 rotateX(float a) {
    float c = cos(a), s = sin(a);
    return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
  }
  
  mat3 rotateY(float a) {
    float c = cos(a), s = sin(a);
    return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
  }
  
  mat3 rotateZ(float a) {
    float c = cos(a), s = sin(a);
    return mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0);
  }
  
  // Project 3D point to 2D screen
  vec2 project(vec3 p) {
    float fov = 1.5;
    float z = p.z + 2.5;
    return vec2(p.x, p.y) * fov / z;
  }
  
  // Distance from point to line segment
  float lineDist(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }
  
  // Glow function
  float glow(float d, float radius, float intensity) {
    return radius / (d * d * intensity + radius);
  }
  
  // Get hexagon vertex position - static orientation (always uses world up)
  vec3 hexVertex(vec3 center, vec3 normal, float size, int vertexIndex, float baseAngle) {
    // Use a fixed world up vector for consistent orientation
    vec3 worldUp = vec3(0.0, 1.0, 0.0);
    
    // For poles, use a different reference
    vec3 tangent;
    vec3 bitangent;
    
    if (abs(normal.y) > 0.99) {
      // At poles, use fixed axes
      tangent = vec3(1.0, 0.0, 0.0);
      bitangent = vec3(0.0, 0.0, 1.0);
    } else {
      // Project world up onto the hex plane for consistent orientation
      tangent = normalize(cross(worldUp, normal));
      bitangent = cross(normal, tangent);
    }
    
    float angle = float(vertexIndex) * TAU / 6.0 + baseAngle;
    vec2 localPos = vec2(cos(angle), sin(angle)) * size;
    
    return center + tangent * localPos.x + bitangent * localPos.y;
  }
  
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv = uv * 2.0 - 1.0;
    uv.x *= u_aspect;
    uv *= 0.9;
    
    vec3 col = vec3(0.0);
    float totalGlow = 0.0;
    
    // Single rotation matrix for all hexes - they rotate together as a group
    mat3 hexRot = rotateY(u_time * 0.2) * rotateX(u_time * 0.12);
    
    // Breathing effect - intensity controls the RANGE of movement, not base size
    // Center audio around 0.5 so it can go both positive (expand) and negative (contract)
    float bassSigned = (u_bass - 0.5) * 2.0;  // Now ranges from -1 to 1
    float midSigned = (u_mid - 0.5) * 2.0;
    float trebleSigned = (u_treble - 0.5) * 2.0;
    
    // Combine all frequencies (bass dominant for breathing effect)
    float combinedEffect = bassSigned * 1.2 + midSigned * 0.5 + trebleSigned * 0.4;
    
    // Clamp the combined effect to limit peak expansion
    combinedEffect = clamp(combinedEffect, -1.0, 0.7);
    
    // Base sizes - hexagons start contracted, explode outward on peaks
    float baseSphereRadius = 0.65;
    float baseHexSize = 0.07;
    float baseCoreRadius = 0.30;
    
    // Sphere radius: hexagons come together at base (-1), explode at peak (+1)
    // Moderate multiplier with clamped input for controlled breathing
    float sphereDelta = combinedEffect * u_intensity * 0.35;
    float sphereRadius = max(0.35, baseSphereRadius + sphereDelta);
    
    // Hex size also grows/shrinks with audio, clamped to stay visible
    float hexDelta = combinedEffect * u_intensity * 0.08;
    float hexSize = max(0.04, baseHexSize + hexDelta);
    
    // Core pulses with mids and treble
    float coreRadius = baseCoreRadius + (midSigned * 0.7 + trebleSigned * 0.5) * u_intensity * 0.1;
    
    // Core rotation (slower than outer shell)
    mat3 coreRot = rotateY(u_time * 0.15) * rotateX(u_time * 0.1);
    
    // Draw central wireframe globe - latitude lines
    for (int lat = 1; lat < 5; lat++) {
      float phi = float(lat) * PI / 5.0;
      float ringRadius = sin(phi) * coreRadius;
      float ringY = cos(phi) * coreRadius;
      
      // Draw latitude ring as line segments
      for (int i = 0; i < 16; i++) {
        float a1 = float(i) * TAU / 16.0;
        float a2 = float(i + 1) * TAU / 16.0;
        
        vec3 v1 = coreRot * vec3(cos(a1) * ringRadius, ringY, sin(a1) * ringRadius);
        vec3 v2 = coreRot * vec3(cos(a2) * ringRadius, ringY, sin(a2) * ringRadius);
        
        float depth1 = (v1.z + coreRadius) / (2.0 * coreRadius);
        float depthFade = 0.2 + depth1 * 0.8;
        
        vec2 p1 = project(v1);
        vec2 p2 = project(v2);
        
        float d = lineDist(uv, p1, p2);
        float lineCore = smoothstep(0.008, 0.002, d) * depthFade * 0.6;
        float lineGlow = glow(d, 0.004, 200.0) * depthFade * 0.2;
        totalGlow += lineCore + lineGlow;
      }
    }
    
    // Draw central wireframe globe - longitude lines
    for (int lon = 0; lon < 8; lon++) {
      float theta = float(lon) * TAU / 8.0;
      
      // Draw longitude arc as line segments
      for (int i = 0; i < 12; i++) {
        float phi1 = float(i) * PI / 12.0;
        float phi2 = float(i + 1) * PI / 12.0;
        
        vec3 v1 = coreRot * vec3(
          sin(phi1) * cos(theta) * coreRadius,
          cos(phi1) * coreRadius,
          sin(phi1) * sin(theta) * coreRadius
        );
        vec3 v2 = coreRot * vec3(
          sin(phi2) * cos(theta) * coreRadius,
          cos(phi2) * coreRadius,
          sin(phi2) * sin(theta) * coreRadius
        );
        
        float depth1 = (v1.z + coreRadius) / (2.0 * coreRadius);
        float depthFade = 0.2 + depth1 * 0.8;
        
        vec2 p1 = project(v1);
        vec2 p2 = project(v2);
        
        float d = lineDist(uv, p1, p2);
        float lineCore = smoothstep(0.008, 0.002, d) * depthFade * 0.6;
        float lineGlow = glow(d, 0.004, 200.0) * depthFade * 0.2;
        totalGlow += lineCore + lineGlow;
      }
    }
    
    // Draw hexagonal wireframes - all rotate together as one group
    // Equatorial ring (10 hexes)
    for (int h = 0; h < 10; h++) {
      float hAngle = float(h) * TAU / 10.0;
      vec3 center = vec3(cos(hAngle), 0.0, sin(hAngle)) * sphereRadius;
      center = hexRot * center;
      vec3 normal = normalize(center);
      
      float depth = (center.z + sphereRadius) / (2.0 * sphereRadius);
      float depthFade = 0.3 + depth * 0.7;
      
      for (int i = 0; i < 6; i++) {
        vec3 v1 = hexVertex(center, normal, hexSize, i, 0.0);
        vec3 v2 = hexVertex(center, normal, hexSize, i + 1, 0.0);
        
        vec2 p1 = project(v1);
        vec2 p2 = project(v2);
        
        float d = lineDist(uv, p1, p2);
        float lineCore = smoothstep(0.012, 0.003, d) * depthFade * 0.8;
        float lineGlow = glow(d, 0.008, 150.0) * depthFade * 0.3;
        totalGlow += lineCore + lineGlow;
      }
    }
    
    // Upper ring 1 (9 hexes) - slight offset
    for (int h = 0; h < 9; h++) {
      float hAngle = float(h) * TAU / 9.0 + 0.17;
      vec3 center = vec3(cos(hAngle) * 0.9, 0.44, sin(hAngle) * 0.9);
      center = normalize(center) * sphereRadius;
      center = hexRot * center;
      vec3 normal = normalize(center);
      
      float depth = (center.z + sphereRadius) / (2.0 * sphereRadius);
      float depthFade = 0.3 + depth * 0.7;
      
      for (int i = 0; i < 6; i++) {
        vec3 v1 = hexVertex(center, normal, hexSize, i, 0.0);
        vec3 v2 = hexVertex(center, normal, hexSize, i + 1, 0.0);
        
        vec2 p1 = project(v1);
        vec2 p2 = project(v2);
        
        float d = lineDist(uv, p1, p2);
        float lineCore = smoothstep(0.012, 0.003, d) * depthFade * 0.8;
        float lineGlow = glow(d, 0.008, 150.0) * depthFade * 0.3;
        totalGlow += lineCore + lineGlow;
      }
    }
    
    // Lower ring 1 (9 hexes)
    for (int h = 0; h < 9; h++) {
      float hAngle = float(h) * TAU / 9.0 + 0.17;
      vec3 center = vec3(cos(hAngle) * 0.9, -0.44, sin(hAngle) * 0.9);
      center = normalize(center) * sphereRadius;
      center = hexRot * center;
      vec3 normal = normalize(center);
      
      float depth = (center.z + sphereRadius) / (2.0 * sphereRadius);
      float depthFade = 0.3 + depth * 0.7;
      
      for (int i = 0; i < 6; i++) {
        vec3 v1 = hexVertex(center, normal, hexSize, i, 0.0);
        vec3 v2 = hexVertex(center, normal, hexSize, i + 1, 0.0);
        
        vec2 p1 = project(v1);
        vec2 p2 = project(v2);
        
        float d = lineDist(uv, p1, p2);
        float lineCore = smoothstep(0.012, 0.003, d) * depthFade * 0.8;
        float lineGlow = glow(d, 0.008, 150.0) * depthFade * 0.3;
        totalGlow += lineCore + lineGlow;
      }
    }
    
    // Upper ring 2 (7 hexes)
    for (int h = 0; h < 7; h++) {
      float hAngle = float(h) * TAU / 7.0;
      vec3 center = vec3(cos(hAngle) * 0.64, 0.77, sin(hAngle) * 0.64);
      center = normalize(center) * sphereRadius;
      center = hexRot * center;
      vec3 normal = normalize(center);
      
      float depth = (center.z + sphereRadius) / (2.0 * sphereRadius);
      float depthFade = 0.3 + depth * 0.7;
      
      for (int i = 0; i < 6; i++) {
        vec3 v1 = hexVertex(center, normal, hexSize * 0.9, i, 0.0);
        vec3 v2 = hexVertex(center, normal, hexSize * 0.9, i + 1, 0.0);
        
        vec2 p1 = project(v1);
        vec2 p2 = project(v2);
        
        float d = lineDist(uv, p1, p2);
        float lineCore = smoothstep(0.012, 0.003, d) * depthFade * 0.8;
        float lineGlow = glow(d, 0.008, 150.0) * depthFade * 0.3;
        totalGlow += lineCore + lineGlow;
      }
    }
    
    // Lower ring 2 (7 hexes)
    for (int h = 0; h < 7; h++) {
      float hAngle = float(h) * TAU / 7.0;
      vec3 center = vec3(cos(hAngle) * 0.64, -0.77, sin(hAngle) * 0.64);
      center = normalize(center) * sphereRadius;
      center = hexRot * center;
      vec3 normal = normalize(center);
      
      float depth = (center.z + sphereRadius) / (2.0 * sphereRadius);
      float depthFade = 0.3 + depth * 0.7;
      
      for (int i = 0; i < 6; i++) {
        vec3 v1 = hexVertex(center, normal, hexSize * 0.9, i, 0.0);
        vec3 v2 = hexVertex(center, normal, hexSize * 0.9, i + 1, 0.0);
        
        vec2 p1 = project(v1);
        vec2 p2 = project(v2);
        
        float d = lineDist(uv, p1, p2);
        float lineCore = smoothstep(0.012, 0.003, d) * depthFade * 0.8;
        float lineGlow = glow(d, 0.008, 150.0) * depthFade * 0.3;
        totalGlow += lineCore + lineGlow;
      }
    }
    
    // Top cap ring (4 hexes)
    for (int h = 0; h < 4; h++) {
      float hAngle = float(h) * TAU / 4.0 + 0.4;
      vec3 center = vec3(cos(hAngle) * 0.35, 0.94, sin(hAngle) * 0.35);
      center = normalize(center) * sphereRadius;
      center = hexRot * center;
      vec3 normal = normalize(center);
      
      float depth = (center.z + sphereRadius) / (2.0 * sphereRadius);
      float depthFade = 0.3 + depth * 0.7;
      
      for (int i = 0; i < 6; i++) {
        vec3 v1 = hexVertex(center, normal, hexSize * 0.8, i, 0.0);
        vec3 v2 = hexVertex(center, normal, hexSize * 0.8, i + 1, 0.0);
        
        vec2 p1 = project(v1);
        vec2 p2 = project(v2);
        
        float d = lineDist(uv, p1, p2);
        float lineCore = smoothstep(0.012, 0.003, d) * depthFade * 0.8;
        float lineGlow = glow(d, 0.008, 150.0) * depthFade * 0.3;
        totalGlow += lineCore + lineGlow;
      }
    }
    
    // Bottom cap ring (4 hexes)
    for (int h = 0; h < 4; h++) {
      float hAngle = float(h) * TAU / 4.0 + 0.4;
      vec3 center = vec3(cos(hAngle) * 0.35, -0.94, sin(hAngle) * 0.35);
      center = normalize(center) * sphereRadius;
      center = hexRot * center;
      vec3 normal = normalize(center);
      
      float depth = (center.z + sphereRadius) / (2.0 * sphereRadius);
      float depthFade = 0.3 + depth * 0.7;
      
      for (int i = 0; i < 6; i++) {
        vec3 v1 = hexVertex(center, normal, hexSize * 0.8, i, 0.0);
        vec3 v2 = hexVertex(center, normal, hexSize * 0.8, i + 1, 0.0);
        
        vec2 p1 = project(v1);
        vec2 p2 = project(v2);
        
        float d = lineDist(uv, p1, p2);
        float lineCore = smoothstep(0.012, 0.003, d) * depthFade * 0.8;
        float lineGlow = glow(d, 0.008, 150.0) * depthFade * 0.3;
        totalGlow += lineCore + lineGlow;
      }
    }
    
    // Polar caps (top and bottom single hexes)
    vec3 topCenter = hexRot * vec3(0.0, sphereRadius, 0.0);
    vec3 topNormal = normalize(topCenter);
    float topDepth = (topCenter.z + sphereRadius) / (2.0 * sphereRadius);
    float topFade = 0.3 + topDepth * 0.7;
    
    for (int i = 0; i < 6; i++) {
      vec3 v1 = hexVertex(topCenter, topNormal, hexSize * 0.7, i, 0.0);
      vec3 v2 = hexVertex(topCenter, topNormal, hexSize * 0.7, i + 1, 0.0);
      
      vec2 p1 = project(v1);
      vec2 p2 = project(v2);
      
      float d = lineDist(uv, p1, p2);
      float lineCore = smoothstep(0.012, 0.003, d) * topFade * 0.8;
      float lineGlow = glow(d, 0.008, 150.0) * topFade * 0.3;
      totalGlow += lineCore + lineGlow;
    }
    
    vec3 bottomCenter = hexRot * vec3(0.0, -sphereRadius, 0.0);
    vec3 bottomNormal = normalize(bottomCenter);
    float bottomDepth = (bottomCenter.z + sphereRadius) / (2.0 * sphereRadius);
    float bottomFade = 0.3 + bottomDepth * 0.7;
    
    for (int i = 0; i < 6; i++) {
      vec3 v1 = hexVertex(bottomCenter, bottomNormal, hexSize * 0.7, i, 0.0);
      vec3 v2 = hexVertex(bottomCenter, bottomNormal, hexSize * 0.7, i + 1, 0.0);
      
      vec2 p1 = project(v1);
      vec2 p2 = project(v2);
      
      float d = lineDist(uv, p1, p2);
      float lineCore = smoothstep(0.012, 0.003, d) * bottomFade * 0.8;
      float lineGlow = glow(d, 0.008, 150.0) * bottomFade * 0.3;
      totalGlow += lineCore + lineGlow;
    }
    
    // Edge fade
    vec2 edgeUV = gl_FragCoord.xy / u_resolution;
    float edgeFadeX = smoothstep(0.0, 0.15, edgeUV.x) * smoothstep(1.0, 0.85, edgeUV.x);
    float edgeFadeY = smoothstep(0.0, 0.15, edgeUV.y) * smoothstep(1.0, 0.85, edgeUV.y);
    float edgeFade = edgeFadeX * edgeFadeY;
    totalGlow *= edgeFade;
    
    // Apply color
    col = u_color * totalGlow;
    
    // Subtle scan line effect
    float scanLine = sin(gl_FragCoord.y * 1.5) * 0.04 + 0.96;
    col *= scanLine;
    
    // Tone mapping
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

interface DysonSphereProps {
  className?: string;
}

export default function DysonSphere({ className = "" }: DysonSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const { theme } = useTheme() as { theme: { config: { shader?: string; primary: string } } | null };
  const { audioMetrics, intensity } = useAudio();
  const { settings } = usePerformance();
  const perfRef = useRef(settings);

  // Keep perf ref updated
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

    // Resize handler - uses performance settings for pixel ratio
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, perfRef.current.pixelRatio);
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

    const [r, g, b] = hexToRgb(theme?.config?.shader || theme?.config?.primary || "#22c55e");

    startTimeRef.current = performance.now();
    
    // Store audio ref for render loop
    let currentAudio = { bass: 0, mid: 0, treble: 0, intensity: 1 };
    let lastFrameTime = 0;

    const render = (timestamp: number) => {
      // FPS throttling
      const frameDelay = getFrameDelay(perfRef.current.targetFPS);
      if (frameDelay > 0 && timestamp - lastFrameTime < frameDelay) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }
      lastFrameTime = timestamp;

      // Check if resize needed (when pixel ratio changes)
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
    
    // Update audio values from external source
    const updateAudio = (metrics: { bass: number; mid: number; treble: number; intensity: number }) => {
      currentAudio = metrics;
    };
    
    // Store update function on canvas for external access
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
