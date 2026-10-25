import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { barPath } from "../src/react/charts/BarChart";
import { AreaChart, arcPath, BarChart, DonutChart, Heatmap, heatStep, LineChart, niceTicks, seriesColor } from "../src/react/charts/index";
import { bandScale, formatCompact, linearScale } from "../src/react/charts/scale";
import {
  addMonths,
  Calendar,
  DatePicker,
  DateRangePicker,
  defaultRangePresets,
  endOfDay,
  isDateDisabled,
  monthMatrix,
  normalizeRange,
  rangePosition,
  setTime,
  startOfDay,
  startOfWeek,
  weekdayLabels,
} from "../src/react/DatePicker";

const noop = () => {};

describe("niceTicks", () => {
  it("picks round steps and widens the domain to whole steps", () => {
    expect(niceTicks(0, 97)).toEqual({ ticks: [0, 20, 40, 60, 80, 100], min: 0, max: 100, step: 20 });
    expect(niceTicks(3, 47, 4)).toMatchObject({ min: 0, max: 50, step: 10 });
  });

  it("uses 1, 2 and 5 times powers of ten", () => {
    for (const [lo, hi] of [
      [0, 1],
      [0, 13],
      [0, 0.37],
      [-40, 120],
      [1000, 98000],
    ] as const) {
      const { step } = niceTicks(lo, hi);
      const mant = step / 10 ** Math.floor(Math.log10(step));
      expect([1, 2, 5]).toContain(Number(mant.toFixed(6)));
    }
  });

  it("covers negative ranges and includes zero when it is in range", () => {
    const t = niceTicks(-37, 82);
    expect(t.min).toBeLessThanOrEqual(-37);
    expect(t.max).toBeGreaterThanOrEqual(82);
    expect(t.ticks).toContain(0);
  });

  it("has no floating-point noise in tick labels", () => {
    for (const v of niceTicks(0, 0.7).ticks) expect(String(v).length).toBeLessThan(6);
  });

  it("handles a flat series, reversed bounds and non-finite input", () => {
    expect(niceTicks(5, 5)).toMatchObject({ min: 0 });
    expect(niceTicks(5, 5).max).toBeGreaterThanOrEqual(5);
    expect(niceTicks(0, 0)).toMatchObject({ min: 0, max: 1 });
    expect(niceTicks(-4, -4).max).toBe(0);
    expect(niceTicks(100, 0)).toEqual(niceTicks(0, 100));
    expect(niceTicks(Number.NaN, 4)).toMatchObject({ min: 0, max: 1 });
  });
});

describe("scales and helpers", () => {
  it("linear and band scales map onto pixels", () => {
    const s = linearScale([0, 100], [200, 0]);
    expect(s(0)).toBe(200);
    expect(s(50)).toBe(100);
    const b = bandScale(4, [0, 400], 0.25);
    expect(b.step).toBe(100);
    expect(b.width).toBe(75);
    expect(b.start(1)).toBe(112.5);
  });

  it("formats compactly", () => {
    expect(formatCompact(12480, "en-US")).toBe("12.5K");
    expect(formatCompact(950, "en-US")).toBe("950");
  });

  it("assigns series colours by position, never cycling past slot 8 silently", () => {
    expect(seriesColor(undefined, 0)).toBe("var(--oq-series-1)");
    expect(seriesColor(undefined, 7)).toBe("var(--oq-series-8)");
    expect(seriesColor(3, 0)).toBe("var(--oq-series-3)");
    expect(seriesColor("danger", 0)).toBe("var(--oq-danger)");
    expect(seriesColor("#123456", 0)).toBe("#123456");
  });

  it("rounds a bar only at its data end", () => {
    const up = barPath(true, 10, 20, 100, 40);
    expect(up.startsWith("M10,100")).toBe(true);
    expect(up).toContain("Q10,40");
    const down = barPath(true, 10, 20, 100, 160);
    expect(down).toContain("Q10,160");
    expect(barPath(false, 5, 10, 0, 50)).toContain("Q50,5");
  });

  it("draws donut arcs, including a full ring", () => {
    expect(arcPath(50, 50, 50, 30, 0, Math.PI)).toMatch(/^M50\.00,0\.00 A50,50 0 0 1/);
    expect(arcPath(50, 50, 50, 30, 0, Math.PI * 2)).toContain(" 1 1 ");
  });

  it("puts heatmap values into steps", () => {
    expect(heatStep(0, 0, 100, 5)).toBe(0);
    expect(heatStep(100, 0, 100, 5)).toBe(4);
    expect(heatStep(50, 0, 100, 5)).toBe(2);
    expect(heatStep(7, 7, 7, 5)).toBe(4);
  });
});

