import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Globe, MapPin, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "Shared Profile — StackScout AI",
  robots: { index: false, follow: false },
};

// Share pages render per-token data at request time — allow blocking.
export const instant = false;

type ShareData =
  | {
      type: "profile";
      shared_by: string;
      profile: {
        full_name: string | null;
        professional_headline: string | null;
        location: string | null;
        portfolio_url: string | null;
        github_url: string | null;
        linkedin_url: string | null;
      } | null;
      candidate: {
        full_name: string | null;
        professional_headline: string | null;
        summary: string | null;
        total_years_experience: number | null;
        location: string | null;
        skills: { skill_name: string; proficiency: string; years_experience: number | null }[];
        experiences: {
          job_title: string;
          company: string;
          start_date: string | null;
          end_date: string | null;
          is_current: boolean;
        }[];
      } | null;
    }
  | {
      type: "matches";
      shared_by: string;
      matches: {
        compatibility_score: number;
        job: {
          title: string;
          company: string;
          location: string | null;
          remote_status: string | null;
          salary_min: number | null;
          salary_max: number | null;
          salary_currency: string | null;
        };
      }[];
    }
  | {
      type: "application";
      shared_by: string;
      application: {
        status: string;
        application_date: string | null;
        notes: string | null;
        job: {
          title: string;
          company: string;
          location: string | null;
          remote_status: string | null;
          employment_type: string | null;
          salary_min: number | null;
          salary_max: number | null;
          salary_currency: string | null;
          source_name: string;
        };
      };
    };

async function getShareData(token: string): Promise<ShareData | null> {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/share/${token}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as ShareData;
  } catch {
    return null;
  }
}

function salary(min: number | null, max: number | null, currency: string | null) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `${currency ?? ""} ${(n / 1000).toFixed(0)}k` : `${currency ?? ""} ${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  return min ? `From ${fmt(min)}` : `Up to ${fmt(max!)}`;
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  const data = await getShareData(token);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-xl font-bold mb-2">Link unavailable</h1>
            <p className="text-muted-foreground text-sm">
              This share link may have expired, been revoked, or never existed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            StackScout AI
          </Link>
          <Badge variant="secondary">Shared via StackScout</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <p className="text-sm text-muted-foreground mb-6">
          Shared by <span className="font-medium text-foreground">{data.shared_by}</span>
        </p>

        {data.type === "profile" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">
                  {data.profile?.full_name ?? data.candidate?.full_name ?? "Candidate"}
                </CardTitle>
                <p className="text-muted-foreground">
                  {data.profile?.professional_headline ?? data.candidate?.professional_headline}
                </p>
                {data.profile?.location && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {data.profile.location}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {data.candidate?.summary && (
                  <p className="text-sm whitespace-pre-wrap">{data.candidate.summary}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {data.candidate?.skills.slice(0, 15).map((s) => (
                    <Badge key={s.skill_name} variant="outline">
                      {s.skill_name}
                    </Badge>
                  ))}
                </div>
                {data.candidate && data.candidate.experiences.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Experience</h3>
                    <div className="space-y-3">
                      {data.candidate.experiences.map((e, i) => (
                        <div key={i} className="text-sm">
                          <p className="font-medium">{e.job_title} · {e.company}</p>
                          <p className="text-muted-foreground text-xs">
                            {e.start_date ? new Date(e.start_date).getFullYear() : ""}
                            {" – "}
                            {e.is_current ? "Present" : e.end_date ? new Date(e.end_date).getFullYear() : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  {data.profile?.linkedin_url && (
                    <a href={data.profile.linkedin_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">LinkedIn</a>
                  )}
                  {data.profile?.github_url && (
                    <a href={data.profile.github_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">GitHub</a>
                  )}
                  {data.profile?.portfolio_url && (
                    <a href={data.profile.portfolio_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">Portfolio</a>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {data.type === "matches" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" /> Top Job Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.matches.map((m, i) => (
                  <div key={i} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{m.job.title}</p>
                        <p className="text-sm text-muted-foreground">{m.job.company}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {m.job.location ?? "Location TBD"}
                          {m.job.remote_status === "remote" && " · Remote"}
                          {salary(m.job.salary_min, m.job.salary_max, m.job.salary_currency) &&
                            ` · ${salary(m.job.salary_min, m.job.salary_max, m.job.salary_currency)}`}
                        </p>
                      </div>
                      <Badge>{m.compatibility_score}% match</Badge>
                    </div>
                  </div>
                ))}
                {data.matches.length === 0 && (
                  <p className="text-sm text-muted-foreground">No matches to share yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {data.type === "application" && (
          <Card>
            <CardHeader>
              <CardTitle>{data.application.job.title}</CardTitle>
              <p className="text-muted-foreground">{data.application.job.company}</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge>{data.application.status.replace(/_/g, " ")}</Badge>
                {data.application.job.remote_status === "remote" && <Badge variant="secondary">Remote</Badge>}
                {data.application.job.employment_type && <Badge variant="secondary">{data.application.job.employment_type}</Badge>}
              </div>
              {salary(data.application.job.salary_min, data.application.job.salary_max, data.application.job.salary_currency) && (
                <p className="text-muted-foreground">
                  Salary: {salary(data.application.job.salary_min, data.application.job.salary_max, data.application.job.salary_currency)}
                </p>
              )}
              {data.application.notes && (
                <div>
                  <h4 className="font-medium text-xs text-muted-foreground mb-1">Notes</h4>
                  <p className="whitespace-pre-wrap">{data.application.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          Powered by{" "}
          <Link href="/" className="text-primary hover:underline">
            StackScout AI
          </Link>{" "}
          — AI-powered job discovery
        </p>
      </main>
    </div>
  );
}
