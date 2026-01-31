import { themes, useTheme } from "./providers/themeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
export function ThemeDropdown() {
  const { theme, handleThemeChange } = useTheme();

  // Filter out the custom theme - it will have its own submenu with the editor
  const presetThemes = themes.filter((t) => t.name !== "custom");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <span className="text-header">{theme?.label || "Theme"}</span>
        <svg
          className="size-2.5 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {presetThemes.map((option) => (
          <DropdownMenuItem
            onClick={() => handleThemeChange(option.name)}
            key={option.name}
          >
            <p className={option.labelColor}>{option.label}</p>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