const rows = [
  { day: "Mon", allowed: 120, blocked: 14 },
  { day: "Tue", allowed: 98, blocked: 22 },
  { day: "Wed", allowed: 143, blocked: 9 },
];
const series = [
  { key: "allowed", label: "Allowed" },
  { key: "blocked", label: "Blocked" },
];

describe("chart components render", () => {
  it("BarChart — grouped, stacked, horizontal", () => {
    for (const props of [{}, { stacked: true }, { orientation: "horizontal" as const }]) {
      const html = renderToStaticMarkup(<BarChart data={rows} x="day" series={series} label="Requests per day" {...props} />);
      expect(html).toContain('class="oq-chart oq-chart--bar"');
      expect(html).toContain('role="img"');
      expect(html).toContain('aria-label="Requests per day"');
      expect(html.match(/class="oq-chart__bar"/g)?.length).toBe(6);
      expect(html).toContain("oq-chart__legend");
      expect(html).toContain("var(--oq-series-2)");
      // The data table is always there for screen readers.
      expect(html).toContain('<table class="oq-table oq-table--dense oq-sr-only">');
    }
  });

  it("LineChart and AreaChart", () => {
    const line = renderToStaticMarkup(<LineChart data={rows} x="day" series={series} label="Trend" table="toggle" />);
    expect(line).toContain("oq-chart--line");
    expect(line.match(/class="oq-chart__line"/g)?.length).toBe(2);
    expect(line).toContain("View as table");
    expect(line).toContain('tabindex="0"');
    const area = renderToStaticMarkup(<AreaChart data={rows} x="day" series={series} label="Stack" stacked />);
    expect(area).toContain("oq-chart__area oq-chart__area--stacked");
  });

  it("a single series has no legend", () => {
    const html = renderToStaticMarkup(<LineChart data={rows} x="day" series={[{ key: "allowed", label: "Allowed" }]} label="One" />);
    expect(html).not.toContain("oq-chart__legend");
  });

  it("DonutChart shows the total and shares", () => {
    const html = renderToStaticMarkup(
      <DonutChart
        label="Status codes"
        centerLabel="requests"
        data={[
          { key: "2xx", label: "2xx", value: 75 },
          { key: "4xx", label: "4xx", value: 20 },
          { key: "5xx", label: "5xx", value: 5 },
        ]}
      />,
    );
    expect(html).toContain("oq-donut__slice");
    expect(html).toContain(">100<");
    expect(html).toContain("75 %");
    expect(html).toContain("5.0 %");
  });

  it("Heatmap renders a cell per value and an empty cell for missing data", () => {
    const html = renderToStaticMarkup(
      <Heatmap
        label="Requests by hour"
        rows={["Mon", "Tue"]}
        columns={["00", "01", "02"]}
        values={[
          [1, 5, 9],
          [2, null, 7],
        ]}
      />,
    );
    expect(html.match(/class="oq-heatmap__cell"/g)?.length).toBe(6);
    expect(html).toContain('data-empty="true"');
    expect(html).toContain("color-mix(in srgb, var(--oq-primary)");
  });

  it("every chart shows an empty state without data", () => {
    expect(renderToStaticMarkup(<BarChart data={[]} x="day" series={series} label="x" emptyText="Nothing yet" />)).toContain("Nothing yet");
    expect(renderToStaticMarkup(<LineChart data={[]} x="day" series={series} label="x" />)).toContain("oq-chart__empty");
    expect(renderToStaticMarkup(<DonutChart data={[]} label="x" />)).toContain("oq-chart__empty");
    expect(renderToStaticMarkup(<Heatmap rows={[]} columns={[]} values={[]} label="x" />)).toContain("oq-chart__empty");
  });
});

