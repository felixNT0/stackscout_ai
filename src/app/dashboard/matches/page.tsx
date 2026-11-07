"use client";

import {
  Brain,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  MapPin,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  country: string | null;
  remote_status: string | null;
  employment_type: string | null;
  experience_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  application_url: string | null;
  source_name: string | null;
  published_at: string | null;
  description: string | null;
}

interface MatchRow {
  id: string;
  job_id: string;
  compatibility_score: number;
  technical_stack_score: number | null;
  experience_score: number | null;
  responsibilities_score: number | null;
  seniority_score: number | null;
  location_score: number | null;
  industry_score: number | null;
  matching_skills: string[] | null;
  missing_skills: string[] | null;
  relevant_experience: string | null;
  potential_weaknesses: string[] | null;
  seniority_compatibility: string | null;
  location_eligibility: string | null;
  explanation: string | null;
  recommendation: string | null;
  jobs: Job | null;
}

function category(score: number): {
  label: string;
  variant: "success" | "warning" | "secondary" | "destructive" | "outline";
  bar: string;
} {
  if (score >= 90)
    return { label: "Excellent", variant: "success", bar: "bg-green-600" };
  if (score >= 80)
    return { label: "Strong", variant: "success", bar: "bg-green-500" };
  if (score >= 70)
    return { label: "Good", variant: "warning", bar: "bg-amber-500" };
  if (score >= 50)
    return { label: "Partial", variant: "secondary", bar: "bg-amber-400" };
  return { label: "Low", variant: "destructive", bar: "bg-red-500" };
}

const FILTERS = [
  { value: "all", label: "All matches", min: 0 },
  { value: "excellent", label: "Excellent (90+)", min: 90 },
  { value: "strong", label: "Strong (80+)", min: 80 },
  { value: "good", label: "Good (70+)", min: 70 },
  { value: "partial", label: "Partial (50+)", min: 50 },
  { value: "low", label: "Low (<50)", min: 0 },
] as const;

function formatSalary(job: Job): string | null {
  if (job.salary_min == null && job.salary_max == null) return null;
  const cur = job.salary_currency ?? "";
  const period = job.salary_period ? `/${job.salary_period}` : "";
  const fmt = (n: number) =>
    n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
  if (job.salary_min != null && job.salary_max != null) {
    return `${cur} ${fmt(job.salary_min)}–${fmt(job.salary_max)}${period}`.trim();
  }
  return `${cur} ${fmt((job.salary_min ?? job.salary_max) as number)}${period}`.trim();
}

async function apiError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.error) return String(body.error);
  } catch {
    // ignore
  }
  return `Request failed (${res.status})`;
}

