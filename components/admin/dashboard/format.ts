export function formatCurrency(n: number, opts?: { compact?: boolean }): string {
  if (opts?.compact && Math.abs(n) >= 10000) {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function formatNumber(n: number, opts?: { compact?: boolean }): string {
  return new Intl.NumberFormat("en-CA", {
    notation: opts?.compact ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function formatDelta(deltaPct: number | null): {
  label: string;
  tone: "up" | "down" | "flat" | "new";
} {
  if (deltaPct === null) return { label: "new", tone: "new" };
  if (Math.abs(deltaPct) < 0.05) return { label: "0%", tone: "flat" };
  const sign = deltaPct > 0 ? "+" : "";
  return {
    label: `${sign}${deltaPct.toFixed(1)}%`,
    tone: deltaPct > 0 ? "up" : "down",
  };
}
