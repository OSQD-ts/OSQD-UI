import { createContext, type HTMLAttributes, type ReactNode, useContext, useEffect } from "react";
import { cx } from "../cx";

export type Density = "compact" | "default" | "comfortable";

const DensityContext = createContext<Density>("default");

/** The density of the surrounding <DensityProvider>; "default" without one. */
export function useDensity(): Density {
  return useContext(DensityContext);
}

export interface DensityProviderProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  density: Density;
  /** Set it on <html> instead of a wrapper div, so the whole page (and portals) follow. */
  fullPage?: boolean;
  children?: ReactNode;
}

/**
 * Sets `data-density` for everything inside: compact and comfortable rescale the spacing unit,
 * control heights and text steps; "default" leaves the theme's own sizes.
 */
export function DensityProvider({ density, fullPage, className, children, ...rest }: DensityProviderProps) {
  useEffect(() => {
    if (!fullPage) return;
    const html = document.documentElement;
    const prev = html.getAttribute("data-density");
    if (density === "default") html.removeAttribute("data-density");
    else html.setAttribute("data-density", density);
    return () => {
      if (prev === null) html.removeAttribute("data-density");
      else html.setAttribute("data-density", prev);
    };
  }, [density, fullPage]);

  return (
    <DensityContext.Provider value={density}>
      {fullPage ? (
        children
      ) : (
        <div {...rest} className={cx(className)} data-density={density === "default" ? undefined : density}>
          {children}
        </div>
      )}
    </DensityContext.Provider>
  );
}
