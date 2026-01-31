"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type CustomThemeColors = {
  primary: string;
  shader: string;
  header: string;
};

export const ThemeContext = createContext({
  theme: null,
  isLoading: true,
  handleThemeChange: (theme: string) => {},
  applyCustomTheme: (colors: CustomThemeColors) => {},
  customColors: null as CustomThemeColors | null,
});

type Theme = {
  name: string;
  label: string;
  labelColor: string;
  config: {
    primary: string;
    border: string;
    background: string;
    text: string;
    glow: string;
    shader?: string; // Optional: separate color for WebGL shaders (defaults to primary if not set)
    accent?: string; // Optional: accent color for vibe themes
    header?: string; // Optional: color for h1, h2, h3 headers (defaults to primary if not set)
  };
};

export const themes: Theme[] = [
  {
    name: "green",
    label: "Green",
    labelColor: "!text-green-500",
    config: {
      primary: "#22c55e",
      border: "#22c55e",
      background: "#121212",
      text: "#22c55e",
      glow: "#22c55e",
    },
  },
  {
    name: "amber",
    label: "Amber",
    labelColor: "!text-amber-500",
    config: {
      primary: "#fe9a00",
      border: "#fe9a00",
      background: "#121212",
      text: "#fe9a00",
      glow: "#fe9a00",
    },
  },
  {
    name: "purple",
    label: "Purple",
    labelColor: "!text-purple-500",
    config: {
      primary: "#8b5cf6",
      border: "#8b5cf6",
      background: "#121212",
      text: "#8b5cf6",
      glow: "#8b5cf6",
    },
  },
  {
    name: "blue",
    label: "Blue",
    labelColor: "!text-blue-500",
    config: {
      primary: "#3b82f6",
      border: "#3b82f6",
      background: "#121212",
      text: "#3b82f6",
      glow: "#3b82f6",
    },
  },
  {
    name: "red",
    label: "Red",
    labelColor: "!text-red-500",
    config: {
      primary: "#ef4444",
      border: "#ef4444",
      background: "#121212",
      text: "#ef4444",
      glow: "#ef4444",
    },
  },
  {
    name: "cyan",
    label: "Cyan",
    labelColor: "!text-cyan-500",
    config: {
      primary: "#06b6d4",
      border: "#06b6d4",
      background: "#121212",
      text: "#06b6d4",
      glow: "#06b6d4",
    },
  },
  {
    name: "pink",
    label: "Pink",
    labelColor: "!text-pink-500",
    config: {
      primary: "#ec4899",
      border: "#ec4899",
      background: "#121212",
      text: "#ec4899",
      glow: "#ec4899",
    },
  },
  // Vibe Themes - multi-color themes with distinct shader colors
  {
    name: "sunrise",
    label: "Sunrise",
    labelColor: "!text-sky-400",
    config: {
      primary: "#38bdf8", // Sky blue for text and UI
      border: "#38bdf8",
      background: "#0c0a14", // Deep blue-black
      text: "#38bdf8",
      glow: "#f59e0b", // Amber glow
      shader: "#f59e0b", // Amber for shaders
      accent: "#fb923c", // Orange accent
      header: "#f59e0b", // Amber for headers
    },
  },
  {
    name: "evangelion",
    label: "EVA-01",
    labelColor: "!text-violet-500",
    config: {
      primary: "#8b5cf6", // Purple for text and UI
      border: "#8b5cf6",
      background: "#0a0a0f", // Deep dark purple-black
      text: "#8b5cf6",
      glow: "#f97316", // Orange glow
      shader: "#22c55e", // EVA green for shaders
      accent: "#f97316", // Orange accent
      header: "#f97316", // Orange for headers
    },
  },
  {
    name: "synthwave",
    label: "Synthwave",
    labelColor: "!text-fuchsia-500",
    config: {
      primary: "#d946ef", // Fuchsia/magenta for text and UI
      border: "#d946ef",
      background: "#0f0720", // Deep purple-black
      text: "#d946ef",
      glow: "#06b6d4", // Cyan glow
      shader: "#06b6d4", // Cyan for shaders
      accent: "#f0abfc", // Light pink accent
      header: "#06b6d4", // Cyan for headers
    },
  },
  {
    name: "neotokyo",
    label: "Neo Tokyo",
    labelColor: "!text-rose-500",
    config: {
      primary: "#ff2d55", // Kaneda's bike red for text and UI
      border: "#ff2d55",
      background: "#050510", // Deep dark blue-black night
      text: "#ff2d55",
      glow: "#00d4ff", // Electric blue neon glow
      shader: "#00d4ff", // Electric blue for shaders - neon signs
      accent: "#00d4ff", // Electric blue accent
      header: "#00d4ff", // Electric blue for headers - like neon signs
    },
  },
  {
    name: "white",
    label: "White",
    labelColor: "!text-white",
    config: {
      primary: "#ffffff", // White for text and UI
      border: "#ffffff",
      background: "#121212", // Dark background
      text: "#ffffff",
      glow: "#ffffff", // White glow
      shader: "#ffffff", // White for shaders
      header: "#ffffff", // White for headers
    },
  },
  {
    name: "custom",
    label: "Custom",
    labelColor: "!text-zinc-400",
    config: {
      primary: "#ffffff",
      border: "#ffffff",
      background: "#121212",
      text: "#ffffff",
      glow: "#ffffff",
      shader: "#ffffff",
      header: "#ffffff",
    },
  },
];

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [customColors, setCustomColors] = useState<CustomThemeColors | null>(
    null,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const _theme = localStorage.getItem("theme");

    // Load custom colors if they exist
    const savedCustomColors = localStorage.getItem("customThemeColors");
    if (savedCustomColors) {
      setCustomColors(JSON.parse(savedCustomColors));
    }

    if (!_theme) {
      // Pick a random theme on first visit (exclude custom theme)
      const nonCustomThemes = themes.filter((t) => t.name !== "custom");
      const randomTheme =
        nonCustomThemes[Math.floor(Math.random() * nonCustomThemes.length)];
      handleThemeChange(randomTheme.name);
      setIsLoading(false);
      return;
    }

    // If it's a custom theme, load and apply custom colors
    if (_theme === "custom" && savedCustomColors) {
      const colors = JSON.parse(savedCustomColors) as CustomThemeColors;
      const customTheme = themes.find((t) => t.name === "custom");
      if (customTheme) {
        setTheme({
          ...customTheme,
          config: {
            ...customTheme.config,
            primary: colors.primary,
            border: colors.primary,
            text: colors.primary,
            glow: colors.primary,
            shader: colors.shader,
            header: colors.header,
          },
        });
      }
    } else {
      setTheme(themes.find((theme) => theme.name === _theme) || themes[0]);
    }
    setIsLoading(false);
  }, []);

  // Apply CSS variables when theme changes
  useEffect(() => {
    if (theme) {
      const root = document.documentElement;
      root.style.setProperty("--color-primary", theme.config.primary);
      root.style.setProperty("--color-border", theme.config.border);
      root.style.setProperty("--border", theme.config.border); // For Tailwind's border-border class
      root.style.setProperty("--glow-color", theme.config.glow);
      root.style.setProperty("--color-background", theme.config.background);
      root.style.setProperty("--color-text", theme.config.text);
      root.style.setProperty(
        "--color-shader",
        theme.config.shader || theme.config.primary,
      );
      root.style.setProperty(
        "--color-header",
        theme.config.header || theme.config.primary,
      );
      if (theme.config.accent) {
        root.style.setProperty("--color-accent", theme.config.accent);
      }
    }
  }, [theme]);

  function handleThemeChange(newTheme: string) {
    const _theme = themes.find((theme) => theme.name === newTheme);
    if (_theme) {
      // If switching to custom, apply saved custom colors
      if (newTheme === "custom" && customColors) {
        setTheme({
          ..._theme,
          config: {
            ..._theme.config,
            primary: customColors.primary,
            border: customColors.primary,
            text: customColors.primary,
            glow: customColors.primary,
            shader: customColors.shader,
            header: customColors.header,
          },
        });
      } else {
        setTheme(_theme);
      }
      localStorage.setItem("theme", _theme.name);
    }
  }

  function applyCustomTheme(colors: CustomThemeColors) {
    setCustomColors(colors);
    localStorage.setItem("customThemeColors", JSON.stringify(colors));
    localStorage.setItem("theme", "custom");

    const customTheme = themes.find((t) => t.name === "custom");
    if (customTheme) {
      setTheme({
        ...customTheme,
        config: {
          ...customTheme.config,
          primary: colors.primary,
          border: colors.primary,
          text: colors.primary,
          glow: colors.primary,
          shader: colors.shader,
          header: colors.header,
        },
      });
    }
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isLoading,
        handleThemeChange,
        applyCustomTheme,
        customColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  if (!ThemeContext) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return useContext(ThemeContext);
};
