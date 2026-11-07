"use client";

import {
  formatEmploymentType,
  formatExperienceLevel,
  formatSalary,
  relativeTime,
} from "@/components/jobs/job-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import type { Job } from "@/types";
import {
  ArrowLeft,
  Bookmark,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

const REMOTE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  "on-site": "On-site",
};

const APPLICATION_STATUSES = [
  "interested",
  "saved",
  "preparing",
  "applied",
  "assessment",
  "interview",
  "technical_interview",
  "final_interview",
  "offer",
  "rejected",
  "withdrawn",
] as const;

type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

const COVER_LETTER_TONES = ["professional", "enthusiastic", "concise"] as const;
type CoverLetterTone = (typeof COVER_LETTER_TONES)[number];

function capitalize(s: string) {
  return s
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { toast } = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [appDialogOpen, setAppDialogOpen] = useState(false);
  const [appStatus, setAppStatus] = useState<ApplicationStatus>("interested");
  const [appNotes, setAppNotes] = useState("");
  const [appSubmitting, setAppSubmitting] = useState(false);

  const [letterDialogOpen, setLetterDialogOpen] = useState(false);
  const [letterTone, setLetterTone] = useState<CoverLetterTone>("professional");
  const [letterInstructions, setLetterInstructions] = useState("");
  const [letterLoading, setLetterLoading] = useState(false);
  const [letterContent, setLetterContent] = useState<string | null>(null);

  const [matchLoading, setMatchLoading] = useState(false);
  const [matchContent, setMatchContent] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);

  const fetchJob = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/jobs/${id}`);
      const body = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok)
        throw new Error(
          (body as { error?: string }).error ?? "Failed to load job",
        );
      setJob((body as { data: { job: Job } }).data.job);
    } catch (err) {
      toast({
        title: "Could not load job",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    void fetchJob();
  }, [fetchJob]);

  // Check whether this job is already saved
  useEffect(() => {
    if (!job) return;
    fetch("/api/saved-jobs")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const list = (
          body as { data?: { saved_jobs?: { job_id: string }[] } } | null
        )?.data?.saved_jobs;
        if (Array.isArray(list))
          setSaved(list.some((s) => s.job_id === job.id));
      })
      .catch(() => {});
  }, [job]);

  async function toggleSave() {
    if (!job) return;
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
      toast({ title: next ? "Job saved" : "Job removed" });
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

  async function verifyListing() {
    setVerifying(true);
    try {
      const res = await fetch(`/api/jobs/${id}/verify`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          (body as { error?: string }).error ?? "Verification failed",
        );
      const data = (
        body as {
          data: {
            reachable: boolean;
            http_status: number | null;
            confirmed_closed: boolean;
            last_verified_at: string;
          };
        }
      ).data;
      if (data.confirmed_closed) {
        toast({
          title: "Listing appears closed",
          description: `The application link returned HTTP ${data.http_status ?? "error"}.`,
          variant: "destructive",
        });
      } else if (data.reachable) {
        toast({
          title: "Listing verified",
          description: `Application link is reachable (HTTP ${data.http_status ?? "?"}).`,
        });
      } else {
        toast({
          title: "Could not verify",
          description: `The link did not respond (HTTP ${data.http_status ?? "no response"}).`,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Verification failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  }

  async function submitApplication() {
    if (!job) return;
    setAppSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job.id,
          status: appStatus,
          ...(appNotes.trim() ? { notes: appNotes.trim() } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          (body as { error?: string }).error ?? "Could not create application",
        );
      toast({
        title: "Added to applications",
        description: `Tracked as "${capitalize(appStatus)}".`,
      });
      setAppDialogOpen(false);
      setAppNotes("");
    } catch (err) {
      toast({
        title: "Could not add application",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAppSubmitting(false);
    }
  }

  async function generateCoverLetter() {
    if (!job) return;
    setLetterLoading(true);
    setLetterContent(null);
    try {
      const res = await fetch("/api/ai/documents?type=cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job.id,
          tone: letterTone,
          ...(letterInstructions.trim()
            ? { additional_instructions: letterInstructions.trim() }
            : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          (body as { error?: string }).error ?? "Generation failed",
        );
      setLetterContent((body as { data: { content: string } }).data.content);
    } catch (err) {
      toast({
        title: "Could not generate cover letter",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLetterLoading(false);
    }
  }

  async function runMatchAnalysis() {
    if (!job) return;
    setMatchLoading(true);
    setMatchContent(null);
    setMatchScore(null);
    try {
      const res = await fetch("/api/ai/documents?type=match-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          (body as { error?: string }).error ?? "Analysis failed",
        );
      const data = (body as { data: { content: string; score: number | null } })
        .data;
      setMatchContent(data.content);
      setMatchScore(data.score);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Please try again.";
      toast({
        title: "Match analysis failed",
        description: msg.includes("analyze")
          ? `${msg} — Go to Dashboard → My Resume and click 'Analyze'.`
          : msg,
        variant: "destructive",
      });
    } finally {
      setMatchLoading(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy manually.",
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-32" />
        <Card>
          <CardHeader className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/search"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to search
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-lg font-medium">Job not found</p>
            <p className="text-sm text-muted-foreground">
              This job may have been removed or the link is invalid.
            </p>
            <Button variant="outline" asChild>
              <Link href="/dashboard/search">Back to search</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const salary = formatSalary(job);
  const published = job.published_at ?? job.discovered_at;
  const benefits = Array.isArray(job.raw_source_data?.benefits)
    ? (job.raw_source_data.benefits as unknown[]).filter(
        (b): b is string => typeof b === "string",
      )
    : [];

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/search"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to search
      </Link>

      {/* Header */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {job.company_logo && !logoError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.company_logo}
                alt={`${job.company} logo`}
                className="h-14 w-14 shrink-0 rounded-lg border object-contain bg-background"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border bg-muted text-xl font-semibold text-muted-foreground">
                {job.company.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-2xl">{job.title}</CardTitle>
                {job.source_name === "demo" && (
                  <Badge variant="outline">Demo</Badge>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="h-4 w-4" /> {job.company}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {(job.location || job.country) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {[job.location, job.country].filter(Boolean).join(", ")}
                  </span>
                )}
                {salary && (
                  <span className="font-medium text-foreground">{salary}</span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Posted {relativeTime(published)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
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
                <Badge variant="secondary" className="capitalize">
                  {job.source_name}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a
                href={job.application_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View original
                <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="outline"
              onClick={() => void verifyListing()}
              disabled={verifying}
            >
              {verifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Verify listing
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={saved ? "secondary" : "outline"}
          onClick={() => void toggleSave()}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
          )}
          {saved ? "Saved" : "Save job"}
        </Button>
        <Button variant="outline" onClick={() => setAppDialogOpen(true)}>
          <ChevronRight className="h-4 w-4" />
          Add to Applications
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setLetterDialogOpen(true);
            setLetterContent(null);
          }}
        >
          <FileText className="h-4 w-4" />
          Generate Cover Letter
        </Button>
        <Button
          variant="outline"
          onClick={() => void runMatchAnalysis()}
          disabled={matchLoading}
        >
          {matchLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          AI Match Analysis
        </Button>
      </div>

      {/* Match analysis result */}
      {(matchContent || matchLoading) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Match Analysis
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            {matchLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {matchContent}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Description</CardTitle>
        </CardHeader>
        <CardContent>
          {job.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {job.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No description provided.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Responsibilities */}
        {job.responsibilities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {job.responsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Required skills */}
        {job.required_skills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Required skills</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {job.required_skills.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Preferred skills */}
        {job.preferred_skills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preferred skills</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {job.preferred_skills.map((s) => (
                <Badge key={s} variant="outline">
                  {s}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        {benefits.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {benefits.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add to applications dialog */}
      <Dialog open={appDialogOpen} onOpenChange={setAppDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Applications</DialogTitle>
            <DialogDescription>
              Track {job.title} at {job.company} in your application pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="app-status">Status</Label>
              <Select
                value={appStatus}
                onValueChange={(v) => setAppStatus(v as ApplicationStatus)}
              >
                <SelectTrigger id="app-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLICATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {capitalize(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-notes">Notes (optional)</Label>
              <Textarea
                id="app-notes"
                placeholder="e.g. Referral from Jane, follow up Friday..."
                value={appNotes}
                onChange={(e) => setAppNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAppDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void submitApplication()}
              disabled={appSubmitting}
            >
              {appSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cover letter dialog */}
      <Dialog open={letterDialogOpen} onOpenChange={setLetterDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Cover Letter</DialogTitle>
            <DialogDescription>
              AI will draft a cover letter tailored to {job.title} at{" "}
              {job.company}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="letter-tone">Tone</Label>
                <Select
                  value={letterTone}
                  onValueChange={(v) => setLetterTone(v as CoverLetterTone)}
                >
                  <SelectTrigger id="letter-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COVER_LETTER_TONES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {capitalize(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="letter-instructions">
                  Instructions (optional)
                </Label>
                <Input
                  id="letter-instructions"
                  placeholder="e.g. mention my open-source work"
                  value={letterInstructions}
                  onChange={(e) => setLetterInstructions(e.target.value)}
                />
              </div>
            </div>
            {letterContent ? (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void copyText(letterContent)}
                  >
                    <Copy className="h-4 w-4" /> Copy
                  </Button>
                </div>
                <div className="max-h-[50vh] overflow-y-auto rounded-md border bg-muted/50 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {letterContent}
                  </p>
                </div>
              </div>
            ) : letterLoading ? (
              <div className="space-y-2 py-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <p className="pt-2 text-center text-sm text-muted-foreground">
                  Writing your cover letter...
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLetterDialogOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => void generateCoverLetter()}
              disabled={letterLoading}
            >
              {letterLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {letterContent ? "Regenerate" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