describe("date helpers", () => {
  it("builds a 6×7 month grid starting on Monday by default", () => {
    const m = monthMatrix(2026, 9); // October 2026 starts on a Thursday
    expect(m).toHaveLength(6);
    expect(m.every((w) => w.length === 7)).toBe(true);
    expect(m[0]?.[0]?.getDay()).toBe(1);
    expect(m[0]?.[0]?.getDate()).toBe(28); // Mon 28 Sep
    expect(m[0]?.[3]?.getDate()).toBe(1);
    const sunday = monthMatrix(2026, 9, 0);
    expect(sunday[0]?.[0]?.getDay()).toBe(0);
  });

  it("adds months clamping to the last day", () => {
    expect(addMonths(new Date(2026, 0, 31), 1).getDate()).toBe(28);
    expect(addMonths(new Date(2024, 0, 31), 1).getDate()).toBe(29);
    expect(addMonths(new Date(2026, 11, 15), 1).getFullYear()).toBe(2027);
  });

  it("finds the start of a week", () => {
    expect(startOfWeek(new Date(2026, 9, 25), 1).getDate()).toBe(19); // Sunday 25 → Monday 19
    expect(startOfWeek(new Date(2026, 9, 25), 0).getDate()).toBe(25);
  });

  it("orders ranges and places days in them", () => {
    const a = new Date(2026, 9, 10);
    const b = new Date(2026, 9, 3);
    expect(normalizeRange(a, b).from).toBe(b);
    expect(rangePosition(new Date(2026, 9, 3), a, b)).toBe("start");
    expect(rangePosition(new Date(2026, 9, 5), a, b)).toBe("middle");
    expect(rangePosition(new Date(2026, 9, 10), a, b)).toBe("end");
    expect(rangePosition(new Date(2026, 9, 11), a, b)).toBeNull();
    expect(rangePosition(a, a, a)).toBe("single");
    expect(rangePosition(a, a, null)).toBe("single");
  });

  it("respects min, max and a disabled predicate", () => {
    const limits = { min: new Date(2026, 9, 5), max: new Date(2026, 9, 20), isDisabled: (d: Date) => d.getDay() === 0 };
    expect(isDateDisabled(new Date(2026, 9, 4), limits)).toBe(true);
    expect(isDateDisabled(new Date(2026, 9, 5, 18), limits)).toBe(false);
    expect(isDateDisabled(new Date(2026, 9, 21), limits)).toBe(true);
    expect(isDateDisabled(new Date(2026, 9, 11), limits)).toBe(true); // a Sunday
  });

  it("presets produce ordered ranges ending now or today", () => {
    const now = new Date(2026, 9, 25, 14, 30);
    for (const p of defaultRangePresets) {
      const r = p.range(now);
      expect(r.from.getTime()).toBeLessThan(r.to.getTime());
      expect(r.to.getTime()).toBeGreaterThanOrEqual(now.getTime());
    }
    const week = defaultRangePresets.find((p) => p.key === "7d")?.range(now);
    expect(week?.from).toEqual(startOfDay(new Date(2026, 9, 19)));
    expect(week?.to).toEqual(endOfDay(now));
  });

  it("weekday labels follow the week start", () => {
    expect(weekdayLabels("en-US", 1)[0]).toBe("Mon");
    expect(weekdayLabels("en-US", 0)[0]).toBe("Sun");
  });

  it("sets a time of day", () => {
    const d = setTime(new Date(2026, 9, 25), "07:45");
    expect([d.getHours(), d.getMinutes()]).toEqual([7, 45]);
  });
});

describe("date picker components render", () => {
  it("Calendar marks today, selection and disabled days", () => {
    const today = new Date();
    const html = renderToStaticMarkup(
      <Calendar month={today} onMonthChange={noop} selected={today} onSelect={noop} isDisabled={(d) => d.getDate() === 15} locale="en-US" />,
    );
    expect(html).toContain('role="grid"');
    expect(html).toContain('aria-current="date"');
    expect(html).toContain('data-selected="true"');
    expect(html).toContain("disabled");
    expect(html.match(/class="oq-calendar__weekday"/g)?.length).toBe(7);
  });

  it("Calendar shows two months and a range", () => {
    const html = renderToStaticMarkup(
      <Calendar
        month={new Date(2026, 9, 1)}
        onMonthChange={noop}
        range={{ from: new Date(2026, 9, 28), to: new Date(2026, 10, 3) }}
        onSelect={noop}
        months={2}
        locale="en-US"
      />,
    );
    expect(html).toContain("oq-calendar--double");
    expect(html).toContain("October 2026");
    expect(html).toContain("November 2026");
    expect(html).toContain('data-range="start"');
    expect(html).toContain('data-range="middle"');
    expect(html).toContain('data-range="end"');
  });

  it("DatePicker and DateRangePicker render a closed trigger", () => {
    const one = renderToStaticMarkup(<DatePicker value={new Date(2026, 9, 25)} onChange={noop} locale="en-US" aria-label="Day" />);
    expect(one).toContain("oq-datepicker__trigger");
    expect(one).toContain('aria-expanded="false"');
    expect(one).toContain("Oct 25, 2026");
    const range = renderToStaticMarkup(<DateRangePicker value={null} onChange={noop} placeholder="Any time" />);
    expect(range).toContain("oq-rangepicker");
    expect(range).toContain("Any time");
  });
});
