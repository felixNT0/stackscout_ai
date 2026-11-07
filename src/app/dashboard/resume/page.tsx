"use client";

import {
  Briefcase,
  GraduationCap,
  Loader2,
  Rocket,
  Sparkles,
  Trash2,
  Upload,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

type ResumeStatus = "pending" | "processing" | "completed" | "failed";

interface Resume {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  status: ResumeStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  professional_headline: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  summary: string | null;
  total_years_experience: number | null;
  resume_id: string | null;
}

interface Skill {
  id: string;
  skill_name: string;
  skill_category: string | null;
  proficiency: string | null;
  years_experience: number | null;
  is_professional: boolean | null;
  evidence: string | null;
}

interface Experience {
  id: string;
  job_title: string;
  company: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean | null;
  responsibilities: string[] | null;
  achievements: string[] | null;
}

interface Education {
  id: string;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  gpa: string | number | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  technologies: string[] | null;
  url: string | null;
  start_date: string | null;
  end_date: string | null;
  is_personal: boolean | null;
}

interface ProfileBundle {
  profile: Profile | null;
  skills: Skill[];
  experiences: Experience[];
  education: Education[];
  projects: Project[];
}

const ACCEPTED_TYPES = [".pdf", ".docx", ".txt"];
const MAX_SIZE = 10 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDate(value: string | null): string {
  if (!value) return "Present";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
    });
  } catch {
    return value;
  }
}

function statusBadge(status: ResumeStatus) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "processing":
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case "completed":
      return <Badge variant="success">Completed</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
  }
}

async function apiError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.error) return String(body.error);
  } catch {
    // ignore parse errors
  }
  return `Request failed (${res.status})`;
}

