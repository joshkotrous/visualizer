"use client";

import { useEffect } from "react";

export default function BloomEffect() {
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "bloom-effect";
    style.textContent = `
      /* Text elements get subtle glow */
      h1:not(.no-glow):not(.no-glow *), 
      h2:not(.no-glow):not(.no-glow *), 
      h3:not(.no-glow):not(.no-glow *), 
      h4:not(.no-glow):not(.no-glow *), 
      h5:not(.no-glow):not(.no-glow *), 
      h6:not(.no-glow):not(.no-glow *),
      p:not(.no-glow):not(.no-glow *), 
      span:not(.no-glow):not(.no-glow *), 
      a:not(.no-glow):not(.no-glow *), 
      button:not(.no-glow):not(.no-glow *) {
        text-shadow: 
          0 0 2px currentColor,
          0 0 4px currentColor;
        filter: brightness(1.05);
        transition: all 0.2s ease;
      }

      /* Links and buttons get interactive glow */
      a:not(.no-glow):not(.no-glow *):hover, 
      button:not(.no-glow):not(.no-glow *):hover {
        text-shadow: 
          0 0 3px currentColor,
          0 0 6px currentColor,
          0 0 9px currentColor;
        filter: brightness(1.08) contrast(1.02);
      }

      /* Comprehensive image and SVG targeting */
      svg:not(.no-glow):not(.no-glow *),
      img:not(.no-glow):not(.no-glow *),
      svg:not(.no-glow):not(.no-glow *) *,
      [class*="icon"]:not(.no-glow):not(.no-glow *),
      [class*="Icon"]:not(.no-glow):not(.no-glow *),
      [class*="logo"]:not(.no-glow):not(.no-glow *),
      [class*="Logo"]:not(.no-glow):not(.no-glow *),
      [class*="image"]:not(.no-glow):not(.no-glow *),
      [class*="Image"]:not(.no-glow):not(.no-glow *) {
        filter: 
          drop-shadow(0 0 0.5px currentColor)
          drop-shadow(0 0 0.5px currentColor)
          brightness(1.05);
        transition: filter 0.2s ease;
      }

      /* Interactive image/SVG hover states */
      a:not(.no-glow):hover svg,
      button:not(.no-glow):hover svg,
      a:not(.no-glow):hover img,
      button:not(.no-glow):hover img,
      a:not(.no-glow):hover [class*="icon"],
      a:not(.no-glow):hover [class*="Icon"],
      a:not(.no-glow):hover [class*="logo"],
      a:not(.no-glow):hover [class*="Logo"],
      button:not(.no-glow):hover [class*="icon"],
      button:not(.no-glow):hover [class*="Icon"],
      button:not(.no-glow):hover [class*="logo"],
      button:not(.no-glow):hover [class*="Logo"] {
        filter: 
          drop-shadow(0 0 2px currentColor)
          drop-shadow(0 0 4px currentColor)
          brightness(1.08);
      }

      /* Border elements - use primary color for glow to match border */
      [class*="border"]:not(.no-glow):not(.no-glow *) {
        box-shadow: 
          0 0 2px var(--color-primary, rgb(34 197 94)),
          inset 0 0 2px var(--color-primary, rgb(34 197 94));
        transition: box-shadow 0.2s ease;
      }

      [class*="border"]:not(.no-glow):not(.no-glow *):hover {
        box-shadow: 
          0 0 4px var(--color-primary, rgb(34 197 94)),
          inset 0 0 4px var(--color-primary, rgb(34 197 94));
      }

      /* Respect user preferences */
      @media (prefers-reduced-motion: reduce) {
        * {
          transition: none !important;
        }
      }
    `;

    document.head.appendChild(style);

    // Set the glow color CSS variable
    document.documentElement.style.setProperty(
      "--glow-color",
      "rgb(34 197 94)",
    );

    return () => {
      const existingStyle = document.getElementById("bloom-effect");
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return null;
}
