"use client";

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
import { cn } from "@/lib/utils";
import { Briefcase, Calendar, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const STATUSES = [
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
type Status = (typeof STATUSES)[number];

const STATUS_LABELS: Record<Status, string> = {
  interested: "Interested",
  saved: "Saved",
  preparing: "Preparing",
  applied: "Applied",
  assessment: "Assessment",
  interview: "Interview",
  technical_interview: "Technical Interview",
  final_interview: "Final Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

type JobInfo = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote_status: string | null;
  employment_type: string | null;
  application_url: string | null;
  source_name: string | null;
} | null;

type AppEvent = {
  id: string;
  event_type: string;
  event_date: string;
  notes: string | null;
  created_at: string;
};

type Application = {
  id: string;
  user_id: string;
  job_id: string;
  status: Status;
  application_date: string | null;
  company_contact: string | null;
  recruiter_name: string | null;
  recruiter_email: string | null;
  interview_date: string | null;
  notes: string | null;
  salary_expected: number | null;
  application_url: string | null;
  created_at: string;
  updated_at: string;
  jobs: JobInfo;
  events: AppEvent[];
};

type JobOption = {
  id: string;
  title: string;
  company: string;
  location: string | null;
};

const EVENT_TYPES = [
  "note",
  "interview",
  "assessment",
  "offer",
  "rejection",
  "other",
  "status_change",
  "created",
];

const COLUMNS: { title: string; statuses: Status[] }[] = [
  {
    title: "Active Pipeline",
    statuses: ["interested", "saved", "preparing", "applied"],
  },
  {
    title: "In Progress",
    statuses: [
      "assessment",
      "interview",
      "technical_interview",
      "final_interview",
    ],
  },
  { title: "Closed", statuses: ["offer", "rejected", "withdrawn"] },
];

function statusBadgeVariant(s: Status) {
  if (s === "offer") return "success" as const;
  if (s === "rejected" || s === "withdrawn") return "destructive" as const;
  if (
    [
      "interview",
      "technical_interview",
      "final_interview",
      "assessment",
    ].includes(s)
  )
    return "warning" as const;
  if (s === "applied") return "default" as const;
  return "secondary" as const;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysSince(iso: string) {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 86400000),
  );
}

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

export default function ApplicationsPage() {
  const { toast } = useToast();
  const [apps, setApps] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "table">("board");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<Application | null>(null);

  const load = useCallback(async () => {
    try {
      const body = await apiFetch("/api/applications");
      setApps(body.data.applications ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load applications");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = apps ?? [];
    if (statusFilter !== "all")
      list = list.filter((a) => a.status === statusFilter);
    const q = companyFilter.trim().toLowerCase();
    if (q)
      list = list.filter(
        (a) =>
          (a.jobs?.company ?? "").toLowerCase().includes(q) ||
          (a.jobs?.title ?? "").toLowerCase().includes(q),
      );
    return list;
  }, [apps, statusFilter, companyFilter]);

  async function patchStatus(app: Application, status: Status) {
    try {
      await apiFetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast({ title: `Moved to ${STATUS_LABELS[status]}` });
      load();
      if (detail?.id === app.id) setDetail((d) => (d ? { ...d, status } : d));
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Application Tracker</h1>
          <p className="text-muted-foreground text-sm">
            Track every job application through your pipeline.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Application
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search company or title…"
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <div className="inline-flex rounded-md border p-0.5 self-start">
          {(["board", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-sm capitalize",
                view === v
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {apps === null && !error && (
        <div className="grid sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      )}
      {apps !== null && apps.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium text-foreground">No applications yet</p>
            <p className="text-sm mt-1">
              Add your first application or save a job to start tracking.
            </p>
            <LinkSaved />
          </CardContent>
        </Card>
      )}
      {apps !== null && apps.length > 0 && filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No applications match your filters.
        </p>
      )}

      {apps !== null && filtered.length > 0 && view === "board" && (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {COLUMNS.map((col) => {
            const items = filtered.filter((a) =>
              col.statuses.includes(a.status),
            );
            return (
              <div key={col.title} className="min-w-[280px] w-[280px] shrink-0">
                <h2 className="text-sm font-semibold mb-3 flex items-center justify-between">
                  {col.title}
                  <Badge variant="secondary">{items.length}</Badge>
                </h2>
                <div className="space-y-3">
                  {items.map((a) => (
                    <Card
                      key={a.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setDetail(a)}
                    >
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium leading-snug line-clamp-2">
                          {a.jobs?.title ?? "Unknown job"}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {a.jobs?.company ?? "Unknown company"}
                        </p>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={statusBadgeVariant(a.status)}>
                            {STATUS_LABELS[a.status]}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {daysSince(a.updated_at)}d in status
                          </span>
                        </div>
                        {a.interview_date && (
                          <p className="text-xs flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Interview {fmtDate(a.interview_date)}
                          </p>
                        )}
                        <div onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={a.status}
                            onValueChange={(v) => patchStatus(a, v as Status)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {STATUS_LABELS[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-md">
                      Empty
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {apps !== null && filtered.length > 0 && view === "table" && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  {[
                    "Company / Title",
                    "Status",
                    "Applied",
                    "Interview",
                    "Salary",
                    "Source",
                    "Updated",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 font-medium whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b last:border-0 hover:bg-accent/50 cursor-pointer"
                    onClick={() => setDetail(a)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {a.jobs?.title ?? "Unknown job"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.jobs?.company ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(a.status)}>
                        {STATUS_LABELS[a.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {fmtDate(a.application_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {fmtDate(a.interview_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {a.salary_expected != null
                        ? a.salary_expected.toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.jobs?.source_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {fmtDate(a.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <AddApplicationDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => {
          setAddOpen(false);
          load();
        }}
      />
      {detail && (
        <ApplicationDetailDialog
          app={detail}
          onClose={() => setDetail(null)}
          onSaved={(updated) => {
            setDetail(updated);
            load();
          }}
          onDeleted={() => {
            setDetail(null);
            load();
          }}
          onEventAdded={(ev) => {
            setDetail((d) =>
              d
                ? {
                    ...d,
                    events: [...(d.events ?? []), ev].sort((x, y) =>
                      x.event_date.localeCompare(y.event_date),
                    ),
                  }
                : d,
            );
          }}
        />
      )}
    </div>
  );
}

function LinkSaved() {
  return (
    <p className="text-sm mt-4">
      <a href="/dashboard/saved" className="text-primary hover:underline">
        Browse saved jobs
      </a>{" "}
      or{" "}
      <a href="/dashboard/discover" className="text-primary hover:underline">
        discover new jobs
      </a>
      .
    </p>
  );
}

function AddApplicationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<JobOption[] | null>(null);
  const [search, setSearch] = useState("");
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState<Status>("interested");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setJobs(null);
    setSearch("");
    setJobId("");
    setStatus("interested");
    setNotes("");
    apiFetch("/api/jobs?page_size=50")
      .then((b) => setJobs(b.data.jobs ?? []))
      .catch(() => setJobs([]));
  }, [open]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs ?? [];
    return (jobs ?? []).filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q),
    );
  }, [jobs, search]);

  async function submit() {
    if (!jobId) {
      toast({ title: "Select a job", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/applications", {
        method: "POST",
        body: JSON.stringify({
          job_id: jobId,
          status,
          notes: notes || undefined,
        }),
      });
      toast({ title: "Application added" });
      onCreated();
    } catch (e) {
      toast({
        title: "Failed to add application",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Application</DialogTitle>
          <DialogDescription>
            Pick a job from your discovered jobs and set its initial status.
          </DialogDescription>
        </DialogHeader>
        {jobs === null ? (
          <Skeleton className="h-40" />
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No jobs found.{" "}
            <a
              href="/dashboard/discover"
              className="text-primary hover:underline"
            >
              Discover jobs first
            </a>
            , then come back to track them here.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Search job</Label>
              <Input
                placeholder="Filter by title or company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Job</Label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {filteredJobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title} — {j.company}
                      {j.location ? ` · ${j.location}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {search && filteredJobs.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No matching jobs.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as Status)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !jobId}>
            {saving ? "Adding…" : "Add Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApplicationDetailDialog({
  app,
  onClose,
  onSaved,
  onDeleted,
  onEventAdded,
}: {
  app: Application;
  onClose: () => void;
  onSaved: (a: Application) => void;
  onDeleted: () => void;
  onEventAdded: (e: AppEvent) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    status: app.status,
    application_date: app.application_date ?? "",
    interview_date: app.interview_date ?? "",
    recruiter_name: app.recruiter_name ?? "",
    recruiter_email: app.recruiter_email ?? "",
    company_contact: app.company_contact ?? "",
    salary_expected: app.salary_expected?.toString() ?? "",
    application_url: app.application_url ?? "",
    notes: app.notes ?? "",
  });
  const [eventType, setEventType] = useState("note");
  const [eventDate, setEventDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [eventNotes, setEventNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }) as typeof f);
  }

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { status: form.status };
      for (const k of [
        "application_date",
        "interview_date",
        "recruiter_name",
        "recruiter_email",
        "company_contact",
        "application_url",
        "notes",
      ] as const) {
        body[k] = form[k]; // empty strings are converted to null server-side
      }
      if (form.salary_expected)
        body.salary_expected = Number(form.salary_expected);
      const res = await apiFetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      onSaved({
        ...app,
        ...res.data.application,
        jobs: app.jobs,
        events: app.events,
      });
      toast({ title: "Application updated" });
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function addEvent() {
    try {
      const res = await apiFetch(`/api/applications/${app.id}`, {
        method: "POST",
        body: JSON.stringify({
          event_type: eventType,
          event_date: eventDate,
          notes: eventNotes || undefined,
        }),
      });
      onEventAdded(res.data.event as AppEvent);
      setEventNotes("");
      setEventType("note");
      toast({ title: "Event added" });
    } catch (e) {
      toast({
        title: "Failed to add event",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  }

  async function remove() {
    try {
      await apiFetch(`/api/applications/${app.id}`, { method: "DELETE" });
      toast({ title: "Application deleted" });
      onDeleted();
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  }

  const events = [...(app.events ?? [])].sort((a, b) =>
    b.event_date.localeCompare(a.event_date),
  );

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{app.jobs?.title ?? "Application"}</DialogTitle>
          <DialogDescription>
            {app.jobs?.company ?? "Unknown company"} ·{" "}
            {STATUS_LABELS[app.status]}
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Salary expected</Label>
            <Input
              type="number"
              min={0}
              value={form.salary_expected}
              onChange={(e) => set("salary_expected", e.target.value)}
              className="mt-1"
              placeholder="e.g. 120000"
            />
          </div>
          <div>
            <Label>Application date</Label>
            <Input
              type="date"
              value={form.application_date}
              onChange={(e) => set("application_date", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Interview date</Label>
            <Input
              type="date"
              value={form.interview_date}
              onChange={(e) => set("interview_date", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Recruiter name</Label>
            <Input
              value={form.recruiter_name}
              onChange={(e) => set("recruiter_name", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Recruiter email</Label>
            <Input
              type="email"
              value={form.recruiter_email}
              onChange={(e) => set("recruiter_email", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Company contact</Label>
            <Input
              value={form.company_contact}
              onChange={(e) => set("company_contact", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Application URL</Label>
            <Input
              type="url"
              value={form.application_url}
              onChange={(e) => set("application_url", e.target.value)}
              className="mt-1"
              placeholder="https://…"
            />
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="mt-1"
            rows={3}
          />
        </div>
        {app.jobs?.application_url && (
          <a
            href={app.jobs.application_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View job posting
          </a>
        )}

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3">Timeline</h3>
          <div className="flex gap-2 mb-4">
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-40"
            />
            <Input
              placeholder="Note…"
              value={eventNotes}
              onChange={(e) => setEventNotes(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={addEvent}
              disabled={!eventDate}
            >
              Add
            </Button>
          </div>
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground">No events yet.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {events.map((ev) => (
                <li
                  key={ev.id}
                  className="text-sm border-l-2 border-muted pl-3 py-1"
                >
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground capitalize">
                      {ev.event_type.replace(/_/g, " ")}
                    </span>
                    <span>{fmtDate(ev.event_date)}</span>
                  </div>
                  {ev.notes && <p className="text-sm mt-0.5">{ev.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          {confirmDelete ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm text-destructive">
                Delete permanently?
              </span>
              <Button variant="destructive" size="sm" onClick={remove}>
                Confirm
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
