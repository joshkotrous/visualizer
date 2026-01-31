"use client";

import { useRef, useEffect } from "react";
import { useTheme } from "../providers/themeProvider";
import { useAudio } from "../../contexts/AudioContext";

const vertexShader = `
  attribute vec3 a_position;
  attribute float a_size;
  attribute vec3 a_color;
  attribute float a_alpha;
  
  uniform float u_time;
  uniform float u_pixelRatio;
  uniform float u_aspect;
  uniform vec2 u_mouse;
  uniform vec2 u_mouseVel;
  uniform float u_mouseInfluence;
  uniform vec4 u_trail[8]; // xy = position, zw = velocity
  uniform float u_bass;
  uniform float u_mid;
  uniform float u_treble;
  
  varying vec3 v_color;
  varying float v_alpha;
  
  // Simplex noise functions
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  void main() {
    v_color = a_color;
    v_alpha = a_alpha;
    
    vec3 pos = a_position;
    
    // Organic flowing motion using layered noise
    float t = u_time * 0.15;
    
    // Primary swirl
    float noiseScale = 1.5;
    float noise1 = snoise(vec3(pos.x * noiseScale, pos.y * noiseScale, t));
    float noise2 = snoise(vec3(pos.y * noiseScale, pos.z * noiseScale, t + 100.0));
    float noise3 = snoise(vec3(pos.z * noiseScale, pos.x * noiseScale, t + 200.0));
    
    // Secondary detail noise
    float detailNoise1 = snoise(vec3(pos.x * 3.0, pos.y * 3.0, t * 1.5)) * 0.3;
    float detailNoise2 = snoise(vec3(pos.y * 3.0, pos.z * 3.0, t * 1.5 + 50.0)) * 0.3;
    float detailNoise3 = snoise(vec3(pos.z * 3.0, pos.x * 3.0, t * 1.5 + 100.0)) * 0.3;
    
    // Breathing/pulsing effect - radial to maintain sphere shape
    // Enhanced with audio reactivity
    float distFromCenter = length(pos);
    float baseBreathe = sin(u_time * 0.3 + distFromCenter * 3.0) * 0.08;
    float audioBreathe = u_bass * 0.25 + u_mid * 0.1; // Bass drives main expansion
    float breathe = baseBreathe + audioBreathe;
    vec3 radialDir = normalize(pos + 0.001); // Normalize with small offset to avoid zero
    
    // Add audio-reactive noise intensity
    float audioNoiseBoost = 1.0 + u_treble * 0.5;
    pos.x += (noise1 + detailNoise1) * 0.15 * audioNoiseBoost;
    pos.y += (noise2 + detailNoise2) * 0.15 * audioNoiseBoost;
    pos.z += (noise3 + detailNoise3) * 0.15 * audioNoiseBoost;
    
    // Apply radial breathing
    pos += radialDir * breathe;
    
    // Slow rotation around center
    float angle = u_time * 0.05;
    float cosA = cos(angle);
    float sinA = sin(angle);
    vec3 rotatedPos = vec3(
      pos.x * cosA - pos.z * sinA,
      pos.y,
      pos.x * sinA + pos.z * cosA
    );
    
    // Apply aspect ratio correction to keep sphere circular
    vec2 correctedPos = vec2(rotatedPos.x / u_aspect, rotatedPos.y);
    
    // Mouse interaction with trail for reverb effect
    vec2 totalDisplacement = vec2(0.0);
    
    // Process trail points (older positions with fading influence)
    for (int i = 0; i < 8; i++) {
      vec2 trailPos = u_trail[i].xy;
      vec2 trailVel = u_trail[i].zw;
      
      // Skip if trail point is at origin (unused)
      if (length(trailPos) < 0.001 && length(trailVel) < 0.001) continue;
      
      vec2 toParticle = correctedPos - trailPos;
      vec2 scaledDiff = vec2(toParticle.x * u_aspect, toParticle.y);
      float dist = length(scaledDiff);
      
      // Fade influence based on trail index (older = weaker)
      float ageFade = 1.0 - float(i) / 8.0;
      ageFade = ageFade * ageFade; // Quadratic fade
      
      // Soft exponential falloff
      float influence = exp(-dist * dist * 100.0) * u_mouseInfluence * ageFade;
      
      if (influence > 0.001) {
        float speed = length(trailVel);
        vec2 moveDir = speed > 0.05 ? normalize(trailVel) : vec2(0.0);
        vec2 outwardDir = length(toParticle) > 0.001 ? normalize(toParticle) : vec2(0.0);
        vec2 pushDir = moveDir * 0.7 + outwardDir * 0.3;
        float displacement = influence * min(speed * 0.15, 0.28);
        totalDisplacement += pushDir * displacement;
      }
    }
    
    correctedPos += totalDisplacement;
    
    gl_Position = vec4(correctedPos, 0.0, 1.0);
    
    // Size variation with depth and noise
    float sizeNoise = snoise(vec3(pos.xy * 5.0, u_time * 0.5)) * 0.5 + 0.5;
    float depthFade = smoothstep(-1.0, 1.0, rotatedPos.z) * 0.5 + 0.5;
    
    gl_PointSize = a_size * u_pixelRatio * (0.5 + sizeNoise * 0.5) * depthFade;
    
    // Fade alpha based on depth
    v_alpha = a_alpha * depthFade * (0.6 + sizeNoise * 0.4);
  }
`;

