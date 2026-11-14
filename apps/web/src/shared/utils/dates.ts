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
  const primary = period.split(" (vs ")[0];
  return primary >= "2026-11" && primary <= "2027-12";
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

  const reqPrimary = req.split(" (vs ")[0];
  let bestBefore: string | null = null;
  let bestAfter: string | null = null;

  for (const p of periods) {
    const pPrimary = p.split(" (vs ")[0];
    if (pPrimary <= reqPrimary) {
      bestBefore = p;
    } else if (bestAfter === null) {
      bestAfter = p;
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
