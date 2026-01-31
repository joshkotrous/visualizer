import { themes, useTheme } from "./providers/themeProvider";

export function ThemeDropdown() {
  const { theme, handleThemeChange } = useTheme();

  // Filter out the custom theme
  const presetThemes = themes.filter((t) => t.name !== "custom");

  return (
    <div className="flex items-center gap-2">
      <span className="text-white/60">Theme:</span>
      <select
        value={theme?.name || ""}
        onChange={(e) => handleThemeChange(e.target.value)}
        className="bg-transparent border border-white/20 rounded px-2 py-1 text-white/80 text-xs"
      >
        {presetThemes.map((option) => (
          <option key={option.name} value={option.name} className="bg-black">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
