"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { Job } from "@/types";
import { formatDistanceToNow } from "date-fns";
import {
  Bookmark,
  Briefcase,
  Building2,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export type { Job } from "@/types";

const REMOTE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  "on-site": "On-site",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
  INR: "₹",
  CAD: "CA$",
  AUD: "A$",
};

const PERIOD_LABELS: Record<string, string> = {
  hourly: "/hour",
  monthly: "/month",
  annual: "/year",
};

/** Format a job's salary range. Returns null when no salary data exists. */
export function formatSalary(
  job: Pick<
    Job,
    "salary_min" | "salary_max" | "salary_currency" | "salary_period"
  >,
): string | null {
  const { salary_min, salary_max, salary_currency, salary_period } = job;
  if (salary_min == null && salary_max == null) return null;
  const fmt = (n: number) => {
    const symbol = salary_currency
      ? (CURRENCY_SYMBOLS[salary_currency] ?? `${salary_currency} `)
      : "";
    return `${symbol}${n.toLocaleString()}`;
  };
  let range: string;
  if (salary_min != null && salary_max != null) {
    range =
      salary_min === salary_max
        ? fmt(salary_min)
        : `${fmt(salary_min)} – ${fmt(salary_max)}`;
  } else if (salary_min != null) {
    range = `${fmt(salary_min)}+`;
  } else {
    range = `Up to ${fmt(salary_max as number)}`;
  }
  const period = salary_period
    ? (PERIOD_LABELS[salary_period] ?? `/${salary_period}`)
    : "";
  return `${range}${period}`;
}

/** Relative time string, safe against invalid/missing dates. */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "recently";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "recently";
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatEmploymentType(type: string | null): string | null {
  if (!type) return null;
  return type
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatExperienceLevel(level: string | null): string | null {
  if (!level) return null;
  return level.charAt(0).toUpperCase() + level.slice(1);
}

interface JobCardProps {
  job: Job;
  matchScore?: number;
  variant?: "card" | "row";
}

export function JobCard({ job, matchScore, variant = "card" }: JobCardProps) {
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const salary = formatSalary(job);
  const published = job.published_at ?? job.discovered_at;
  const skills = [
    ...(job.required_skills ?? []),
    ...(job.preferred_skills ?? []),
  ];
  const visibleSkills = skills.slice(0, 6);
  const extraSkills = skills.length - visibleSkills.length;
  const isDemo = job.source_name === "demo";

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    setSaving(true);
    try {
      const res = next
        ? await fetch("/api/saved-jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_id: job.id }),
          })
        : await fetch(`/api/saved-jobs?job_id=${encodeURIComponent(job.id)}`, {
            method: "DELETE",
          });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Request failed");
      }
      toast({
        title: next ? "Job saved" : "Job removed",
        description: next
          ? "Added to your saved jobs."
          : "Removed from saved jobs.",
      });
    } catch (err) {
      setSaved(!next);
      toast({
        title: "Could not update saved job",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  const badges = (
    <div className="flex flex-wrap items-center gap-1.5">
      {matchScore != null && (
        <Badge
          variant={
            matchScore >= 80
              ? "success"
              : matchScore >= 60
                ? "warning"
                : "secondary"
          }
        >
          {Math.round(matchScore)}% match
        </Badge>
      )}
      {job.remote_status && (
        <Badge variant="secondary">
          {REMOTE_LABELS[job.remote_status] ?? job.remote_status}
        </Badge>
      )}
      {formatEmploymentType(job.employment_type) && (
        <Badge variant="outline">
          {formatEmploymentType(job.employment_type)}
        </Badge>
      )}
      {formatExperienceLevel(job.experience_level) && (
        <Badge variant="outline">
          {formatExperienceLevel(job.experience_level)}
        </Badge>
      )}
      {isDemo && <Badge variant="outline">Demo</Badge>}
      <Badge variant="secondary" className="capitalize">
        {job.source_name}
      </Badge>
    </div>
  );

  const meta = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <Building2 className="h-3.5 w-3.5" />
        {job.company}
      </span>
      {(job.location || job.country) && (
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {[job.location, job.country].filter(Boolean).join(", ")}
        </span>
      )}
      {salary && (
        <span className="flex items-center gap-1 font-medium text-foreground">
          <Briefcase className="h-3.5 w-3.5" />
          {salary}
        </span>
      )}
      <span className="flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" />
        {relativeTime(published)}
      </span>
    </div>
  );

  const skillsRow = skills.length > 0 && (
    <div className="flex flex-wrap items-center gap-1.5">
      {visibleSkills.map((skill) => (
        <Badge key={skill} variant="secondary" className="font-normal">
          {skill}
        </Badge>
      ))}
      {extraSkills > 0 && (
        <span className="text-xs text-muted-foreground">
          +{extraSkills} more
        </span>
      )}
    </div>
  );

  const actions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/dashboard/jobs/${job.id}`}>View</Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={job.application_url} target="_blank" rel="noopener noreferrer">
          Apply
          <ExternalLink className="ml-1 h-3.5 w-3.5" />
        </a>
      </Button>
      <Button
        variant={saved ? "secondary" : "ghost"}
        size="sm"
        onClick={toggleSave}
        disabled={saving}
        aria-pressed={saved}
        aria-label={saved ? "Remove from saved jobs" : "Save job"}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
        )}
        <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
      </Button>
    </div>
  );

  if (variant === "row") {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            {badges}
            <div>
              <Link
                href={`/dashboard/jobs/${job.id}`}
                className="text-base font-semibold leading-snug hover:underline"
              >
                {job.title}
              </Link>
              <div className="mt-1">{meta}</div>
            </div>
            {job.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {job.description}
              </p>
            )}
            {skillsRow}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
            {actions}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            {job.company_logo && !logoError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.company_logo}
                alt=""
                className="h-10 w-10 shrink-0 rounded-md border object-contain bg-background"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted text-sm font-semibold text-muted-foreground">
                {job.company.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <Link
                href={`/dashboard/jobs/${job.id}`}
                className="block truncate text-base font-semibold leading-snug hover:underline"
              >
                {job.title}
              </Link>
              <p className="truncate text-sm text-muted-foreground">
                {job.company}
              </p>
            </div>
          </div>
        </div>
        {badges}
        {meta}
      </CardHeader>
      <CardContent className="flex-1 space-y-3 pb-3">
        {job.description && (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {job.description}
          </p>
        )}
        {skillsRow}
      </CardContent>
      <CardFooter className="pt-0">{actions}</CardFooter>
    </Card>
  );
}

export function JobCardSkeleton() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        </div>
        <div className="flex gap-1.5">
          <div className="h-5 w-16 rounded-full bg-muted" />
          <div className="h-5 w-14 rounded-full bg-muted" />
          <div className="h-5 w-20 rounded-full bg-muted" />
        </div>
        <div className="h-3 w-2/3 rounded bg-muted" />
      </CardHeader>
      <CardContent className="flex-1 space-y-2 pb-3">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </CardContent>
      <CardFooter className="pt-0">
        <div className="h-9 w-full rounded-md bg-muted" />
      </CardFooter>
    </Card>
  );
}
