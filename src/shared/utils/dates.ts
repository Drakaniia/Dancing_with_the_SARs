export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function interpolateDates(dates: string[], progress: number): string {
  const index = Math.min(
    Math.floor(progress * (dates.length - 1)),
    dates.length - 1,
  );
  return dates[index];
}