export default function ResumePage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resumes, setResumes] = useState<Resume[] | null>(null);
  const [bundle, setBundle] = useState<ProfileBundle | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Resume | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadResumes = useCallback(async () => {
    try {
      const res = await fetch("/api/resumes");
      if (!res.ok) throw new Error(await apiError(res));
      const json = await res.json();
      setResumes(json.data?.resumes ?? []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to load resumes",
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setResumes([]);
    }
  }, [toast]);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/candidate-profile");
      if (!res.ok) throw new Error(await apiError(res));
      const json = await res.json();
      setBundle(json.data ?? null);
    } catch {
      // Profile is optional — leave null silently
      setBundle(null);
    }
  }, []);

  useEffect(() => {
    loadResumes();
    loadProfile();
  }, [loadResumes, loadProfile]);

  function validateFile(file: File): string | null {
    const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!ACCEPTED_TYPES.includes(ext)) {
      return "Only PDF, DOCX, and TXT files are supported.";
    }
    if (file.size > MAX_SIZE) {
      return "File must be 10 MB or smaller.";
    }
    return null;
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const error = validateFile(file);
    if (error) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: error,
      });
      return;
    }
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(await apiError(res));
      toast({ title: "Resume uploaded", description: selectedFile.name });
      setSelectedFile(null);
      await loadResumes();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleAnalyze(resume: Resume) {
    setAnalyzingId(resume.id);
    try {
      const res = await fetch(`/api/resumes/${resume.id}/analyze`, {
        method: "POST",
      });
      if (res.status === 503) {
        toast({
          variant: "destructive",
          title: "AI not configured",
          description: "AI parsing requires OPENAI_API_KEY",
        });
        return;
      }
      if (!res.ok) throw new Error(await apiError(res));
      toast({
        title: "Resume analyzed",
        description: "Your candidate profile has been updated.",
      });
      await Promise.all([loadResumes(), loadProfile()]);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/resumes/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await apiError(res));
      toast({ title: "Resume deleted", description: deleteTarget.file_name });
      setDeleteTarget(null);
      await Promise.all([loadResumes(), loadProfile()]);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Resume</h1>
        <p className="text-muted-foreground">
          Upload your resume and let AI build your candidate profile for better
          job matches.
        </p>
      </div>

      {/* Upload card */}
      <div id="upload-resume">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Resume
            </CardTitle>
            <CardDescription>
              PDF, DOCX, or TXT up to 10 MB. AI extracts your skills,
              experience, and education.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={onFileChange}
              className="hidden"
              id="resume-upload"
            />
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose file
              </Button>
              <div className="text-sm text-muted-foreground min-w-0">
                {selectedFile ? (
                  <span className="truncate">
                    {selectedFile.name}{" "}
                    <span className="text-muted-foreground/70">
                      ({formatSize(selectedFile.size)})
                    </span>
                  </span>
                ) : (
                  "No file selected"
                )}
              </div>
            </div>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Resumes list */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Resumes</CardTitle>
          <CardDescription>
            Analyze a resume to populate your candidate profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resumes === null ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : resumes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No resumes yet. Upload one above to get started.
            </p>
          ) : (
            <ul className="divide-y">
              {resumes.map((resume) => (
                <li
                  key={resume.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">
                        {resume.file_name}
                      </span>
                      {statusBadge(resume.status)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatSize(resume.file_size)} · uploaded{" "}
                      {formatDate(resume.created_at)}
                    </div>
                    {resume.status === "failed" && resume.error_message && (
                      <p className="text-xs text-destructive mt-1">
                        {resume.error_message}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {(resume.status === "pending" ||
                      resume.status === "completed") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAnalyze(resume)}
                        disabled={analyzingId !== null || uploading}
                      >
                        {analyzingId === resume.id ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Analyzing…
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-3 w-3" />
                            Analyze
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTarget(resume)}
                      disabled={deleting}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Candidate profile */}
      {bundle?.profile ? (
        <CandidateProfile bundle={bundle} onSaved={loadProfile} toast={toast} />
      ) : bundle !== null ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground space-y-3">
            <p>
              Upload a resume and run analysis to build your candidate profile.
            </p>
            <Link
              href="#upload-resume"
              className="text-primary hover:underline text-sm"
            >
              Go to upload
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {/* Delete confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete resume?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-medium">{deleteTarget?.file_name}</span>.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ToastFn = ReturnType<typeof useToast>["toast"];

function CandidateProfile({
  bundle,
  onSaved,
  toast,
}: {
  bundle: ProfileBundle;
  onSaved: () => Promise<void>;
  toast: ToastFn;
}) {
  const profile = bundle.profile as Profile;
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    professional_headline: profile.professional_headline ?? "",
    location: profile.location ?? "",
    portfolio_url: profile.portfolio_url ?? "",
    github_url: profile.github_url ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    summary: profile.summary ?? "",
    total_years_experience:
      profile.total_years_experience != null
        ? String(profile.total_years_experience)
        : "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      full_name: profile.full_name ?? "",
      professional_headline: profile.professional_headline ?? "",
      location: profile.location ?? "",
      portfolio_url: profile.portfolio_url ?? "",
      github_url: profile.github_url ?? "",
      linkedin_url: profile.linkedin_url ?? "",
      summary: profile.summary ?? "",
      total_years_experience:
        profile.total_years_experience != null
          ? String(profile.total_years_experience)
          : "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const years = form.total_years_experience.trim();
      const res = await fetch("/api/candidate-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          professional_headline: form.professional_headline,
          location: form.location,
          portfolio_url: form.portfolio_url,
          github_url: form.github_url,
          linkedin_url: form.linkedin_url,
          summary: form.summary,
          ...(years !== "" ? { total_years_experience: Number(years) } : {}),
        }),
      });
      if (!res.ok) throw new Error(await apiError(res));
      toast({ title: "Profile saved" });
      await onSaved();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  }

  const skillGroups = bundle.skills.reduce<Record<string, Skill[]>>(
    (acc, skill) => {
      const key = skill.skill_category || "General";
      (acc[key] ??= []).push(skill);
      return acc;
    },
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Candidate Profile</CardTitle>
        <CardDescription>
          Built from your resume analysis. Edit profile details below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profile">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="skills">
              Skills ({bundle.skills.length})
            </TabsTrigger>
            <TabsTrigger value="experience">
              Experience ({bundle.experiences.length})
            </TabsTrigger>
            <TabsTrigger value="education">
              Education ({bundle.education.length})
            </TabsTrigger>
            <TabsTrigger value="projects">
              Projects ({bundle.projects.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 pt-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="headline">Professional headline</Label>
                <Input
                  id="headline"
                  value={form.professional_headline}
                  onChange={(e) => set("professional_headline", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="years">Years of experience</Label>
                <Input
                  id="years"
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.total_years_experience}
                  onChange={(e) =>
                    set("total_years_experience", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolio">Portfolio URL</Label>
                <Input
                  id="portfolio"
                  type="url"
                  placeholder="https://…"
                  value={form.portfolio_url}
                  onChange={(e) => set("portfolio_url", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github">GitHub URL</Label>
                <Input
                  id="github"
                  type="url"
                  placeholder="https://github.com/…"
                  value={form.github_url}
                  onChange={(e) => set("github_url", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/…"
                  value={form.linkedin_url}
                  onChange={(e) => set("linkedin_url", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  rows={5}
                  value={form.summary}
                  onChange={(e) => set("summary", e.target.value)}
                />
              </div>
            </div>
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save profile"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="skills" className="space-y-4 pt-4">
            {bundle.skills.length === 0 ? (
              <Empty label="No skills extracted yet." />
            ) : (
              Object.entries(skillGroups).map(([category, skills]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    {category}
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {skills.map((skill) => (
                      <div
                        key={skill.id}
                        className="flex items-center justify-between gap-2 rounded-md border p-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">
                            {skill.skill_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {skill.proficiency ?? "—"}
                            {skill.years_experience != null &&
                              ` · ${skill.years_experience} yrs`}
                          </div>
                        </div>
                        <Badge
                          variant={
                            skill.is_professional ? "success" : "secondary"
                          }
                          className="shrink-0"
                        >
                          {skill.is_professional ? "Professional" : "Listed"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="experience" className="space-y-4 pt-4">
            {bundle.experiences.length === 0 ? (
              <Empty label="No work experience extracted yet." />
            ) : (
              bundle.experiences.map((exp) => (
                <div key={exp.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        {exp.job_title}
                        {exp.is_current && (
                          <Badge variant="success">Current</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {exp.company}
                        {exp.location ? ` · ${exp.location}` : ""} ·{" "}
                        {formatDate(exp.start_date)} –{" "}
                        {exp.is_current ? "Present" : formatDate(exp.end_date)}
                      </div>
                    </div>
                  </div>
                  {exp.responsibilities && exp.responsibilities.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                        Responsibilities
                      </div>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {exp.responsibilities.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {exp.achievements && exp.achievements.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                        Achievements
                      </div>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {exp.achievements.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="education" className="space-y-3 pt-4">
            {bundle.education.length === 0 ? (
              <Empty label="No education extracted yet." />
            ) : (
              bundle.education.map((edu) => (
                <div
                  key={edu.id}
                  className="rounded-lg border p-4 flex items-start gap-3"
                >
                  <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">{edu.institution}</div>
                    <div className="text-sm text-muted-foreground">
                      {[edu.degree, edu.field_of_study]
                        .filter(Boolean)
                        .join(", ")}
                      {edu.gpa != null && ` · GPA ${edu.gpa}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(edu.start_date)} – {formatDate(edu.end_date)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="projects" className="space-y-3 pt-4">
            {bundle.projects.length === 0 ? (
              <Empty label="No projects extracted yet." />
            ) : (
              bundle.projects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-lg border p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="font-medium flex items-center gap-2">
                      <Rocket className="h-4 w-4 text-muted-foreground" />
                      {project.name}
                      {project.is_personal && (
                        <Badge variant="secondary">Personal</Badge>
                      )}
                    </div>
                    {project.url && (
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        View project
                      </a>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.technologies.map((tech) => (
                        <Badge key={tech} variant="outline">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {(project.start_date || project.end_date) && (
                    <div className="text-xs text-muted-foreground">
                      {formatDate(project.start_date)} –{" "}
                      {formatDate(project.end_date)}
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="py-6 text-center text-sm text-muted-foreground">
      {label}
      <div className="mt-2">
        <Link href="#upload-resume" className="text-primary hover:underline">
          Upload a resume to build your profile
        </Link>
      </div>
    </div>
  );
}
