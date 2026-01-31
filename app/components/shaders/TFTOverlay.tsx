"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo, useEffect, useState } from "react";
import { ShaderMaterial, Vector2, Vector3 } from "three";
import { useTheme } from "../providers/themeProvider";
import { usePerformance, getFrameDelay } from "../../contexts/PerformanceContext";

// Helper function to convert hex color to Vector3
function hexToVector3(hex: string): Vector3 {
  const color = parseInt(hex.replace("#", ""), 16);
  const r = ((color >> 16) & 255) / 255;
  const g = ((color >> 8) & 255) / 255;
  const b = (color & 255) / 255;
  return new Vector3(r, g, b);
}

function TFTShader() {
  const materialRef = useRef<ShaderMaterial>(null);
  const { theme } = useTheme();
  const { settings } = usePerformance();
  const perfRef = useRef(settings);
  const lastFrameTimeRef = useRef(0);

  useEffect(() => {
    perfRef.current = settings;
  }, [settings]);

  const shaderMaterial = useMemo(() => {
    // Get color values from theme context
    const colorValues = theme?.config
      ? hexToVector3(theme.config.shader || theme.config.primary)
      : new Vector3(0.996, 0.604, 0.0); // fallback to amber

    // TFT shader converted from ShaderToy format to Three.js
    const fragmentShader = `
      uniform float iTime;
      uniform vec2 iResolution;
      uniform vec3 terminalColor;
      varying vec2 vUv;
      
      /** Size of TFT "pixels" */
      float resolution = 5.5;
      
      /** Strength of effect */
      float strength = 0.25;
      
      void _scanline(inout vec3 color, vec2 uv)
      {
          float scanline = step(1.8, mod(uv.y * iResolution.y, resolution));
          float grille   = step(0.2, mod(uv.x * iResolution.x, resolution));
          color *= max(1.0 - strength, scanline * grille);
      }
      
      void main()
      {
          vec2 fragCoord = vUv * iResolution;
          vec2 uv = fragCoord.xy / iResolution.xy;
          
          // Create a base pattern since we don't have iChannel0
          // Generate a simple terminal-like pattern
          vec3 color = terminalColor;
          
          // Add some content patterns
          float textPattern = sin(uv.y * 40.0) * 0.5 + 0.5;
          textPattern = smoothstep(1.5, 1.25, textPattern);
          color *= textPattern * 0.8 + 0.2;
          
          // Add some animation
          color *= (1.0 + sin(iTime * 2.0 + uv.y * 10.0) * 0.1);
          
          _scanline(color, uv);
          
          gl_FragColor = vec4(color, 0.6);
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
        terminalColor: { value: colorValues },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    });
  }, [theme]);

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

export default function TFTOverlay() {
  const { settings } = usePerformance();
  const [dpr, setDpr] = useState(1);

  useEffect(() => {
    setDpr(Math.min(window.devicePixelRatio || 1, settings.pixelRatio));
  }, [settings.pixelRatio]);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50"
      style={{
        // CSS blend modes for combining with DOM content
        mixBlendMode: "color-dodge",
        opacity: 0.1,
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
        <TFTShader />
      </Canvas>
    </div>
  );
}
