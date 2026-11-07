"use client";

import {
  ArrowRight,
  Bell,
  Bookmark,
  Briefcase,
  CalendarClock,
  CheckSquare,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface JobSummary {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  remote_status: string | null;
  employment_type: string | null;
  application_url: string | null;
  source_name: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
}

interface TopMatch {
  compatibility_score: number;
  jobs: JobSummary | null;
}

interface RecentApplication {
  id: string;
  status: string;
  updated_at: string;
  jobs: { title: string; company: string | null } | null;
}

interface DashboardData {
  stats: {
    jobs_discovered: number;
    strong_matches: number;
    saved_jobs: number;
    applications: number;
    upcoming_interviews: number;
    searches: number;
    active_alerts: number;
    unread_notifications: number;
  };
  top_matches: TopMatch[];
  recent_applications: RecentApplication[];
  pipeline: Record<string, number>;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function statusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
  switch (status) {
    case "applied":
    case "submitted":
      return "secondary";
    case "interview":
    case "interviewing":
      return "warning";
    case "offer":
      return "success";
    case "rejected":
    case "withdrawn":
      return "destructive";
    default:
      return "outline";
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 90
      ? "bg-green-600 text-white border-transparent"
      : score >= 80
        ? "bg-emerald-600 text-white border-transparent"
        : score >= 70
          ? "bg-amber-500 text-white border-transparent"
          : "";
  return (
    <Badge
      variant={
        score >= 90
          ? "success"
          : score >= 80
            ? "secondary"
            : score >= 70
              ? "warning"
              : "outline"
      }
      className={cls}
    >
      {score}%
    </Badge>
  );
}

const PIPELINE_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-slate-500",
];

export default function DashboardPage() {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (!res.ok) throw new Error("Failed to load dashboard stats");
        const json = await res.json();
        if (!cancelled) setData(json.data);
      } catch (e) {
        if (!cancelled) {
          const msg =
            e instanceof Error ? e.message : "Failed to load dashboard";
          setError(msg);
          toast({ title: "Error", description: msg, variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const stats = data?.stats;
  const pipelineEntries = Object.entries(data?.pipeline ?? {}).filter(
    ([, v]) => v > 0,
  );
  const pipelineTotal = pipelineEntries.reduce((sum, [, v]) => sum + v, 0);
  const now = new Date();
  const dateString = now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const checklist = stats
    ? [
        {
          label: "Upload your resume for AI analysis",
          href: "/dashboard/resume",
          done: stats.jobs_discovered > 0 || stats.strong_matches > 0,
        },
        {
          label: "Run your first job search",
          href: "/dashboard/search",
          done: stats.searches > 0,
        },
        {
          label: "Save a job you're interested in",
          href: "/dashboard/saved",
          done: stats.saved_jobs > 0,
        },
        {
          label: "Track a job application",
          href: "/dashboard/applications",
          done: stats.applications > 0,
        },
      ]
    : [];
  const showChecklist = stats ? checklist.some((c) => !c.done) : false;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">{dateString}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/search">
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4" /> Search Jobs
            </Button>
          </Link>
          <Link href="/dashboard/discover">
            <Button variant="outline" size="sm">
              <Sparkles className="h-4 w-4" /> AI Discovery
            </Button>
          </Link>
          <Link href="/dashboard/resume">
            <Button size="sm">
              <Upload className="h-4 w-4" /> Upload Resume
            </Button>
          </Link>
        </div>
      </div>

      {error && !loading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Unable to load your dashboard right now.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))
          : stats && (
              <>
                <SummaryCard
                  title="Jobs Discovered"
                  value={stats.jobs_discovered}
                  icon={<Search className="h-4 w-4" />}
                />
                <SummaryCard
                  title="Strong Matches"
                  value={stats.strong_matches}
                  icon={<Briefcase className="h-4 w-4" />}
                />
                <SummaryCard
                  title="Saved Jobs"
                  value={stats.saved_jobs}
                  icon={<Bookmark className="h-4 w-4" />}
                />
                <SummaryCard
                  title="Applications"
                  value={stats.applications}
                  icon={<CheckSquare className="h-4 w-4" />}
                />
                <SummaryCard
                  title="Interviews"
                  value={stats.upcoming_interviews}
                  icon={<CalendarClock className="h-4 w-4" />}
                />
                <SummaryCard
                  title="Active Alerts"
                  value={stats.active_alerts}
                  icon={<Bell className="h-4 w-4" />}
                />
              </>
            )}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Matches */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Matches</CardTitle>
                <CardDescription>
                  Your highest compatibility job matches
                </CardDescription>
              </div>
              <Link href="/dashboard/matches">
                <Button variant="ghost" size="sm">
                  View all <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-6 w-10" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !data || data.top_matches.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <p>
                  No matches yet. Upload your resume and run AI discovery to
                  find jobs tailored to you.
                </p>
                <Link href="/dashboard/discover" className="inline-block mt-3">
                  <Button size="sm">Discover Jobs</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.top_matches.slice(0, 5).map((m, i) => {
                  const job = m.jobs;
                  if (!job) return null;
                  return (
                    <Link
                      key={job.id ?? i}
                      href={`/dashboard/jobs/${job.id}`}
                      className="flex items-start gap-3 p-3 rounded-md hover:bg-accent transition-colors"
                    >
                      <ScoreBadge score={Math.round(m.compatibility_score)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {job.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {job.company ?? "Unknown company"}
                          {job.location ? ` · ${job.location}` : ""}
                          {job.remote_status
                            ? ` · ${formatStatus(job.remote_status)}`
                            : ""}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline + Recent Applications */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Application Pipeline</CardTitle>
                  <CardDescription>
                    Track where your applications stand
                  </CardDescription>
                </div>
                <Link href="/dashboard/applications">
                  <Button variant="ghost" size="sm">
                    View all <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-6 w-full mb-4" />
              ) : pipelineEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No applications yet. Start tracking your job hunt.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                    {pipelineEntries.map(([status], i) => (
                      <div
                        key={status}
                        className={cn(
                          "h-full",
                          PIPELINE_COLORS[i % PIPELINE_COLORS.length],
                        )}
                        style={{
                          width: `${(pipelineEntries[i][1] / pipelineTotal) * 100}%`,
                        }}
                        title={`${formatStatus(status)}: ${pipelineEntries[i][1]}`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {pipelineEntries.map(([status, count], i) => (
                      <div
                        key={status}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full shrink-0",
                            PIPELINE_COLORS[i % PIPELINE_COLORS.length],
                          )}
                        />
                        <span className="text-muted-foreground truncate">
                          {formatStatus(status)}
                        </span>
                        <span className="font-medium ml-auto">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Applications</CardTitle>
                  <CardDescription>
                    Your latest application activity
                  </CardDescription>
                </div>
                <Link href="/dashboard/applications">
                  <Button variant="ghost" size="sm">
                    View all <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-5 w-16" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !data || data.recent_applications.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No applications yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.recent_applications.slice(0, 5).map((app) => (
                    <div key={app.id} className="flex items-center gap-3">
                      <Badge variant={statusBadgeVariant(app.status)}>
                        {formatStatus(app.status)}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {app.jobs?.title ?? "Unknown job"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {app.jobs?.company ?? ""} ·{" "}
                          {relativeTime(app.updated_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Getting started checklist */}
      {stats && showChecklist && (
        <Card>
          <CardHeader>
            <CardTitle>Getting started</CardTitle>
            <CardDescription>
              Complete these steps to get the most out of StackScout AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {checklist.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 text-sm rounded-md p-2 -m-2 transition-colors hover:bg-accent",
                      item.done ? "text-muted-foreground" : "",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border text-xs shrink-0",
                        item.done
                          ? "bg-green-600 border-green-600 text-white"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {item.done ? "✓" : ""}
                    </span>
                    <span
                      className={item.done ? "line-through" : "font-medium"}
                    >
                      {item.label}
                    </span>
                    {!item.done && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