const fragmentShader = `
  precision highp float;
  
  varying vec3 v_color;
  varying float v_alpha;
  
  void main() {
    // Soft circular particle
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    
    // Soft falloff
    float alpha = smoothstep(0.5, 0.0, dist) * v_alpha;
    
    // Slight glow effect
    float glow = exp(-dist * 3.0) * 0.3;
    
    gl_FragColor = vec4(v_color + glow, alpha);
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

// Generate color variations from a base color
function generateColorPalette(baseHex: string): [number, number, number][] {
  const [r, g, b] = hexToRgb(baseHex);

  return [
    [r, g, b], // Base color
    [Math.min(1, r + 0.2), Math.min(1, g + 0.1), Math.min(1, b + 0.1)], // Lighter
    [Math.max(0, r - 0.1), Math.max(0, g - 0.1), Math.min(1, b + 0.2)], // Blue shift
    [Math.min(1, r + 0.1), Math.max(0, g - 0.1), Math.min(1, b + 0.1)], // Slight variation
    [Math.max(0, r - 0.15), Math.min(1, g + 0.15), Math.min(1, b + 0.1)], // Green shift
  ];
}

interface ParticleCloudProps {
  particleCount?: number;
  className?: string;
}

export default function ParticleCloud({
  particleCount = 6000,
  className = "",
}: ParticleCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, influence: 0 });
  const lastMouseRef = useRef({ x: 0, y: 0, time: 0 });
  const mouseTrailRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; age: number }>
  >([]);
  const { theme } = useTheme();
  const { audioMetrics } = useAudio();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !theme) return;

    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: true,
      alpha: true,
      antialias: true,
    });
    if (!gl) return;

    // Mouse tracking with velocity
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const now = performance.now();
      // Convert to normalized coordinates (-1 to 1)
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      // Calculate velocity
      const dt = Math.max(1, now - lastMouseRef.current.time);
      const vx = ((x - lastMouseRef.current.x) / dt) * 1000;
      const vy = ((y - lastMouseRef.current.y) / dt) * 1000;

      mouseRef.current.x = x;
      mouseRef.current.y = y;
      mouseRef.current.vx = vx;
      mouseRef.current.vy = vy;
      mouseRef.current.influence = 1;

      lastMouseRef.current = { x, y, time: now };
    };

    const handleMouseLeave = () => {
      mouseRef.current.influence = 0;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

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

    // Generate theme-aware color palette
    const colors = generateColorPalette(
      theme.config.shader || theme.config.primary
    );

    // Generate particles
    const positions: number[] = [];
    const sizes: number[] = [];
    const particleColors: number[] = [];
    const alphas: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      // Distribute in a uniform sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.33) * 0.7; // Cubic root for uniform volume distribution

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions.push(x, y, z);

      // Random size with bias toward smaller particles
      const size = Math.pow(Math.random(), 2) * 4 + 1;
      sizes.push(size);

      // Pick color from palette with some variation
      const colorIndex = Math.floor(Math.random() * colors.length);
      const baseColor = colors[colorIndex];
      const variation = 0.1;
      particleColors.push(
        baseColor[0] + (Math.random() - 0.5) * variation,
        baseColor[1] + (Math.random() - 0.5) * variation,
        baseColor[2] + (Math.random() - 0.5) * variation
      );

      // Alpha with variation
      alphas.push(Math.random() * 0.5 + 0.3);
    }

    // Create buffers
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    const sizeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.STATIC_DRAW);
    const sizeLoc = gl.getAttribLocation(program, "a_size");
    gl.enableVertexAttribArray(sizeLoc);
    gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(particleColors),
      gl.STATIC_DRAW
    );
    const colorLoc = gl.getAttribLocation(program, "a_color");
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);

    const alphaBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, alphaBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(alphas), gl.STATIC_DRAW);
    const alphaLoc = gl.getAttribLocation(program, "a_alpha");
    gl.enableVertexAttribArray(alphaLoc);
    gl.vertexAttribPointer(alphaLoc, 1, gl.FLOAT, false, 0, 0);

    // Uniform locations for particles
    const timeLoc = gl.getUniformLocation(program, "u_time");
    const pixelRatioLoc = gl.getUniformLocation(program, "u_pixelRatio");
    const aspectLoc = gl.getUniformLocation(program, "u_aspect");
    const mouseLoc = gl.getUniformLocation(program, "u_mouse");
    const mouseVelLoc = gl.getUniformLocation(program, "u_mouseVel");
    const mouseInfluenceLoc = gl.getUniformLocation(
      program,
      "u_mouseInfluence"
    );
    const bassLoc = gl.getUniformLocation(program, "u_bass");
    const midLoc = gl.getUniformLocation(program, "u_mid");
    const trebleLoc = gl.getUniformLocation(program, "u_treble");
    const trailLocs: WebGLUniformLocation[] = [];
    for (let i = 0; i < 8; i++) {
      trailLocs.push(gl.getUniformLocation(program, `u_trail[${i}]`)!);
    }
    
    // Store audio ref for render loop
    let currentAudio = { bass: 0, mid: 0, treble: 0 };

    // Enable blending for soft particles
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive blending for glow effect

    startTimeRef.current = performance.now();

    // Smoothed mouse influence for transitions
    let smoothInfluence = 0;
    let lastTrailUpdate = 0;

    const render = () => {
      const time = (performance.now() - startTimeRef.current) / 1000;
      const aspect = canvas.width / canvas.height;
      const now = performance.now();

      // Smooth the mouse influence - fast response
      const targetInfluence = mouseRef.current.influence;
      smoothInfluence += (targetInfluence - smoothInfluence) * 0.3;

      // Update trail every 30ms when mouse is active
      if (now - lastTrailUpdate > 30 && mouseRef.current.influence > 0.5) {
        const speed = Math.sqrt(
          mouseRef.current.vx ** 2 + mouseRef.current.vy ** 2
        );
        if (speed > 0.1) {
          mouseTrailRef.current.unshift({
            x: mouseRef.current.x,
            y: mouseRef.current.y,
            vx: mouseRef.current.vx,
            vy: mouseRef.current.vy,
            age: 0,
          });
          if (mouseTrailRef.current.length > 8) {
            mouseTrailRef.current.pop();
          }
        }
        lastTrailUpdate = now;
      }

      // Age and fade trail points
      mouseTrailRef.current = mouseTrailRef.current.filter((p) => {
        p.age += 1;
        return p.age < 30; // Remove after ~1 second
      });

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      // Re-bind particle buffers
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(posLoc);

      gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
      gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(sizeLoc);

      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(colorLoc);

      gl.bindBuffer(gl.ARRAY_BUFFER, alphaBuffer);
      gl.vertexAttribPointer(alphaLoc, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(alphaLoc);

      gl.uniform1f(timeLoc, time);
      gl.uniform1f(pixelRatioLoc, Math.min(window.devicePixelRatio, 2));
      gl.uniform1f(aspectLoc, aspect);
      gl.uniform2f(mouseLoc, mouseRef.current.x, mouseRef.current.y);
      gl.uniform2f(mouseVelLoc, mouseRef.current.vx, mouseRef.current.vy);
      gl.uniform1f(mouseInfluenceLoc, smoothInfluence);
      gl.uniform1f(bassLoc, currentAudio.bass);
      gl.uniform1f(midLoc, currentAudio.mid);
      gl.uniform1f(trebleLoc, currentAudio.treble);

      // Pass trail data to shader
      for (let i = 0; i < 8; i++) {
        const trail = mouseTrailRef.current[i];
        if (trail) {
          const fade = 1 - trail.age / 30;
          gl.uniform4f(
            trailLocs[i],
            trail.x,
            trail.y,
            trail.vx * fade,
            trail.vy * fade
          );
        } else {
          gl.uniform4f(trailLocs[i], 0, 0, 0, 0);
        }
      }

      gl.drawArrays(gl.POINTS, 0, particleCount);

      animationRef.current = requestAnimationFrame(render);
    };
    
    // Update audio values from external source
    const updateAudio = (metrics: { bass: number; mid: number; treble: number }) => {
      currentAudio = metrics;
    };
    
    // Store update function on canvas for external access
    (canvas as HTMLCanvasElement & { updateAudio?: typeof updateAudio }).updateAudio = updateAudio;

    render();

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
    };
  }, [particleCount, theme]);

  // Update audio metrics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasWithAudio = canvas as HTMLCanvasElement & { updateAudio?: (metrics: { bass: number; mid: number; treble: number }) => void };
    if (canvasWithAudio.updateAudio) {
      canvasWithAudio.updateAudio(audioMetrics);
    }
  }, [audioMetrics]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ background: "transparent", cursor: "pointer" }}
    />
  );
}
