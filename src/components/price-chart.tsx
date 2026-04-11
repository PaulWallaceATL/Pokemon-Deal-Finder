"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MockPriceHistory } from "@/lib/mock-data";

interface PriceChartProps {
  data: MockPriceHistory[];
}

function formatCentsAxis(value: number): string {
  return `$${(value / 100).toFixed(0)}`;
}

function formatCentsTooltip(value: number): string {
  return `$${(value / 100).toFixed(2)}`;
}

export function PriceChart({ data }: PriceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
        />
        <YAxis
          tickFormatter={formatCentsAxis}
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
        />
        <Tooltip
          formatter={(value, name) => [
            formatCentsTooltip(Number(value)),
            String(name),
          ]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid hsl(var(--border))",
            backgroundColor: "hsl(var(--popover))",
            color: "hsl(var(--popover-foreground))",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="tcgplayer"
          name="TCGPlayer"
          stroke="hsl(210, 80%, 55%)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="pricechartingRaw"
          name="PriceCharting"
          stroke="hsl(150, 60%, 45%)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="ebaySoldAvg"
          name="eBay Sold Avg"
          stroke="hsl(35, 90%, 55%)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
