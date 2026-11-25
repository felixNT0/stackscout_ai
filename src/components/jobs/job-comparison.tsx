"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ExternalLink, GitCompare, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Job {
    id: string;
    title: string;
    company: string;
    location: string | null;
    description: string | null;
    application_url: string;
    source_name: string;
    salary_min: number | null;
    salary_max: number | null;
    salary_currency: string | null;
    salary_period: string | null;
    remote_status: string | null;
    employment_type: string | null;
    experience_level: string | null;
    published_at: string | null;
    required_skills: string[];
    preferred_skills: string[];
}

interface ComparisonJob extends Job {
    match_score?: number;
}

export function JobComparison() {
    const { toast } = useToast();
    const [jobs, setJobs] = useState<ComparisonJob[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load comparison jobs from localStorage
        const saved = localStorage.getItem("job_comparison");
        if (saved) {
            try {
                const jobIds = JSON.parse(saved) as string[];
                async function loadJobs() {
                    try {
                        const results = await Promise.all(
                            jobIds.map(async (id) => {
                                const res = await fetch(`/api/jobs/${id}`);
                                if (!res.ok) return null;
                                const data = await res.json();
                                return data.data?.job ?? null;
                            }),
                        );
                        setJobs(results.filter(Boolean));
                    } catch {
                        toast({
                            title: "Failed to load jobs",
                            description: "Could not load comparison jobs",
                            variant: "destructive",
                        });
                    } finally {
                        setLoading(false);
                    }
                }
                loadJobs();
            } catch {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, [toast]);

    function removeJob(jobId: string) {
        const updated = jobs.filter((j) => j.id !== jobId);
        setJobs(updated);
        localStorage.setItem("job_comparison", JSON.stringify(updated.map((j) => j.id)));
    }

    function clearAll() {
        setJobs([]);
        localStorage.removeItem("job_comparison");
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!jobs.length) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <GitCompare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No jobs to compare</h3>
                    <p className="text-muted-foreground mb-4">
                        Add jobs to compare by clicking the compare button on job cards.
                    </p>
                    <Link href="/dashboard/search">
                        <Button>Find Jobs</Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Compare Jobs ({jobs.length})</h2>
                <Button variant="outline" onClick={clearAll} size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                </Button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="text-left p-4 border-b bg-muted/50 w-48">Feature</th>
                            {jobs.map((job) => (
                                <th key={job.id} className="text-left p-4 border-b bg-muted/50 min-w-62.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold">{job.title}</p>
                                            <p className="text-sm text-muted-foreground">{job.company}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeJob(job.id)}
                                            className="shrink-0"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <ComparisonRow label="Location">
                            {jobs.map((job) => (
                                <td key={job.id} className="p-4 border-b">
                                    {job.location ?? "Not specified"}
                                </td>
                            ))}
                        </ComparisonRow>
                        <ComparisonRow label="Remote Status">
                            {jobs.map((job) => (
                                <td key={job.id} className="p-4 border-b">
                                    <Badge variant={job.remote_status === "remote" ? "success" : "secondary"}>
                                        {job.remote_status ?? "Unknown"}
                                    </Badge>
                                </td>
                            ))}
                        </ComparisonRow>
                        <ComparisonRow label="Employment Type">
                            {jobs.map((job) => (
                                <td key={job.id} className="p-4 border-b">
                                    {job.employment_type ?? "Not specified"}
                                </td>
                            ))}
                        </ComparisonRow>
                        <ComparisonRow label="Experience Level">
                            {jobs.map((job) => (
                                <td key={job.id} className="p-4 border-b">
                                    {job.experience_level ?? "Not specified"}
                                </td>
                            ))}
                        </ComparisonRow>
                        <ComparisonRow label="Salary Range">
                            {jobs.map((job) => (
                                <td key={job.id} className="p-4 border-b">
                                    {job.salary_min && job.salary_max
                                        ? `${job.salary_currency ?? ""} ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
                                        : "Not specified"}
                                </td>
                            ))}
                        </ComparisonRow>
                        <ComparisonRow label="Published">
                            {jobs.map((job) => (
                                <td key={job.id} className="p-4 border-b">
                                    {job.published_at
                                        ? new Date(job.published_at).toLocaleDateString()
                                        : "Not specified"}
                                </td>
                            ))}
                        </ComparisonRow>
                        <ComparisonRow label="Source">
                            {jobs.map((job) => (
                                <td key={job.id} className="p-4 border-b">
                                    {job.source_name}
                                </td>
                            ))}
                        </ComparisonRow>
                        <ComparisonRow label="Required Skills">
                            {jobs.map((job) => (
                                <td key={job.id} className="p-4 border-b">
                                    <div className="flex flex-wrap gap-1">
                                        {job.required_skills.slice(0, 5).map((skill) => (
                                            <Badge key={skill} variant="outline" className="text-xs">
                                                {skill}
                                            </Badge>
                                        ))}
                                        {job.required_skills.length > 5 && (
                                            <Badge variant="outline" className="text-xs">
                                                +{job.required_skills.length - 5}
                                            </Badge>
                                        )}
                                    </div>
                                </td>
                            ))}
                        </ComparisonRow>
                        <ComparisonRow label="Match Score">
                            {jobs.map((job) => (
                                <td key={job.id} className="p-4 border-b">
                                    {job.match_score ? (
                                        <Badge variant={job.match_score >= 80 ? "success" : job.match_score >= 60 ? "warning" : "secondary"}>
                                            {job.match_score}%
                                        </Badge>
                                    ) : (
                                        "—"
                                    )}
                                </td>
                            ))}
                        </ComparisonRow>
                        <ComparisonRow label="Actions">
                            {jobs.map((job) => (
                                <td key={job.id} className="p-4 border-b">
                                    <div className="flex gap-2">
                                        <Link href={`/dashboard/jobs/${job.id}`}>
                                            <Button variant="outline" size="sm">
                                                View
                                            </Button>
                                        </Link>
                                        <a href={job.application_url} target="_blank" rel="noopener noreferrer">
                                            <Button variant="default" size="sm">
                                                <ExternalLink className="h-4 w-4 mr-1" />
                                                Apply
                                            </Button>
                                        </a>
                                    </div>
                                </td>
                            ))}
                        </ComparisonRow>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ComparisonRow({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <tr>
            <td className="p-4 border-b bg-muted/30 font-medium text-sm">{label}</td>
            {children}
        </tr>
    );
}
