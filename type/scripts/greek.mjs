// The "greek" glyph module: modern (monotonic) Greek for every OSQD family and its mono.
//
// Capitals that are the Latin letter (Α Β Ε Ζ Η Ι Κ Μ Ν Ο Ρ Τ Υ Χ) reuse the Latin drawing, so
// the two scripts set as one; the rest are drawn here with the same pen and parameters. The
// lowercase is Greek throughout, kept apart from its Latin look-alikes: ν leans its point to the
// left (v points in the middle), υ is a cup without the stem u has, ρ's stem stops inside the
// bowl, ι has no dot and a tail. Capitals carry the tonos to their LEFT, where it widens the
// glyph; lowercase carries it above, as an accent that does not move the letter.

export const id = "greek";

/** Horizontal half-width of a diagonal stroke of thickness t over (dx, dy). */
const hwOf = (t, dx, dy) => (t / 2) * (Math.hypot(dx, dy) / Math.abs(dy || 1));

export function glyphs(api) {
  const { p, defs, sym, accents } = api;
  const { bar } = api.geom;
  const clear = p.family === "clear";
  const out = [];
  const add = (name, unicode, sides, width, draw, accent) => out.push({ name, unicode, sides, width, draw, accent });

  /** A Latin drawing, unchanged. */
  const latin = (ch) => {
    const [sides, width, draw] = defs[ch];
    return { sides, width: width || p.S, draw };
  };

  /* ---------------------------------------------------------------- shared parts */

  function vee(g, x0, x1, top, bottom, t, at = 0.5) {
    const cx = x0 + (x1 - x0) * at;
    g.stroke(x0 + hwOf(t, cx - x0, top - bottom), top, cx, bottom, t);
    g.stroke(x1 - hwOf(t, x1 - cx, top - bottom), top, cx, bottom, t);
  }

  /** A cup: two short sides joined by the lower half of a ring (υ, ψ, the bones of ω). */
  function cup(g, x0, x1, top) {
    const { S, O } = g.p;
    const r = (x1 - x0) / 2;
    g.rect(x0, r - O - 6, x0 + S, top);
    g.rect(x1 - S, r - O - 6, x1, top);
    g.sector(x0, -O, x1, 2 * r - O, 2, 4);
  }

  /** The curl a stem ends in at the baseline (t, ι, α): a quarter turn out to the right. */
  function curl(g, x, w) {
    const { S, O } = g.p;
    const r = Math.max(S * 1.45, Math.min(130, w * 0.8));
    g.rect(x, r - O - 8, x + S, g.p.X);
    g.sector(x, -O, x + 2 * r, 2 * r - O, 2.0, 3.48, "r", g.p.cut === "r" ? "r" : "v");
  }

  /* ---------------------------------------------------------------- capitals */

  const UPPER = {
    Gamma: ["Γ", "SS", 404, (g, w) => {
      const { C, S, H } = g.p;
      g.rect(0, 0, S, C);
      g.rect(0, C - H, w, C);
    }],
    Delta: ["Δ", "DD", 600, (g, w) => {
      const { C, S, H } = g.p;
      const t = S * 0.98;
      const cx = w / 2;
      const hw = hwOf(t, cx, C);
      g.stroke(hw, 0, cx, C, t);
      g.stroke(w - hw, 0, cx, C, t);
      g.rect(0, 0, w, H);
    }],
    Theta: ["Θ", "RR", 610, (g, w) => {
      const { C, OC, S, H } = g.p;
      g.ring(0, -OC, w, C + OC);
      const m = C / 2;
      // Clear lets the bar touch the sides, so Θ never reads as O at a glance.
      const inset = clear ? S * 0.5 : w * 0.26;
      g.rect(inset, m - H / 2, w - inset, m + H / 2);
    }],
    Lambda: ["Λ", "DD", 580, (g, w) => {
      const { C, S } = g.p;
      const t = S * 0.98;
      const cx = w / 2;
      const hw = hwOf(t, cx, C);
      g.stroke(hw, 0, cx, C, t);
      g.stroke(w - hw, 0, cx, C, t);
    }],
    Xi: ["Ξ", "SS", 480, (g, w) => {
      const { C, H } = g.p;
      g.rect(0, C - H, w, C);
      g.rect(w * 0.12, C * 0.48 - H / 2, w * 0.88, C * 0.48 + H / 2);
      g.rect(0, 0, w, H);
    }],
    Pi: ["Π", "SS", 512, (g, w) => {
      const { C, S, H } = g.p;
      g.rect(0, 0, S, C);
      g.rect(w - S, 0, w, C);
      g.rect(0, C - H, w, C);
    }],
    Sigma: ["Σ", "SS", 480, (g, w) => {
      const { C, S, H } = g.p;
      const t = S * 0.98;
      const m = C * 0.5;
      const xm = w * 0.52;
      g.rect(0, C - H, w, C);
      g.rect(0, 0, w, H);
      g.stroke(S * 0.2 + hwOf(t, xm, m), C - H * 0.5, xm, m, t);
      g.stroke(xm, m, S * 0.2 + hwOf(t, xm, m), H * 0.5, t);
    }],
    Phi: ["Φ", "RR", 660, (g, w) => {
      const { C, S, H } = g.p;
      const cx = w / 2;
      g.ring(0, C * 0.14, w, C * 0.86, S, H);
      g.rect(cx - S / 2, 0, cx + S / 2, C);
    }],
    Psi: ["Ψ", "SS", 620, (g, w) => {
      const { C, S } = g.p;
      const cx = w / 2;
      const top = C;
      const r = w / 2;
      g.rect(0, C * 0.3 + r * 0.6, S, top);
      g.rect(w - S, C * 0.3 + r * 0.6, w, top);
      g.sector(0, C * 0.3 - r * 0.4, w, C * 0.3 + r * 1.6, 2, 4);
      g.rect(cx - S / 2, 0, cx + S / 2, C);
    }],
    Omega: ["Ω", "NN", 620, (g, w) => {
      const { C, S, H, OC } = g.p;
      // A ring open at the bottom; its ends run down into two short stems standing on feet.
      const top = C + OC;
      const y0 = H * 0.9;
      const q = 0.42;
      g.sector(0, y0, w, top, 3 + q, 7 - q, "r", "r");
      const ry = (top - y0) / 2;
      const yEnd = y0 + ry - ry * Math.cos((q * Math.PI) / 2);
      const xEnd = (w / 2) * Math.sin((q * Math.PI) / 2);
      const xl = w / 2 - xEnd;
      const xr = w / 2 + xEnd;
      // The stems run well up into the arc's ends, so the joins stay full at Bold.
      g.rect(xl - S * 0.15, 0, xl + S * 0.85, yEnd + S);
      g.rect(xr - S * 0.85, 0, xr + S * 0.15, yEnd + S);
      g.rect(0, 0, xl + S * 0.85, H);
      g.rect(xr - S * 0.85, 0, w, H);
    }],
  };

  const reuseUpper = { Alpha: ["Α", "A"], Beta: ["Β", "B"], Epsilon: ["Ε", "E"], Zeta: ["Ζ", "Z"], Eta: ["Η", "H"], Iota: ["Ι", "I"], Kappa: ["Κ", "K"], Mu: ["Μ", "M"], Nu: ["Ν", "N"], Omicron: ["Ο", "O"], Rho: ["Ρ", "P"], Tau: ["Τ", "T"], Upsilon: ["Υ", "Y"], Chi: ["Χ", "X"] };

  /** Every capital's drawing by Greek character, for the accented forms. */
  const capital = {};
  for (const [name, [ch, base]] of Object.entries(reuseUpper)) {
    const d = latin(base);
    capital[ch] = d;
    add(name, ch, d.sides, d.width, d.draw);
  }
  for (const [name, [ch, sides, width, draw]] of Object.entries(UPPER)) {
    capital[ch] = { sides, width, draw };
    add(name, ch, sides, width, draw);
  }

  /* ---------------------------------------------------------------- lowercase */

  const LOWER = {
    alpha: ["α", "RN", 452, (g, w) => {
      const { S, H, X, O } = g.p;
      const wb = w * 0.8;
      // The bowl is a little lighter than the stroke beside it, or the two clot at Bold.
      g.ring(0, -O, wb, X + O, S * 0.86, H * 0.9);
      // The right stroke runs from the top of the bowl down into a curl past the baseline.
      const x = wb - S * 0.7;
      const r = Math.max(S * 1.15, 92);
      g.rect(x, r - O - 8, x + S, X + O);
      g.sector(x, -O, x + 2 * r, 2 * r - O, 2.0, 3.48, "r", g.p.cut === "r" ? "r" : "v");
    }],
    beta: ["β", "SR", 430, (g, w) => {
      const { S, H, A, X, D, O } = g.p;
      const m = X * 0.6;
      // Every join overlaps rather than touches: the stem runs up into the upper bowl's end, and
      // the bars run past the points where both bowls start — touching shapes antialias into a
      // hairline seam, which showed at the heavy mono weights.
      const yTop = (m - H / 2 + A + O) / 2;
      g.rect(0, D, S, yTop + 8);
      g.sector(0, m - H / 2, w * 0.9, A + O, 3, 6.02, "r", "r");
      g.rect(S * 0.5, m - H / 2, w * 0.5 + 8, m + H / 2);
      g.sector(0, -O, w, m + H / 2, 3, 5, "r", "r");
      g.rect(S * 0.5, -O, w * 0.5 + 8, -O + H);
    }],
    gamma: ["γ", "DD", 446, (g, w) => {
      const { S, X, D } = g.p;
      const t = S * 0.93;
      vee(g, 0, w, X, 0, t);
      const cx = w / 2;
      g.rect(cx - S * 0.46, D * 0.85, cx + S * 0.46, S * 0.3);
    }],
    delta: ["δ", "RR", 452, (g, w) => {
      const { S, H, X, A, O } = g.p;
      g.ring(0, -O, w, X + O);
      const t = S * 0.9;
      g.add(bar(w * 0.58, X - H * 0.2, w * 0.22, A - H * 0.6, t));
      g.rect(w * 0.18, A - H, w * 0.86, A);
    }],
    epsilon: ["ε", "RR", 392, (g, w) => {
      const { S, H, X, O, ap } = g.p;
      const m = X * 0.5;
      g.sector(w * 0.06, m - H / 2, w * 0.96, X + O, ap * 0.7, 3.0, g.p.cut, "r", S * 0.95, H);
      g.sector(0, -O, w, m + H / 2, 1.0, 4 - ap * 0.9, "r", g.p.cut, S * 0.95, H);
      g.rect(S * 0.45, m - H / 2, w * 0.62, m + H / 2);
    }],
    zeta: ["ζ", "RN", 380, (g, w) => {
      const { S, H, A, X, D, O } = g.p;
      const t = S * 0.92;
      g.rect(w * 0.12, A - H, w, A);
      // The diagonal runs on into the curve's left side, so heavy weights get no gap at the join.
      g.stroke(w * 0.9, A - H * 0.6, S * 0.55, X * 0.42, t);
      g.sector(0, -O, w * 0.92, X * 0.95, 1.4, 3.7, "r", "r");
      g.rect(0, X * 0.3, S * 0.95, X * 0.55);
      g.rect(w * 0.62, D * 0.6, w * 0.62 + S * 0.9, H);
    }],
    eta: ["η", "SS", 410, (g, w) => {
      const { S, X, D } = g.p;
      defs.n[2](g, w);
      g.rect(w - S, D, w, X * 0.3);
    }],
    theta: ["θ", "RR", 430, (g, w) => {
      const { S, H, A, O } = g.p;
      g.ring(0, -O, w, A + O, S, H);
      const m = (A + O - O) / 2;
      g.rect(S * 0.5, m - H / 2, w - S * 0.5, m + H / 2);
    }],
    iota: ["ι", "SN", 220, (g, w) => {
      curl(g, 0, w);
    }],
    kappa: ["κ", "SD", 404, (g, w) => {
      const { S, X } = g.p;
      g.rect(0, 0, S, X);
      const t = S * 0.92;
      const hw = hwOf(t, w - S, X * 0.6);
      g.stroke(w - hw, X, S * 0.6 + hw, X * 0.32, t);
      g.stroke(S + w * 0.18, X * 0.5, w - hw, 0, t);
    }],
    lambda: ["λ", "DD", 452, (g, w) => {
      const { S, A } = g.p;
      const t = S * 0.93;
      const hw = hwOf(t, w, A);
      const x0 = hw * 0.6;
      const x1 = w - hw;
      g.stroke(x0, A, x1, 0, t);
      // The short leg leaves the long one a little below the x-height.
      const ym = g.p.X * 0.78;
      const xm = x0 + (x1 - x0) * (1 - ym / A);
      g.stroke(xm, ym, hwOf(t, xm, ym), 0, t);
    }],
    mu: ["μ", "SS", 410, (g, w) => {
      const { S, X, D } = g.p;
      defs.u[2](g, w);
      g.rect(0, D, S, X * 0.5);
    }],
    nu: ["ν", "DD", 430, (g, w) => {
      const { S, X } = g.p;
      // The point sits left of centre (v's is central), and further left in Clear, so ν, v and
      // υ never share a silhouette.
      const t = S * 0.93;
      vee(g, 0, w, X, 0, t, clear ? 0.2 : 0.3);
    }],
    xi: ["ξ", "RN", 388, (g, w) => {
      const { S, H, A, X, D, O } = g.p;
      const m = X * 0.62;
      g.rect(w * 0.12, A - H, w, A);
      g.sector(w * 0.08, m - H / 2, w * 0.9, A - H * 0.4, 0.9, 3.0, "r", "r", S * 0.92, H);
      g.sector(0, -O, w * 0.95, m + H / 2, 1.0, 3.7, "r", "r", S * 0.95, H);
      g.rect(w * 0.64, D * 0.6, w * 0.64 + S * 0.9, H);
    }],
    omicron: ["ο", ...defs.o],
    pi: ["π", "NN", 520, (g, w) => {
      const { S, H, X } = g.p;
      g.rect(0, X - H, w, X);
      g.rect(w * 0.16, 0, w * 0.16 + S, X);
      g.rect(w * 0.84 - S, 0, w * 0.84, X);
    }],
    rho: ["ρ", "SR", 440, (g, w) => {
      const { S, X, D, O } = g.p;
      g.ring(0, -O, w, X + O);
      g.rect(0, D, S, X * 0.5);
    }],
    sigma: ["σ", "RN", 470, (g, w) => {
      const { H, X, O } = g.p;
      const wb = w * (clear ? 0.78 : 0.86);
      g.ring(0, -O, wb, X + O);
      g.rect(wb * 0.5, X - H, w, X);
    }],
    sigmafinal: ["ς", "RR", 404, (g, w) => {
      const { S, H, X, D, O, ap } = g.p;
      g.sector(0, -O + H * 0.1, w, X + O, ap, 3.25, g.p.cut, "r");
      g.rect(w * 0.48, D * 0.62, w * 0.48 + S * 0.92, H * 1.1);
    }],
    tau: ["τ", "NR", 372, (g, w) => {
      const { H, X } = g.p;
      g.rect(0, X - H, w, X);
      curl(g, w * 0.38, w * 0.6);
    }],
    upsilon: ["υ", "SS", 430, (g, w) => {
      cup(g, 0, w, g.p.X);
    }],
    phi: ["φ", "RR", 580, (g, w) => {
      const { S, H, X, D, A, O } = g.p;
      const cx = w / 2;
      g.ring(0, -O, w, X + O, S, H);
      g.rect(cx - S / 2, D, cx + S / 2, A * 0.92);
    }],
    chi: ["χ", "DD", 460, (g, w) => {
      const { S, X, D } = g.p;
      const t = S * 0.93;
      const hw = hwOf(t, w, X - D);
      g.stroke(hw, X, w - hw, D, t);
      g.stroke(w - hw, X, hw, D, t);
    }],
    psi: ["ψ", "SS", 560, (g, w) => {
      const { S, X, D, A } = g.p;
      cup(g, 0, w, X);
      const cx = w / 2;
      g.rect(cx - S / 2, D, cx + S / 2, A * 0.92);
    }],
    omega: ["ω", "SS", 640, (g, w) => {
      const { S, X, O } = g.p;
      const cx = w / 2;
      const r = w * 0.26;
      g.rect(0, r - O, S, X);
      g.rect(w - S, r - O, w, X);
      g.sector(0, -O, cx + S * 0.5, 2 * r - O, 2, 4);
      g.sector(cx - S * 0.5, -O, w, 2 * r - O, 2, 4);
      g.rect(cx - S / 2, r * 0.9, cx + S / 2, X * 0.62);
    }],
  };

  const small = {};
  for (const [name, [ch, sides, width, draw]] of Object.entries(LOWER)) {
    small[ch] = { sides, width, draw };
    add(name, ch, sides, width, draw);
  }

  /* ---------------------------------------------------------------- tonos and dialytika */

  const centre = (b) => (b.x0 + b.x1) / 2;
  const dialytika = (g, cx, top, spread = 1) => {
    const gap = (g.p.S * 1.25 + 34) * spread;
    g.dot(cx - gap / 2, top + 70 + g.p.S * 0.56);
    g.dot(cx + gap / 2, top + 70 + g.p.S * 0.56);
  };

  /** A capital with the tonos standing off its top-left corner: part of the glyph, so it widens it. */
  const capitalTonos = (ch, tuck = 0) => {
    const { sides, width, draw } = capital[ch];
    return {
      sides: `N${sides[1]}`,
      width,
      draw: (g, w) => {
        // In the mono the letter gives up some width, or the pair would not fit its cell.
        const lw = g.p.mono ? w * 0.62 : w;
        draw(g, lw);
        const { S, C } = g.p;
        const t = S * (g.p.mono ? 0.72 : 0.9);
        // Slanted like the acute, ending level with the cap height, clear of the letter. A
        // letter whose top-left is open (Α) takes it in closer, as hand-set Greek does.
        const x = g.p.mono ? 0 : tuck * lw;
        // The mono has no room beside the letter, so the tonos rises above its top-left corner.
        if (g.p.mono) g.add(bar(x - S * 1.35, C + 10, x - S * 0.45, C + 175, t));
        else g.add(bar(x - S * 2.1, C - 190, x - S * 1.0, C + 4, t));
      },
    };
  };

  const capTonos = { Alphatonos: ["Ά", "Α", 0.26], Epsilontonos: ["Έ", "Ε", 0], Etatonos: ["Ή", "Η", 0], Iotatonos: ["Ί", "Ι", 0], Omicrontonos: ["Ό", "Ο", 0.04], Upsilontonos: ["Ύ", "Υ", 0], Omegatonos: ["Ώ", "Ω", 0.04] };
  for (const [name, [ch, base, tuck]] of Object.entries(capTonos)) {
    const d = capitalTonos(base, tuck);
    add(name, ch, d.sides, d.width, d.draw);
  }

  const capDia = { Iotadieresis: ["Ϊ", "Ι"], Upsilondieresis: ["Ϋ", "Υ"] };
  for (const [name, [ch, base]] of Object.entries(capDia)) {
    const { sides, width, draw } = capital[base];
    add(name, ch, sides, width, draw, (g, b) => dialytika(g, centre(b), g.p.C - 10));
  }

  const lowTonos = { alphatonos: ["ά", "α"], epsilontonos: ["έ", "ε"], etatonos: ["ή", "η"], iotatonos: ["ί", "ι"], omicrontonos: ["ό", "ο"], upsilontonos: ["ύ", "υ"], omegatonos: ["ώ", "ω"] };
  for (const [name, [ch, base]] of Object.entries(lowTonos)) {
    const { sides, width, draw } = small[base];
    // On ι the accent sits over the stem, not over the curl.
    const at = base === "ι" ? (g, b) => b.x0 + g.p.S / 2 : (_g, b) => centre(b);
    add(name, ch, sides, width, draw, (g, b) => accents.acute(g, at(g, b), g.p.X));
  }

  const lowDia = { iotadieresis: ["ϊ", "ι"], upsilondieresis: ["ϋ", "υ"] };
  for (const [name, [ch, base]] of Object.entries(lowDia)) {
    const { sides, width, draw } = small[base];
    const at = base === "ι" ? (g, b) => b.x0 + g.p.S / 2 : (_g, b) => centre(b);
    add(name, ch, sides, width, draw, (g, b) => dialytika(g, at(g, b), g.p.X));
  }

  // Dialytika with tonos: the tonos stands between the two dots.
  const lowBoth = { iotadieresistonos: ["ΐ", "ι"], upsilondieresistonos: ["ΰ", "υ"] };
  for (const [name, [ch, base]] of Object.entries(lowBoth)) {
    const { sides, width, draw } = small[base];
    const at = base === "ι" ? (g, b) => b.x0 + g.p.S / 2 : (_g, b) => centre(b);
    add(name, ch, sides, width, draw, (g, b) => {
      const cx = at(g, b);
      dialytika(g, cx, g.p.X, 1.8);
      const { S } = g.p;
      g.add(bar(cx - S * 0.28, g.p.X + 70, cx + S * 0.42, g.p.X + 250, S * 0.62));
    });
  }

  /* ---------------------------------------------------------------- punctuation */

  // The Greek question mark is a semicolon; the ano teleia a dot at the x-height.
  const [, semiSides, semiDraw] = sym.semicolon;
  add("questiongreek", ";", semiSides, 300, (g) => semiDraw(g));
  add("anoteleia", "·", "SS", 300, (g) => g.dot(g.p.S * 0.56, g.p.X - g.p.S * 0.56));

  return out;
}

