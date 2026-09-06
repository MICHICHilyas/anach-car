"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";

/**
 * Graphiques du tableau de bord.
 *
 * Deux mesures d'échelles différentes (dirhams et nombre de réservations) :
 * elles sont volontairement présentées dans DEUX graphiques distincts. Un axe
 * secondaire superposé donnerait une fausse impression de corrélation.
 */

type Point = { month: string; revenue: number; reservations: number };

const TEAL = "#17a29c";
const BLUE = "#1d6fa5";
const GRID = "#e2edf1";
const AXIS = "#6d9db1";

/**
 * `showRevenue` suit le rôle : seul le gérant voit le chiffre d'affaires.
 * La courbe des réservations, elle, reste visible de tous — elle sert à
 * anticiper l'activité, pas à connaître les recettes.
 */
export function DashboardCharts({
  data,
  showRevenue = true,
}: {
  data: Point[];
  showRevenue?: boolean;
}) {
  return (
    <div className={`grid gap-5 ${showRevenue ? "xl:grid-cols-2" : ""}`}>
      {showRevenue ? (
      <ChartCard
        title="Chiffre d'affaires encaissé"
        subtitle="6 derniers mois · dirhams"
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: AXIS, fontSize: 12 }}
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: AXIS, fontSize: 12 }}
              width={56}
              tickFormatter={(value: number) =>
                value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
              }
            />
            <Tooltip
              cursor={{ fill: "rgba(23,162,156,.07)" }}
              content={<RevenueTooltip />}
            />
            <Bar
              dataKey="revenue"
              fill={TEAL}
              radius={[4, 4, 0, 0]}
              maxBarSize={34}
              name="Encaissé"
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      ) : null}

      <ChartCard title="Réservations reçues" subtitle="6 derniers mois · demandes">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: AXIS, fontSize: 12 }}
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: AXIS, fontSize: 12 }}
              width={56}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: GRID, strokeWidth: 2 }}
              content={<CountTooltip />}
            />
            <Line
              type="monotone"
              dataKey="reservations"
              stroke={BLUE}
              strokeWidth={2}
              dot={{ r: 4, fill: BLUE, strokeWidth: 2, stroke: "#ffffff" }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "#ffffff" }}
              name="Réservations"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-navy-100 bg-white p-5 shadow-[var(--shadow-soft)]">
      <h2 className="text-[14.5px] font-semibold text-navy-900">{title}</h2>
      <p className="mt-0.5 text-[12px] text-navy-400">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TooltipShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-navy-100 bg-white px-3 py-2 shadow-[var(--shadow-lift)]">
      <p className="text-[11.5px] font-medium uppercase tracking-wide text-navy-400">
        {label}
      </p>
      <p className="mt-1 text-[13.5px] font-semibold text-navy-900">{children}</p>
    </div>
  );
}

type TooltipProps = {
  active?: boolean;
  payload?: { value: number; payload: Point }[];
  label?: string;
};

function RevenueTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <TooltipShell label={label ?? ""}>
      {formatMoney(Math.round(payload[0].value * 100))}
    </TooltipShell>
  );
}

function CountTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <TooltipShell label={label ?? ""}>
      {value} réservation{value > 1 ? "s" : ""}
    </TooltipShell>
  );
}
