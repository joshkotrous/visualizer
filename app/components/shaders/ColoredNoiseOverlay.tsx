"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo, useEffect } from "react";
import { ShaderMaterial, Vector2 } from "three";
import { usePerformance, getFrameDelay } from "../../contexts/PerformanceContext";

function ColoredNoiseShader() {
  const materialRef = useRef<ShaderMaterial>(null);
  const { settings } = usePerformance();
  const perfRef = useRef(settings);
  const lastFrameTimeRef = useRef(0);

  useEffect(() => {
    perfRef.current = settings;
  }, [settings]);

  const shaderMaterial = useMemo(() => {
    const fragmentShader = `
      uniform float iTime;
      uniform vec2 iResolution;
      varying vec2 vUv;
      
      /** Noise intensity */
      float noiseIntensity = 0.12;
      
      /** Grain size */
      float grainSize = 2.0;
      
      /** Animation speed */
      float animSpeed = 0.8;
      
      /** Color variation intensity */
      float colorVariation = 0.6;
      
      // Simple noise function
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      
      // Smooth noise
      float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        
        vec2 u = f * f * (3.0 - 2.0 * f);
        
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }
      
      // Colored grain function - generates RGB noise separately
      vec3 coloredGrain(vec2 uv, float time) {
        vec2 seed = uv * grainSize;
        
        // Different time offsets for RGB channels
        float timeR = time * animSpeed;
        float timeG = time * animSpeed + 1000.0;
        float timeB = time * animSpeed + 2000.0;
        
        // Generate noise for each color channel
        float grainR = 0.0;
        grainR += noise((seed + timeR) * 2.0) * 0.6;
        grainR += noise((seed + timeR) * 4.0) * 0.3;
        grainR += noise((seed + timeR) * 8.0) * 0.1;
        
        float grainG = 0.0;
        grainG += noise((seed + timeG) * 2.2) * 0.6;
        grainG += noise((seed + timeG) * 4.4) * 0.3;
        grainG += noise((seed + timeG) * 8.8) * 0.1;
        
        float grainB = 0.0;
        grainB += noise((seed + timeB) * 1.8) * 0.6;
        grainB += noise((seed + timeB) * 3.6) * 0.3;
        grainB += noise((seed + timeB) * 7.2) * 0.1;
        
        return vec3(grainR, grainG, grainB);
      }
      
      void main() {
        vec2 uv = vUv;
        vec2 fragCoord = uv * iResolution;
        
        // Generate colored grain
        vec3 grain = coloredGrain(fragCoord, iTime);
        
        // Add some chromatic aberration-style effects
        float aberration = sin(iTime * 10.0) * 0.02;
        grain.r *= 1.0 + aberration;
        grain.g *= 1.0 - aberration * 0.5;
        grain.b *= 1.0 + aberration * 0.3;
        
        // Apply color variation based on position
        vec3 colorShift = vec3(
          sin(uv.x * 20.0 + iTime * 2.0) * 0.1,
          cos(uv.y * 15.0 + iTime * 1.5) * 0.1,
          sin((uv.x + uv.y) * 10.0 + iTime * 3.0) * 0.1
        );
        
        grain += colorShift * colorVariation;
        
        // Apply intensity and create final color
        vec3 color = grain * noiseIntensity;
        
        // Add some subtle RGB shift based on screen position
        color.r += sin(fragCoord.y * 0.01) * 0.02;
        color.g += cos(fragCoord.x * 0.008) * 0.015;
        color.b += sin((fragCoord.x + fragCoord.y) * 0.006) * 0.02;
        
        // Clamp values
        color = clamp(color, 0.0, 1.0);
        
        gl_FragColor = vec4(color, noiseIntensity * 0.7);
      }
    `;

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    return new ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Vector2(1920, 1080) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  useFrame(({ clock }) => {
    const timestamp = performance.now();
    const frameDelay = getFrameDelay(perfRef.current.targetFPS);
    if (frameDelay > 0 && timestamp - lastFrameTimeRef.current < frameDelay) {
      return;
    }
    lastFrameTimeRef.current = timestamp;

    if (materialRef.current) {
      materialRef.current.uniforms.iTime.value = clock.elapsedTime;
      materialRef.current.uniforms.iResolution.value.set(
        window.innerWidth,
        window.innerHeight
      );
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}

export default function ColoredNoiseOverlay() {
  const { settings } = usePerformance();
  const dpr = Math.min(window.devicePixelRatio || 1, settings.pixelRatio);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50"
      style={{
        // CSS blend modes for combining with DOM content
        mixBlendMode: "color-dodge",
        opacity: 1,
      }}
    >
      <Canvas
        orthographic
        camera={{ position: [0, 0, 1], zoom: 1 }}
        dpr={dpr}
        style={{
          background: "transparent",
          pointerEvents: "none",
          width: "100%",
          height: "100%",
        }}
      >
        <ColoredNoiseShader />
      </Canvas>
    </div>
  );
}
