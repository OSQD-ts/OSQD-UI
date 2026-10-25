import { type RefObject, useEffect, useLayoutEffect, useState } from "react";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type FloatingSide = "top" | "bottom" | "start" | "end";

const opposite: Record<FloatingSide, FloatingSide> = { top: "bottom", bottom: "top", start: "end", end: "start" };

/**
 * Keeps an open floating panel (menu, popover) inside the viewport. It flips the panel to the
 * other side of its anchor when that side has more room, then shifts it along the anchor by
 * however much still overflows. The shift goes into `translate` (which composes with any
 * `transform` the CSS uses for centring) and into `--oq-shift`, so an arrow can stay on the
 * anchor. The anchor is the panel's parent element. Returns the side to render.
 */
export function useFitInViewport(ref: RefObject<HTMLElement | null>, open: boolean, preferred: FloatingSide, margin = 8): FloatingSide {
  const [side, setSide] = useState<FloatingSide>(preferred);

  useIsoLayoutEffect(() => {
    if (!open) {
      if (side !== preferred) setSide(preferred);
      return;
    }
    const el = ref.current;
    const anchor = el?.parentElement;
    if (!el || !anchor) return;

    const fit = () => {
      el.style.translate = "";
      el.style.removeProperty("--oq-shift");
      const r = el.getBoundingClientRect();
      const a = anchor.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const room: Record<FloatingSide, number> = { top: a.top, bottom: vh - a.bottom, start: a.left, end: vw - a.right };
      const need = side === "top" || side === "bottom" ? r.height : r.width;
      if (need + margin > room[side] && room[opposite[side]] > room[side]) {
        setSide(opposite[side]);
        return;
      }
      if (side === "top" || side === "bottom") {
        const dx = r.right > vw - margin ? vw - margin - r.right : r.left < margin ? margin - r.left : 0;
        if (dx) {
          el.style.translate = `${Math.round(dx)}px 0`;
          el.style.setProperty("--oq-shift", `${Math.round(dx)}px`);
        }
      } else {
        const dy = r.bottom > vh - margin ? vh - margin - r.bottom : r.top < margin ? margin - r.top : 0;
        if (dy) {
          el.style.translate = `0 ${Math.round(dy)}px`;
          el.style.setProperty("--oq-shift", `${Math.round(dy)}px`);
        }
      }
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [open, side, preferred, margin]);

  return open ? side : preferred;
}
