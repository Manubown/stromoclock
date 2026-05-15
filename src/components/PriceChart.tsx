"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HourlyPrice } from "@/lib/entsoe/parse";

type Datum = {
  hour: string;
  eurPerKwh: number;
  centsPerKwh: number;
  inCheap: boolean;
  inExpensive: boolean;
  isMin: boolean;
  isMax: boolean;
};

const ACCENT = "#7ee787";
const DANGER = "#ff7b72";
const NEUTRAL = "#3a4754";
const NEUTRAL_HOVER = "#4f5d6c";
const MUTED = "#8a94a0";
const INK = "#e6eaef";
const BG = "#0b0d10";

const INSIDE_LABEL_MIN_BAR_HEIGHT = 56;
const INSIDE_LABEL_MIN_BAR_WIDTH = 16;

type Range = [number, number]; // [startIdx, endIdx] inclusive

export function PriceChart({
  prices,
  cheapRange,
  expensiveRange,
}: {
  prices: HourlyPrice[];
  cheapRange?: Range | null;
  expensiveRange?: Range | null;
}) {
  const minMwh = Math.min(...prices.map((p) => p.eurPerMWh));
  const maxMwh = Math.max(...prices.map((p) => p.eurPerMWh));

  const inRange = (i: number, r?: Range | null) => !!r && i >= r[0] && i <= r[1];

  const data: Datum[] = prices.map((p, i) => {
    const d = new Date(p.start);
    const hour = d.toLocaleTimeString("en-GB", { hour: "2-digit", timeZone: "Europe/Berlin" });
    const eurPerKwh = p.eurPerMWh / 1000;
    return {
      hour,
      eurPerKwh: Number(eurPerKwh.toFixed(4)),
      centsPerKwh: Number((eurPerKwh * 100).toFixed(1)),
      inCheap: inRange(i, cheapRange),
      inExpensive: inRange(i, expensiveRange),
      isMin: p.eurPerMWh === minMwh,
      isMax: p.eurPerMWh === maxMwh,
    };
  });

  const yMin = Math.min(0, ...data.map((d) => d.centsPerKwh));
  const yMax = Math.max(0, ...data.map((d) => d.centsPerKwh));
  const yPad = Math.max(1.5, (yMax - yMin) * 0.14);

  const { ref, width } = useContainerWidth<HTMLDivElement>();
  // X-axis: with narrow screens, skip labels so they don't overlap.
  // Recharts `interval` = number of ticks to skip between rendered ones.
  const tickInterval = width < 380 ? 5 : width < 520 ? 3 : width < 720 ? 1 : 0;
  const chartHeight = width < 480 ? 320 : 384;

  const renderBarLabel = (props: unknown) => {
    const p = props as {
      x?: number | string;
      y?: number | string;
      width?: number | string;
      height?: number | string;
      value?: number;
      index?: number;
    };
    if (
      typeof p.x !== "number" ||
      typeof p.y !== "number" ||
      typeof p.width !== "number" ||
      typeof p.height !== "number" ||
      typeof p.index !== "number"
    ) {
      return null;
    }
    const datum = data[p.index];
    if (!datum) return null;

    const priceText = datum.eurPerKwh.toFixed(2);
    const renderInside =
      p.height >= INSIDE_LABEL_MIN_BAR_HEIGHT && p.width >= INSIDE_LABEL_MIN_BAR_WIDTH;

    if (renderInside) {
      const highlight = datum.inCheap || datum.inExpensive;
      const textColor = highlight ? BG : INK;
      const symbolOpacity = highlight ? 0.75 : 0.65;
      const cx = p.x + p.width / 2;
      const cy = p.y + 12;
      const priceFontSize = Math.min(
        18,
        Math.max(12, Math.floor(Math.min(p.height * 0.18, p.width * 0.85))),
      );
      const symbolFontSize = Math.round(priceFontSize * 0.7);

      return (
        <g transform={`rotate(90, ${cx}, ${cy})`}>
          <text
            x={cx}
            y={cy}
            textAnchor="start"
            dominantBaseline="middle"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontSize={priceFontSize}
            fontWeight={700}
            fill={textColor}
            letterSpacing="-0.01em"
          >
            <tspan fontSize={symbolFontSize} fontWeight={500} opacity={symbolOpacity}>
              €
            </tspan>
            <tspan dx={4}>{priceText}</tspan>
          </text>
        </g>
      );
    }

    // Narrow or short bar: label above, in bar's color, smaller font.
    const fill = datum.inCheap ? ACCENT : datum.inExpensive ? DANGER : INK;
    const fontSize = p.width < 12 ? 8 : 10;
    return (
      <text
        x={p.x + p.width / 2}
        y={p.y - 5}
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize={fontSize}
        fontWeight={datum.inCheap || datum.inExpensive ? 600 : 500}
        fill={fill}
      >
        <tspan fontSize={Math.max(7, fontSize - 2)} opacity={0.7}>
          €
        </tspan>
        <tspan dx={1.5}>{priceText}</tspan>
      </text>
    );
  };

  return (
    <div
      ref={ref}
      className="w-full rounded-lg border border-line bg-panel p-3 sm:p-4"
      style={{ height: chartHeight }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 26, right: 4, bottom: 4, left: -12 }}>
          <CartesianGrid stroke="#1f262d" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fill: MUTED, fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#1f262d" }}
            interval={tickInterval}
            tickMargin={6}
            minTickGap={2}
          />
          <YAxis
            tick={{ fill: MUTED, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            domain={[yMin - yPad, yMax + yPad]}
            tickFormatter={(v: number) => `${v.toFixed(0)}¢`}
            width={38}
          />
          <Tooltip
            cursor={{ fill: "#1f262d" }}
            contentStyle={{
              background: BG,
              border: "1px solid #1f262d",
              borderRadius: 8,
              padding: "8px 12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
            wrapperStyle={{ outline: "none" }}
            labelStyle={{ color: MUTED, fontSize: 11, marginBottom: 4, fontWeight: 500 }}
            itemStyle={{ color: INK, fontSize: 13, padding: 0 }}
            labelFormatter={(label: string) => `${label}:00`}
            formatter={(_v: number, _n, item) => {
              const d = item.payload as Datum;
              return [
                `${d.eurPerKwh.toFixed(4)} €/kWh · ${d.centsPerKwh.toFixed(1)} ¢/kWh`,
                "Price",
              ];
            }}
          />
          <Bar
            dataKey="centsPerKwh"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
            activeBar={{ fill: NEUTRAL_HOVER }}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.inCheap ? ACCENT : d.inExpensive ? DANGER : NEUTRAL} />
            ))}
            <LabelList dataKey="centsPerKwh" content={renderBarLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}
