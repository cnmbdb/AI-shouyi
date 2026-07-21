import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ThemeContext = createContext(null);
const storageKey = "aether-ui-theme:v1";

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(storageKey, theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle({ className }) {
  const context = useContext(ThemeContext);
  if (!context) return null;
  const nextTheme = context.theme === "dark" ? "light" : "dark";
  const Icon = context.theme === "dark" ? SunIcon : MoonIcon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button className={className} variant="outline" size="icon-sm" type="button" onClick={() => context.setTheme(nextTheme)} aria-label={nextTheme === "dark" ? "切换到深色模式" : "切换到浅色模式"}>
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{nextTheme === "dark" ? "深色模式" : "浅色模式"}</TooltipContent>
    </Tooltip>
  );
}
