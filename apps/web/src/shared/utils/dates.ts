export function formatDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function interpolateDates(dates: string[], progress: number): string {
  if (dates.length === 0) return "";
  const index = Math.min(
    Math.floor(progress * (dates.length - 1)),
    dates.length - 1,
  );
  return dates[index];
}

/** Whether a period string represents the 12-month El Nino scenario projection (Nov 2026 - Oct 2027). */
export function isForecastPeriod(period: string): boolean {
  const primary = periodPrimary(period);
  return primary >= "2026-11" && primary <= "2027-12";
}

/** Whether a timeline step is a real date (month, day or quarter), not a picture label like "3 → 10 Jun". */
export function isDatedPeriod(period: string): boolean {
  return /^\d{4}-(\d{2}|Q[1-4])/i.test(period);
}

const QUARTER_START: Record<string, string> = {
  "1": "01",
  "2": "04",
  "3": "07",
  "4": "10",
};

/**
 * The part of a period used to compare it with a date: the text before " (vs ", with a quarter
 * ("2026-Q3") turned into its first month ("2026-07") so quarters sort among months and days.
 */
export function periodPrimary(period: string): string {
  const primary = period.split(" (vs ")[0];
  const quarter = /^(\d{4})-Q([1-4])$/i.exec(primary);
  return quarter ? `${quarter[1]}-${QUARTER_START[quarter[2]]}` : primary;
}

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function monthName(month: string, style: "long" | "short"): string {
  const name = MONTHS_LONG[Number(month) - 1] ?? month;
  return style === "long" ? name : name.slice(0, 3);
}

function formatOne(part: string, style: "long" | "short"): string {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(part);
  if (day) {
    return `${Number(day[3])} ${monthName(day[2], style)} ${day[1]}`;
  }
  const month = /^(\d{4})-(\d{2})$/.exec(part);
  if (month) return `${monthName(month[2], style)} ${month[1]}`;
  const quarter = /^(\d{4})-Q([1-4])$/i.exec(part);
  if (quarter) {
    const first = Number(QUARTER_START[quarter[2]]);
    const from = monthName(String(first), "short");
    const to = monthName(String(first + 2), "short");
    return `${from}–${to} ${quarter[1]}`;
  }
  // "2026-06_09" (current key) or "2026-06..09" (older manifests). Keys avoid ".." because the
  // Cloudflare R2 API rejects object paths containing it (403).
  const span = /^(\d{4})-(\d{2})(?:_|\.\.)(\d{2})$/.exec(part);
  if (span) {
    return `${monthName(span[2], "short")}–${monthName(span[3], "short")} ${span[1]}`;
  }
  return part;
}

/**
 * A period written for people: "2026-07" → "July 2026", "2026-06-28" → "28 June 2026",
 * "2026-Q3" → "Jul–Sep 2026", "2026-10 (vs 2025-10)" → "October 2026 vs October 2025".
 * `short` uses three-letter months and drops the "vs" part (timeline ticks). Anything else
 * ("static", "post-quake 2026") is returned unchanged.
 */
export function formatPeriod(
  period: string | null | undefined,
  style: "long" | "short" = "long",
): string {
  if (!period) return "";
  const [primary, versus] = period.split(" (vs ");
  const main = formatOne(primary, style);
  if (style === "short" || !versus) return main;
  return `${main} vs ${formatOne(versus.replace(/\)$/, ""), style)}`;
}

/** Sort key matching `scripts/tiles/manifest_schema.py:period_sort_key`. */
export function periodSortKey(period: string): string {
  const primary = period.split(" (vs ")[0];
  return `${primary}__${period}`;
}

export interface PeriodResolution {
  requested: string;
  resolved: string | null;
  exact: boolean;
  isForecast: boolean;
}

/**
 * Resolves the best available period for a layer given the global `currentDate` (spec §7, D7).
 * Snaps to the nearest period at or before the selection, falling back to the nearest after it.
 */
export function resolvePeriod(
  periods: string[] | undefined,
  currentDate: string | null,
): PeriodResolution {
  const req = currentDate ?? "";
  if (!periods || periods.length === 0) {
    return { requested: req, resolved: null, exact: false, isForecast: false };
  }
  if (periods.length === 1 && periods[0] === "static") {
    return {
      requested: req,
      resolved: "static",
      exact: true,
      isForecast: false,
    };
  }
  if (req && periods.includes(req)) {
    return {
      requested: req,
      resolved: req,
      exact: true,
      isForecast: isForecastPeriod(req),
    };
  }

  const reqPrimary = periodPrimary(req);
  // Compare by value, not list position: quarters compare as their first month, so a list that
  // mixes months and quarters is not in comparison order.
  let bestBefore: string | null = null;
  let bestBeforeKey = "";
  let bestAfter: string | null = null;
  let bestAfterKey = "";

  for (const p of periods) {
    const pPrimary = periodPrimary(p);
    if (pPrimary <= reqPrimary) {
      if (bestBefore === null || pPrimary >= bestBeforeKey) {
        bestBefore = p;
        bestBeforeKey = pPrimary;
      }
    } else if (bestAfter === null || pPrimary < bestAfterKey) {
      bestAfter = p;
      bestAfterKey = pPrimary;
    }
  }

  const chosen = bestBefore ?? bestAfter ?? periods[periods.length - 1];
  return {
    requested: req,
    resolved: chosen,
    exact: chosen === req,
    isForecast: isForecastPeriod(chosen),
  };
}