/** Kerning pairs this module adds: [left, right, units]. */
export const kerning = [
  ["Τ", "α", -60], ["Τ", "ο", -60], ["Τ", "ε", -56], ["Τ", "ω", -50], ["Τ", "ά", -60], ["Τ", "ό", -60], ["Τ", "έ", -56],
  ["Υ", "α", -56], ["Υ", "ο", -60], ["Υ", "ε", -56], ["Γ", "α", -64], ["Γ", "ο", -64], ["Γ", "ε", -60], ["Γ", "ω", -50],
  ["Γ", ".", -80], ["Γ", ",", -80], ["Τ", ".", -80], ["Τ", ",", -80],
  ["Α", "Τ", -50], ["Τ", "Α", -50], ["Α", "Υ", -50], ["Υ", "Α", -50], ["Λ", "Τ", -40], ["Τ", "Λ", -40], ["Λ", "Υ", -44], ["Υ", "Λ", -44],
  ["Α", "Ψ", -20], ["Ά", "Τ", -50], ["Ά", "Υ", -50], ["Δ", "Τ", -36], ["Γ", "Α", -50], ["Γ", "Λ", -50], ["Γ", "Δ", -46],
  ["Ρ", "Α", -40], ["Ρ", ".", -80], ["Ρ", ",", -80], ["λ", "τ", -10], ["τ", "α", -10],
];
