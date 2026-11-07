"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Bell, Plus, Trash2 } from "lucide-react";

type Alert = {
  id: string; name: string; filters: Record<string, unknown>;
  frequency: "daily" | "twice_daily" | "weekly";
  minimum_match_score: number | null; is_active: boolean;
  last_sent_at: string | null; created_at: string;
};

const FREQUENCY_LABELS: Record<Alert["frequency"], string> = {
  daily: "Daily", twice_daily: "Twice daily", weekly: "Weekly",
};

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship", "freelance"];
const REMOTE_STATUSES = ["remote", "hybrid", "on_site"];

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

function summarizeFilters(f: Record<string, unknown>) {
  const parts: string[] = [];
  if (typeof f.keywords === "string" && f.keywords) parts.push(`keywords: ${f.keywords}`);
  if (typeof f.job_title === "string" && f.job_title) parts.push(`title: ${f.job_title}`);
  if (typeof f.location === "string" && f.location) parts.push(`location: ${f.location}`);
  if (Array.isArray(f.remote_status) && f.remote_status.length) parts.push(`remote: ${(f.remote_status as string[]).join(", ")}`);
  if (Array.isArray(f.employment_type) && f.employment_type.length) parts.push(`type: ${(f.employment_type as string[]).join(", ")}`);
  if (typeof f.salary_min === "number") parts.push(`salary ≥ ${f.salary_min}`);
  return parts.length ? parts.join(" · ") : "All jobs";
}

export default function AlertsPage() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const body = await apiFetch("/api/alerts");
      setAlerts(body.data.alerts ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load alerts");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(a: Alert, is_active: boolean) {
    setBusyId(a.id);
    try {
      await apiFetch("/api/alerts", { method: "PATCH", body: JSON.stringify({ id: a.id, is_active }) });
      setAlerts((prev) => (prev ?? []).map((x) => (x.id === a.id ? { ...x, is_active } : x)));
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally { setBusyId(null); }
  }

  async function remove(a: Alert) {
    setBusyId(a.id);
    try {
      await apiFetch(`/api/alerts?id=${a.id}`, { method: "DELETE" });
      setAlerts((prev) => (prev ?? []).filter((x) => x.id !== a.id));
      toast({ title: "Alert deleted" });
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally { setBusyId(null); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Job Alerts</h1>
          <p className="text-muted-foreground text-sm">Get notified when new jobs match your criteria. Alerts run automatically in the background and you'll be notified in-app.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New alert</Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {alerts === null && !error && <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-24" />)}</div>}
      {alerts !== null && alerts.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Bell className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium text-foreground">No alerts yet</p>
          <p className="text-sm mt-1">Create an alert to be notified when matching jobs are discovered.</p>
        </CardContent></Card>
      )}

      {alerts !== null && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((a) => (
            <Card key={a.id} className={a.is_active ? "" : "opacity-60"}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{a.name}</CardTitle>
                    <CardDescription className="mt-1">{summarizeFilters(a.filters ?? {})}</CardDescription>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="secondary">{FREQUENCY_LABELS[a.frequency]}</Badge>
                    {a.minimum_match_score != null && <Badge variant="outline">min score {a.minimum_match_score}</Badge>}
                    <Switch checked={a.is_active} disabled={busyId === a.id} onCheckedChange={(v) => toggleActive(a, v)} aria-label={`Toggle ${a.name}`} />
                    <Button variant="ghost" size="icon" disabled={busyId === a.id} onClick={() => remove(a)} aria-label={`Delete ${a.name}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted-foreground">
                {a.last_sent_at ? `Last notified ${new Date(a.last_sent_at).toLocaleDateString()}` : "Not notified yet"}
                {" · "}Created {new Date(a.created_at).toLocaleDateString()}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateAlertDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => { setCreateOpen(false); load(); }} />
    </div>
  );
}

function CreateAlertDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<Alert["frequency"]>("daily");
  const [minScore, setMinScore] = useState("");
  const [keywords, setKeywords] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [empTypes, setEmpTypes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(""); setFrequency("daily"); setMinScore(""); setKeywords(""); setJobTitle("");
      setLocation(""); setSalaryMin(""); setRemoteOnly(false); setEmpTypes([]);
    }
  }, [open]);

  function toggleEmp(t: string) {
    setEmpTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function submit() {
    if (!name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const filters: Record<string, unknown> = {};
    if (keywords.trim()) filters.keywords = keywords.trim();
    if (jobTitle.trim()) filters.job_title = jobTitle.trim();
    if (location.trim()) filters.location = location.trim();
    if (salaryMin.trim()) filters.salary_min = Number(salaryMin);
    if (remoteOnly) filters.remote_status = ["remote"];
    if (empTypes.length) filters.employment_type = empTypes;

    setSaving(true);
    try {
      await apiFetch("/api/alerts", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(), filters, frequency,
          minimum_match_score: minScore.trim() ? Number(minScore) : undefined,
          is_active: true,
        }),
      });
      toast({ title: "Alert created" });
      onCreated();
    } catch (e) {
      toast({ title: "Failed to create alert", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Job Alert</DialogTitle>
          <DialogDescription>Alerts run automatically in the background; matching jobs will appear as in-app notifications.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="alert-name">Name</Label>
            <Input id="alert-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="e.g. Remote React jobs" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as Alert["frequency"])}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="twice_daily">Twice daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Min match score (0–100, optional)</Label>
              <Input type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(e.target.value)} className="mt-1" placeholder="e.g. 70" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Keywords</Label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} className="mt-1" placeholder="react, typescript" />
            </div>
            <div>
              <Label>Job title</Label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="mt-1" placeholder="frontend engineer" />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" placeholder="Berlin, Germany" />
            </div>
            <div>
              <Label>Min salary</Label>
              <Input type="number" min={0} value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} className="mt-1" placeholder="80000" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="remote-only" checked={remoteOnly} onCheckedChange={(v) => setRemoteOnly(v === true)} />
            <Label htmlFor="remote-only" className="font-normal">Remote only</Label>
          </div>
          <div>
            <Label>Employment types</Label>
            <div className="flex flex-wrap gap-3 mt-2">
              {EMPLOYMENT_TYPES.map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <Checkbox id={`emp-${t}`} checked={empTypes.includes(t)} onCheckedChange={() => toggleEmp(t)} />
                  <Label htmlFor={`emp-${t}`} className="font-normal text-sm capitalize">{t.replace(/_/g, " ")}</Label>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Remote status options: {REMOTE_STATUSES.join(", ")} — remote-only checkbox sets remote filter automatically.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Creating…" : "Create alert"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
