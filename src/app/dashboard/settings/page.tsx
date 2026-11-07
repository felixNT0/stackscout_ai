"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

type Profile = {
  full_name: string | null;
  professional_headline: string | null;
  location: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  phone: string | null;
};
type Preferences = {
  job_titles: string[] | null;
  skills: string[] | null;
  experience_level: string | null;
  employment_type: string[] | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  remote_only: boolean | null;
  preferred_countries: string[] | null;
  preferred_locations: string[] | null;
};
type Settings = {
  theme: string;
  email_notifications: boolean;
  in_app_notifications: boolean;
  search_alerts: boolean;
  resume_visibility: string;
  ai_data_processing: boolean;
};

const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "freelance",
];
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "CHF", "INR", "BRL"];

const csvToArr = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
const arrToCsv = (a: string[] | null) => (a ?? []).join(", ");

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [profileRes, settingsRes] = await Promise.all([
        apiFetch("/api/profile"),
        apiFetch("/api/settings"),
      ]);
      setProfile(profileRes.data.profile);
      setPrefs(profileRes.data.preferences);
      setSettings(settingsRes.data.settings);
    } catch (e) {
      toast({
        title: "Failed to load settings",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
    // Email is available from NextAuth session
    setEmail(session?.user?.email ?? null);
  }, [toast, session]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile(patch: Partial<Profile>, key: string) {
    setSaving(key);
    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ profile: patch }),
      });
      toast({ title: "Profile saved" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  }

  async function savePreferences(patch: Record<string, unknown>, key: string) {
    setSaving(key);
    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ preferences: patch }),
      });
      setPrefs((p) => (p ? { ...p, ...(patch as Partial<Preferences>) } : p));
      toast({ title: "Preferences saved" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  }

  async function saveSettings(patch: Partial<Settings>, key: string) {
    setSaving(key);
    try {
      const res = await apiFetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setSettings(res.data.settings);
      toast({ title: "Settings saved" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  }

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );

  const emptyProfile: Profile = profile ?? {
    full_name: null,
    professional_headline: null,
    location: null,
    portfolio_url: null,
    github_url: null,
    linkedin_url: null,
    phone: null,
  };
  const emptyPrefs: Preferences = prefs ?? {
    job_titles: null,
    skills: null,
    experience_level: null,
    employment_type: null,
    salary_min: null,
    salary_max: null,
    salary_currency: "USD",
    remote_only: false,
    preferred_countries: null,
    preferred_locations: null,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your profile, preferences, and account.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Career Preferences</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Your public professional information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm
                initial={emptyProfile}
                saving={saving === "profile"}
                onSave={(patch) => saveProfile(patch, "profile")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Career Preferences</CardTitle>
              <CardDescription>
                Used to rank and filter job matches.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PreferencesForm
                initial={emptyPrefs}
                saving={saving === "prefs"}
                onSave={(patch) => savePreferences(patch, "prefs")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Sign-in credentials and account management.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Email</Label>
                <Input
                  value={email ?? ""}
                  readOnly
                  disabled
                  className="mt-1 max-w-sm"
                />
              </div>
              <PasswordForm />
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-destructive">
                  Danger zone
                </h3>
                <DeleteAccount onDeleted={() => router.push("/")} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Choose how StackScout AI looks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-sm">
              <div>
                <Label>Theme</Label>
                <Select
                  value={theme ?? "system"}
                  onValueChange={(v) => {
                    setTheme(v);
                    if (settings) saveSettings({ theme: v }, "theme");
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Theme is also saved to your account settings.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Control how and when we notify you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingSwitch
                label="Email notifications"
                description="Receive updates and alerts by email."
                checked={settings?.email_notifications ?? true}
                onChange={(v) =>
                  saveSettings({ email_notifications: v }, "notif")
                }
              />
              <SettingSwitch
                label="In-app notifications"
                description="Show notifications inside the dashboard."
                checked={settings?.in_app_notifications ?? true}
                onChange={(v) =>
                  saveSettings({ in_app_notifications: v }, "notif")
                }
              />
              <SettingSwitch
                label="Job alerts"
                description="Run saved job alerts and notify you of matches."
                checked={settings?.search_alerts ?? true}
                onChange={(v) => saveSettings({ search_alerts: v }, "notif")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy</CardTitle>
              <CardDescription>Control how your data is used.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-sm">
                <Label>Resume visibility</Label>
                <Select
                  value={settings?.resume_visibility ?? "private"}
                  onValueChange={(v) =>
                    saveSettings({ resume_visibility: v }, "privacy")
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private — only you</SelectItem>
                    <SelectItem value="public">
                      Public — visible to employers
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <SettingSwitch
                label="AI data processing"
                description="Allow your resume and profile data to be processed by AI features (matching, assistant, insights)."
                checked={settings?.ai_data_processing ?? true}
                onChange={(v) =>
                  saveSettings({ ai_data_processing: v }, "privacy")
                }
              />
              <div className="border-t pt-4 text-sm text-muted-foreground space-y-2">
                <p>
                  <span className="font-medium text-foreground">
                    Data export:
                  </span>{" "}
                  To export your data, contact support and we'll provide a copy
                  of your profile, preferences, applications, and saved jobs.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Delete account:
                  </span>{" "}
                  Permanently removes your account and all associated data.
                </p>
              </div>
              <DeleteAccount onDeleted={() => router.push("/")} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileForm({
  initial,
  saving,
  onSave,
}: {
  initial: Profile;
  saving: boolean;
  onSave: (patch: Partial<Profile>) => void;
}) {
  const [f, setF] = useState(initial);
  useEffect(() => setF(initial), [initial]);
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));
  const submit = () =>
    onSave({
      ...f,
      portfolio_url: f.portfolio_url ?? "",
      github_url: f.github_url ?? "",
      linkedin_url: f.linkedin_url ?? "",
    });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4 max-w-2xl"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Full name</Label>
          <Input
            value={f.full_name ?? ""}
            onChange={set("full_name")}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Location</Label>
          <Input
            value={f.location ?? ""}
            onChange={set("location")}
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Professional headline</Label>
          <Input
            value={f.professional_headline ?? ""}
            onChange={set("professional_headline")}
            className="mt-1"
            placeholder="e.g. Senior Frontend Engineer"
          />
        </div>
        <div>
          <Label>Portfolio URL</Label>
          <Input
            type="url"
            value={f.portfolio_url ?? ""}
            onChange={set("portfolio_url")}
            className="mt-1"
            placeholder="https://…"
          />
        </div>
        <div>
          <Label>GitHub URL</Label>
          <Input
            type="url"
            value={f.github_url ?? ""}
            onChange={set("github_url")}
            className="mt-1"
            placeholder="https://github.com/…"
          />
        </div>
        <div>
          <Label>LinkedIn URL</Label>
          <Input
            type="url"
            value={f.linkedin_url ?? ""}
            onChange={set("linkedin_url")}
            className="mt-1"
            placeholder="https://linkedin.com/in/…"
          />
        </div>
        <div>
          <Label>Phone</Label>
          <Input
            value={f.phone ?? ""}
            onChange={set("phone")}
            className="mt-1"
          />
        </div>
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

function PreferencesForm({
  initial,
  saving,
  onSave,
}: {
  initial: Preferences;
  saving: boolean;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [f, setF] = useState({
    job_titles: arrToCsv(initial.job_titles),
    skills: arrToCsv(initial.skills),
    experience_level: initial.experience_level ?? "",
    employment_type: initial.employment_type ?? [],
    salary_min: initial.salary_min?.toString() ?? "",
    salary_max: initial.salary_max?.toString() ?? "",
    salary_currency: initial.salary_currency ?? "USD",
    remote_only: initial.remote_only ?? false,
    preferred_countries: arrToCsv(initial.preferred_countries),
    preferred_locations: arrToCsv(initial.preferred_locations),
  });
  useEffect(() => {
    setF({
      job_titles: arrToCsv(initial.job_titles),
      skills: arrToCsv(initial.skills),
      experience_level: initial.experience_level ?? "",
      employment_type: initial.employment_type ?? [],
      salary_min: initial.salary_min?.toString() ?? "",
      salary_max: initial.salary_max?.toString() ?? "",
      salary_currency: initial.salary_currency ?? "USD",
      remote_only: initial.remote_only ?? false,
      preferred_countries: arrToCsv(initial.preferred_countries),
      preferred_locations: arrToCsv(initial.preferred_locations),
    });
  }, [initial]);

  function toggleEmp(t: string) {
    setF((p) => ({
      ...p,
      employment_type: p.employment_type.includes(t)
        ? p.employment_type.filter((x) => x !== t)
        : [...p.employment_type, t],
    }));
  }

  const submit = () =>
    onSave({
      job_titles: csvToArr(f.job_titles),
      skills: csvToArr(f.skills),
      experience_level: f.experience_level || undefined,
      employment_type: f.employment_type,
      salary_min: f.salary_min ? Number(f.salary_min) : null,
      salary_max: f.salary_max ? Number(f.salary_max) : null,
      salary_currency: f.salary_currency,
      remote_only: f.remote_only,
      preferred_countries: csvToArr(f.preferred_countries),
      preferred_locations: csvToArr(f.preferred_locations),
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4 max-w-2xl"
    >
      <div>
        <Label>Job titles</Label>
        <Input
          value={f.job_titles}
          onChange={(e) => setF((p) => ({ ...p, job_titles: e.target.value }))}
          className="mt-1"
          placeholder="Frontend Engineer, UI Developer"
        />
        <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
      </div>
      <div>
        <Label>Skills</Label>
        <Input
          value={f.skills}
          onChange={(e) => setF((p) => ({ ...p, skills: e.target.value }))}
          className="mt-1"
          placeholder="React, TypeScript, Node.js"
        />
        <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Experience level</Label>
          <Select
            value={f.experience_level}
            onValueChange={(v) => setF((p) => ({ ...p, experience_level: v }))}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entry">Entry</SelectItem>
              <SelectItem value="mid">Mid</SelectItem>
              <SelectItem value="senior">Senior</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="executive">Executive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox
            id="remote-only"
            checked={f.remote_only}
            onCheckedChange={(v) =>
              setF((p) => ({ ...p, remote_only: v === true }))
            }
          />
          <Label htmlFor="remote-only" className="font-normal">
            Remote only
          </Label>
        </div>
      </div>
      <div>
        <Label>Employment types</Label>
        <div className="flex flex-wrap gap-4 mt-2">
          {EMPLOYMENT_TYPES.map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <Checkbox
                id={`pref-${t}`}
                checked={f.employment_type.includes(t)}
                onCheckedChange={() => toggleEmp(t)}
              />
              <Label
                htmlFor={`pref-${t}`}
                className="font-normal text-sm capitalize"
              >
                {t.replace(/_/g, " ")}
              </Label>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Min salary</Label>
          <Input
            type="number"
            min={0}
            value={f.salary_min}
            onChange={(e) =>
              setF((p) => ({ ...p, salary_min: e.target.value }))
            }
            className="mt-1"
          />
        </div>
        <div>
          <Label>Max salary</Label>
          <Input
            type="number"
            min={0}
            value={f.salary_max}
            onChange={(e) =>
              setF((p) => ({ ...p, salary_max: e.target.value }))
            }
            className="mt-1"
          />
        </div>
        <div>
          <Label>Currency</Label>
          <Select
            value={f.salary_currency}
            onValueChange={(v) => setF((p) => ({ ...p, salary_currency: v }))}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Preferred countries</Label>
          <Input
            value={f.preferred_countries}
            onChange={(e) =>
              setF((p) => ({ ...p, preferred_countries: e.target.value }))
            }
            className="mt-1"
            placeholder="Germany, Netherlands"
          />
          <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
        </div>
        <div>
          <Label>Preferred locations</Label>
          <Input
            value={f.preferred_locations}
            onChange={(e) =>
              setF((p) => ({ ...p, preferred_locations: e.target.value }))
            }
            className="mt-1"
            placeholder="Berlin, Remote"
          />
          <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
        </div>
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}

function PasswordForm() {
  const { toast } = useToast();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) {
      toast({
        title: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }
    if (pw !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pw, newPassword: confirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      toast({ title: "Password updated" });
      setPw("");
      setConfirm("");
    } catch (err) {
      toast({
        title: "Password change failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-sm">
      <h3 className="text-sm font-semibold">Change password</h3>
      <div>
        <Label>New password</Label>
        <Input
          type="password"
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Confirm new password</Label>
        <Input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1"
        />
      </div>
      <Button type="submit" variant="outline" disabled={saving}>
        {saving ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}

function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function del() {
    setDeleting(true);
    try {
      await apiFetch("/api/account", { method: "DELETE" });
      toast({ title: "Account deleted" });
      onDeleted();
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
      setDeleting(false);
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => {
          setConfirmText("");
          setOpen(true);
        }}
      >
        Delete account
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account permanently?</DialogTitle>
            <DialogDescription>
              This removes your profile, resumes, applications, saved jobs, and
              alerts. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Type DELETE to confirm</Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-1"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== "DELETE" || deleting}
              onClick={del}
            >
              {deleting ? "Deleting…" : "Delete my account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SettingSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