export default function MatchesPage() {
  const { toast } = useToast();
  const [matches, setMatches] = useState<MatchRow[] | null>(null);
  const [analyzedCount, setAnalyzedCount] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [aiContent, setAiContent] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const loadMatches = useCallback(async () => {
    try {
      const res = await fetch("/api/matches/list?limit=100");
      if (!res.ok) throw new Error(await apiError(res));
      const json = await res.json();
      setMatches(json.data?.matches ?? []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to load matches",
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setMatches([]);
    }
  }, [toast]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  async function runAnalysis() {
    setRunning(true);
    setAnalyzedCount(null);
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      });
      if (!res.ok) throw new Error(await apiError(res));
      const json = await res.json();
      setAnalyzedCount(json.data?.analyzed ?? 0);
      toast({
        title: "Analysis complete",
        description: `Scored ${json.data?.analyzed ?? 0} jobs against your profile.`,
      });
      await loadMatches();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setRunning(false);
    }
  }

  async function explainMatch(match: MatchRow) {
    setAiJobId(match.job_id);
    setAiContent(null);
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/documents?type=match-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: match.job_id }),
      });
      if (!res.ok) throw new Error(await apiError(res));
      const json = await res.json();
      setAiContent(json.data?.content ?? "No analysis returned.");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "AI explanation failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setAiJobId(null);
    } finally {
      setAiLoading(false);
    }
  }

  const minScore = FILTERS.find((f) => f.value === filter)?.min ?? 0;
  const isLowFilter = filter === "low";
  const strongCount =
    matches?.filter((m) => m.compatibility_score >= 70).length ?? 0;

  const visible =
    matches?.filter((m) =>
      isLowFilter
        ? m.compatibility_score < 50
        : m.compatibility_score >= minScore,
    ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">AI Matches</h1>
          <p className="text-muted-foreground">
            Compatibility scores between your profile and discovered jobs.
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={running}>
          {running ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Run Analysis
            </>
          )}
        </Button>
      </div>

      {/* Summary strip */}
      {matches !== null && matches.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{matches.length}</div>
              <p className="text-xs text-muted-foreground">Matches found</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {strongCount}
              </div>
              <p className="text-xs text-muted-foreground">Score 70+</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{analyzedCount ?? "—"}</div>
              <p className="text-xs text-muted-foreground">Last analysis run</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      {matches !== null && matches.length > 0 && (
        <div className="flex items-center gap-3">
          <Label htmlFor="match-filter" className="text-sm shrink-0">
            Filter
          </Label>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger id="match-filter" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Results */}
      {matches === null ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No matches yet</h2>
            <p className="text-muted-foreground mb-6">
              Upload a resume and run analysis to see how your profile matches
              with discovered jobs.
            </p>
            <Link href="/dashboard/resume">
              <Button>Upload your resume</Button>
            </Link>
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No matches in this category. Try a different filter.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              expanded={expandedId === match.id}
              onToggle={() =>
                setExpandedId(expandedId === match.id ? null : match.id)
              }
              onExplain={() => explainMatch(match)}
            />
          ))}
        </div>
      )}

      {/* AI explanation dialog */}
      <Dialog
        open={aiJobId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAiJobId(null);
            setAiContent(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Match Explanation
            </DialogTitle>
            <DialogDescription>
              Deep analysis of how your profile fits this job.
            </DialogDescription>
          </DialogHeader>
          {aiLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {aiContent}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubScore({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground capitalize">
          {label.replace(/_/g, " ")}
        </span>
        <span className="font-medium">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function MatchCard({
  match,
  expanded,
  onToggle,
  onExplain,
}: {
  match: MatchRow;
  expanded: boolean;
  onToggle: () => void;
  onExplain: () => void;
}) {
  const job = match.jobs;
  const cat = category(match.compatibility_score);
  const salary = job ? formatSalary(job) : null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Score */}
          <div className="flex sm:flex-col items-center sm:items-start gap-2 sm:w-20 shrink-0">
            <div className="text-3xl font-bold">
              {match.compatibility_score}
            </div>
            <Badge variant={cat.variant}>{cat.label}</Badge>
          </div>

          {/* Job info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-lg leading-tight">
                  {job ? (
                    <Link
                      href={`/dashboard/jobs/${job.id}`}
                      className="hover:underline"
                    >
                      {job.title}
                    </Link>
                  ) : (
                    "Unknown job"
                  )}
                </h3>
                <div className="text-sm text-muted-foreground">
                  {job?.company}
                  {job?.location ? ` · ${job.location}` : ""}
                </div>
              </div>
              {job?.application_url && (
                <a
                  href={job.application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Button size="sm" variant="outline">
                    Apply
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                </a>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {job?.remote_status && (
                <Badge variant="outline">{job.remote_status}</Badge>
              )}
              {job?.employment_type && (
                <Badge variant="outline">{job.employment_type}</Badge>
              )}
              {job?.experience_level && (
                <Badge variant="outline">{job.experience_level}</Badge>
              )}
              {job?.location && (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {job.location}
                </Badge>
              )}
              {salary && <Badge variant="secondary">{salary}</Badge>}
              {job?.source_name && (
                <Badge variant="outline">{job.source_name}</Badge>
              )}
            </div>

            {/* Skills */}
            {match.matching_skills && match.matching_skills.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Matching skills
                </div>
                <div className="flex flex-wrap gap-1">
                  {match.matching_skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="border-green-600/40 text-green-700 dark:text-green-400"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {match.missing_skills && match.missing_skills.length > 0 && (
              <div className="mt-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Missing skills
                </div>
                <div className="flex flex-wrap gap-1">
                  {match.missing_skills.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Expandable detail */}
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 px-0"
              onClick={onToggle}
            >
              {expanded ? (
                <>
                  <ChevronUp className="mr-1 h-4 w-4" /> Hide details
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-4 w-4" /> Why this score
                </>
              )}
            </Button>

            {expanded && (
              <div className="mt-3 space-y-4 rounded-md bg-muted/50 p-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <SubScore
                    label="Technical stack"
                    value={match.technical_stack_score}
                  />
                  <SubScore label="Experience" value={match.experience_score} />
                  <SubScore
                    label="Responsibilities"
                    value={match.responsibilities_score}
                  />
                  <SubScore label="Seniority" value={match.seniority_score} />
                  <SubScore label="Location" value={match.location_score} />
                  <SubScore label="Industry" value={match.industry_score} />
                </div>

                {match.explanation && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Explanation
                    </div>
                    <p className="text-sm">{match.explanation}</p>
                  </div>
                )}
                {match.recommendation && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Recommendation
                    </div>
                    <p className="text-sm">{match.recommendation}</p>
                  </div>
                )}
                {match.relevant_experience && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Relevant experience
                    </div>
                    <p className="text-sm">{match.relevant_experience}</p>
                  </div>
                )}
                {match.potential_weaknesses &&
                  match.potential_weaknesses.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                        Potential weaknesses
                      </div>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {match.potential_weaknesses.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                <div className="text-xs text-muted-foreground space-x-3">
                  {match.seniority_compatibility && (
                    <span>Seniority: {match.seniority_compatibility}</span>
                  )}
                  {match.location_eligibility && (
                    <span>Location: {match.location_eligibility}</span>
                  )}
                </div>
                <Button size="sm" variant="secondary" onClick={onExplain}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze with AI
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
