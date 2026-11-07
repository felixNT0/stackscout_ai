"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type Insights = {
  sample_size: number; period_days: number; disclaimer: string;
  top_skills: { skill: string; count: number }[];
  top_titles: { title: string; count: number }[];
  remote_vs_on_site: [string, number][];
  employment_types: [string, number][];
  experience_levels: [string, number][];
  top_countries: [string, number][];
  top_companies: { company: string; count: number }[];
  avg_salary_min: number | null; salary_currency: string;
  jobs_per_day: [string, number][];
};

const PALETTE = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

async function apiFetch(url: string) {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

const toPairs = (arr: [string, number][]) => arr.map(([name, value]) => ({ name, value }));
const toNamed = (arr: { skill?: string; title?: string; company?: string; count: number }[]) =>
  arr.map((x) => ({ name: x.skill ?? x.title ?? x.company ?? "", value: x.count }));

function ChartCard({ title, children, fallback }: { title: string; children: React.ReactNode; fallback: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="h-64">{children}</div>
        <details className="mt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer">Text summary</summary>
          <p className="text-xs text-muted-foreground mt-1">{fallback}</p>
        </details>
      </CardContent>
    </Card>
  );
}

export default function InsightsPage() {
  const [days, setDays] = useState("90");
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (d: string) => {
    setLoading(true); setError(null);
    try {
      const body = await apiFetch(`/api/insights?days=${d}`);
      setData(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load insights");
      setData(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Career Insights</h1>
          <p className="text-muted-foreground text-sm">Trends computed from jobs discovered in your account.</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="180">Last 180 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
          <div className="grid md:grid-cols-2 gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72" />)}</div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && data && (
        <>
          <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">{data.disclaimer}</div>

          {data.sample_size === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <p className="font-medium text-foreground">Not enough data yet</p>
              <p className="text-sm mt-1">Run a job discovery first — insights appear once jobs are in your database.</p>
            </CardContent></Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card><CardHeader className="pb-1"><CardDescription>Jobs analyzed</CardDescription></CardHeader><CardContent><div className="text-2xl font-bold">{data.sample_size.toLocaleString()}</div><p className="text-xs text-muted-foreground">over {data.period_days} days</p></CardContent></Card>
                <Card><CardHeader className="pb-1"><CardDescription>Avg. min salary</CardDescription></CardHeader><CardContent><div className="text-2xl font-bold">{data.avg_salary_min != null ? `${data.salary_currency} ${data.avg_salary_min.toLocaleString()}` : "—"}</div><p className="text-xs text-muted-foreground">of jobs listing a salary</p></CardContent></Card>
                <Card><CardHeader className="pb-1"><CardDescription>Period</CardDescription></CardHeader><CardContent><div className="text-2xl font-bold">{data.period_days} days</div><p className="text-xs text-muted-foreground">analysis window</p></CardContent></Card>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title="Top skills" fallback={data.top_skills.slice(0, 10).map((s) => `${s.skill} (${s.count})`).join(", ") || "No skill data."}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={toNamed(data.top_skills).slice(0, 12)} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} fontSize={12} />
                      <YAxis type="category" dataKey="name" width={110} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} name="Jobs" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Top job titles" fallback={data.top_titles.slice(0, 10).map((t) => `${t.title} (${t.count})`).join(", ") || "No title data."}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={toNamed(data.top_titles).slice(0, 12)} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} fontSize={12} />
                      <YAxis type="category" dataKey="name" width={110} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} name="Jobs" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Remote vs on-site" fallback={toPairs(data.remote_vs_on_site).map((p) => `${p.name}: ${p.value}`).join(", ") || "No data."}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={toPairs(data.remote_vs_on_site)} dataKey="value" nameKey="name" outerRadius={80} label>
                        {toPairs(data.remote_vs_on_site).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Employment types" fallback={toPairs(data.employment_types).map((p) => `${p.name}: ${p.value}`).join(", ") || "No data."}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={toPairs(data.employment_types)} dataKey="value" nameKey="name" outerRadius={80} label>
                        {toPairs(data.employment_types).map((_, i) => <Cell key={i} fill={PALETTE[(i + 2) % PALETTE.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Experience levels" fallback={toPairs(data.experience_levels).map((p) => `${p.name}: ${p.value}`).join(", ") || "No data."}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={toPairs(data.experience_levels)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={12} tick={{ fill: "var(--muted-foreground)" }} />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Jobs" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Top countries" fallback={toPairs(data.top_countries).map((p) => `${p.name}: ${p.value}`).join(", ") || "No data."}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={toPairs(data.top_countries).slice(0, 12)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={11} tick={{ fill: "var(--muted-foreground)" }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Jobs" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Jobs per day" fallback={data.jobs_per_day.map(([d, n]) => `${d}: ${n}`).join(", ") || "No data."}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.jobs_per_day.map(([date, count]) => ({ date, count }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" fontSize={11} tick={{ fill: "var(--muted-foreground)" }} minTickGap={24} />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} name="Jobs" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Top companies" fallback={data.top_companies.slice(0, 10).map((c) => `${c.company} (${c.count})`).join(", ") || "No data."}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={toNamed(data.top_companies).slice(0, 12)} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} fontSize={12} />
                      <YAxis type="category" dataKey="name" width={110} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#ec4899" radius={[0, 4, 4, 0]} name="Jobs" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
