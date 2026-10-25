import { type CSSProperties, createContext, type HTMLAttributes, type ReactNode, useContext, useEffect, useMemo } from "react";
import { type BuiltInThemeName, darkTheme, type Theme, themes, themeStyle } from "../theme/index";
import { cx } from "./cx";

/** A built-in theme, or "auto" (dark or light, following the operating system). */
export type ThemeName = BuiltInThemeName | "auto";

export interface ThemeContextValue {
  /** The resolved name: "auto" stays "auto" (the OS decides in CSS), a custom theme reports its own name. */
  name: string;
  /** The theme object when one is known: the built-in one, the custom one, or null for "auto". */
  theme: Theme | null;
}

const ThemeContext = createContext<ThemeContextValue>({ name: "dark", theme: darkTheme });

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export interface ThemeProviderProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** A built-in name, or a theme from `createTheme` (its variables are set inline). */
  theme?: ThemeName | Theme;
  /**
   * Put `.oq` and `data-theme` on `<html>` instead of a wrapper div, so the page background,
   * scrollbars and portals all follow the theme.
   */
  fullPage?: boolean;
  children?: ReactNode;
}

/** Applies a theme (a built-in name, "auto" or a `createTheme` object) to its subtree or, with `fullPage`, to the whole page. */
export function ThemeProvider({ theme = "dark", fullPage = false, className, style, children, ...rest }: ThemeProviderProps) {
  const custom = typeof theme === "object" ? theme : null;
  const name = custom ? custom.name : (theme as ThemeName);
  const vars = useMemo(() => (custom ? (themeStyle(custom) as CSSProperties) : undefined), [custom]);
  const value = useMemo<ThemeContextValue>(
    () => ({ name, theme: custom ?? (name === "auto" ? null : (themes[name as BuiltInThemeName] ?? null)) }),
    [name, custom],
  );
  // A custom theme's data-theme names its base mode, so the built-in rules still match underneath.
  const dataTheme = custom ? custom.mode : name;

  useEffect(() => {
    if (!fullPage) return;
    const html = document.documentElement;
    const prevTheme = html.getAttribute("data-theme");
    html.classList.add("oq");
    html.setAttribute("data-theme", dataTheme);
    const set: string[] = [];
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        html.style.setProperty(k, String(v));
        set.push(k);
      }
    }
    return () => {
      html.classList.remove("oq");
      if (prevTheme === null) html.removeAttribute("data-theme");
      else html.setAttribute("data-theme", prevTheme);
      for (const k of set) html.style.removeProperty(k);
    };
  }, [fullPage, dataTheme, vars]);

  if (fullPage) return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
  return (
    <ThemeContext.Provider value={value}>
      <div {...rest} className={cx("oq", className)} data-theme={dataTheme} style={{ ...vars, ...style }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
