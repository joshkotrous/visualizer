"use client";

import { useRef, useState, useEffect, ReactNode } from "react";

interface LazyShaderProps {
  children: ReactNode;
  className?: string;
}

// Only renders children when the container is visible in viewport
// This prevents WebGL context creation for off-screen shaders
export function LazyShader({ children, className }: LazyShaderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : null}
    </div>
  );
}
