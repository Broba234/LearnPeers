"use client";
import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { formatCurrency, formatNumber } from "./format";

export const PALETTE = {
  brand: "#6366f1",
  emerald: "#10b981",
  amber: "#f59e0b",
  sky: "#0ea5e9",
  rose: "#f43f5e",
  violet: "#8b5cf6",
  slate: "#94a3b8",
};

/**
 * Value formatting is passed as a serializable enum rather than a function,
 * because these are Client Components rendered from Server Components — and
 * functions can't cross the RSC → client boundary.
 */
export type ValueFormat = "number" | "numberCompact" | "currency" | "currencyCompact";

function resolveFormat(format?: ValueFormat): (n: number) => string {
  switch (format) {
    case "currency":
      return (n) => formatCurrency(n);
    case "currencyCompact":
      return (n) => formatCurrency(n, { compact: true });
    case "numberCompact":
      return (n) => formatNumber(n, { compact: true });
    case "number":
    default:
      return (n) => formatNumber(n);
  }
}

const axisStyle = { fontSize: 11, fill: "#94a3b8" } as const;

function fmtAxisDate(d: string): string {
  // d is YYYY-MM-DD
  const [, m, day] = d.split("-");
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1];
  return `${month} ${Number(day)}`;
}

interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

interface TrendChartProps {
  data: Record<string, number | string>[];
  series: SeriesDef[];
  /** Serializable value format for the Y axis / tooltip. */
  format?: ValueFormat;
  height?: number;
  stacked?: boolean;
}

export function TrendChart({ data, series, format, height = 260, stacked }: TrendChartProps) {
  const fmt = resolveFormat(format);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient id={`grad-${s.key}`} key={s.key} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmtAxisDate} tick={axisStyle} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => fmt(v)} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          labelFormatter={(l) => fmtAxisDate(String(l))}
          formatter={(value: number, name: string) => [fmt(value), name]}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#grad-${s.key})`}
            stackId={stacked ? "1" : undefined}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface BarChartProps {
  data: Record<string, number | string>[];
  xKey: string;
  bars: SeriesDef[];
  format?: ValueFormat;
  height?: number;
  horizontal?: boolean;
}

export function SimpleBarChart({ data, xKey, bars, format, height = 260, horizontal }: BarChartProps) {
  const fmt = resolveFormat(format);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 8, right: 8, left: horizontal ? 8 : 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={!horizontal} horizontal={horizontal ? false : true} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v)} />
            <YAxis type="category" dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={false} width={120} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => fmt(v)} />
          </>
        )}
        <Tooltip
          cursor={{ fill: "#94a3b811" }}
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          formatter={(value: number, name: string) => [fmt(value), name]}
        />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {bars.map((b) => (
          <Bar key={b.key} dataKey={b.key} name={b.label} fill={b.color} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface DistBarProps {
  data: { label: string; count: number; color?: string }[];
  height?: number;
}

/** A simple categorical bar chart where each bar can have its own colour. */
export function CategoryBarChart({ data, height = 220 }: DistBarProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
        <Tooltip cursor={{ fill: "#94a3b811" }} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? PALETTE.brand} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
