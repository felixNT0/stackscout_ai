"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Download, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ResumeSection {
    id: string;
    type: "experience" | "education" | "skills" | "summary";
    title: string;
    content: string;
    items?: string[];
}

interface ResumeData {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    website: string;
    summary: string;
    sections: ResumeSection[];
    template: string;
}

const TEMPLATES = [
    { id: "modern", name: "Modern", description: "Clean, contemporary" },
    { id: "classic", name: "Classic", description: "Traditional, professional" },
    { id: "minimal", name: "Minimal", description: "Simple, clean" },
    { id: "creative", name: "Creative", description: "Bold, unique" },
];

export function ResumeBuilder() {
    const { toast } = useToast();
    const [resume, setResume] = useState<ResumeData>({
        name: "",
        email: "",
        phone: "",
        location: "",
        linkedin: "",
        website: "",
        summary: "",
        sections: [],
        template: "modern",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function loadResume() {
            try {
                const res = await fetch("/api/resumes");
                const data = await res.json();
                if (data.data?.resumes?.length > 0) {
                    const latest = data.data.resumes[0];
                    setResume({
                        name: latest.name ?? "",
                        email: latest.email ?? "",
                        phone: latest.phone ?? "",
                        location: latest.location ?? "",
                        linkedin: latest.linkedin ?? "",
                        website: latest.website ?? "",
                        summary: latest.summary ?? "",
                        sections: latest.sections ?? [],
                        template: latest.template ?? "modern",
                    });
                }
            } catch (err) {
                console.error("Failed to load resume:", err);
            } finally {
                setLoading(false);
            }
        }
        loadResume();
    }, []);

    async function saveResume() {
        setSaving(true);
        try {
            const res = await fetch("/api/resumes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(resume),
            });

            if (!res.ok) throw new Error("Failed to save");

            toast({ title: "Resume saved!" });
        } catch (err) {
            toast({
                title: "Failed to save",
                description: err instanceof Error ? err.message : "Please try again",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    }

    async function downloadPdf() {
        try {
            const res = await fetch("/api/resumes/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(resume),
            });

            if (!res.ok) throw new Error("Failed to generate PDF");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${resume.name || "resume"}.pdf`;
            a.click();
            URL.revokeObjectURL(url);

            toast({ title: "PDF downloaded!" });
        } catch (err) {
            toast({
                title: "Failed to download",
                description: err instanceof Error ? err.message : "Please try again",
                variant: "destructive",
            });
        }
    }

    function addSection(type: ResumeSection["type"]) {
        const newSection: ResumeSection = {
            id: crypto.randomUUID(),
            type,
            title: type === "experience" ? "Work Experience" : type === "education" ? "Education" : type === "skills" ? "Skills" : "Summary",
            content: "",
            items: [],
        };
        setResume({ ...resume, sections: [...resume.sections, newSection] });
    }

    function removeSection(id: string) {
        setResume({ ...resume, sections: resume.sections.filter((s) => s.id !== id) });
    }

    function updateSection(id: string, updates: Partial<ResumeSection>) {
        setResume({
            ...resume,
            sections: resume.sections.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        });
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Template Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>Template</CardTitle>
                    <CardDescription>Choose a resume template style</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                        {TEMPLATES.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => setResume({ ...resume, template: template.id })}
                                className={cn(
                                    "p-4 rounded-lg border-2 transition-colors text-left",
                                    resume.template === template.id
                                        ? "border-primary bg-primary/5"
                                        : "border-muted hover:border-primary/50",
                                )}
                            >
                                <div className="font-medium">{template.name}</div>
                                <div className="text-xs text-muted-foreground">{template.description}</div>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Personal Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                value={resume.name}
                                onChange={(e) => setResume({ ...resume, name: e.target.value })}
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={resume.email}
                                onChange={(e) => setResume({ ...resume, email: e.target.value })}
                                placeholder="john@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={resume.phone}
                                onChange={(e) => setResume({ ...resume, phone: e.target.value })}
                                placeholder="+1 (555) 123-4567"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                value={resume.location}
                                onChange={(e) => setResume({ ...resume, location: e.target.value })}
                                placeholder="San Francisco, CA"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="linkedin">LinkedIn</Label>
                            <Input
                                id="linkedin"
                                value={resume.linkedin}
                                onChange={(e) => setResume({ ...resume, linkedin: e.target.value })}
                                placeholder="linkedin.com/in/johndoe"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <Input
                                id="website"
                                value={resume.website}
                                onChange={(e) => setResume({ ...resume, website: e.target.value })}
                                placeholder="johndoe.dev"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Professional Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={resume.summary}
                        onChange={(e) => setResume({ ...resume, summary: e.target.value })}
                        placeholder="Write a brief summary of your professional background..."
                        rows={4}
                    />
                </CardContent>
            </Card>

            {/* Sections */}
            <Card>
                <CardHeader>
                    <CardTitle>Sections</CardTitle>
                    <CardDescription>Add experience, education, skills, and more</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {resume.sections.map((section) => (
                        <div key={section.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <Badge variant="secondary">{section.type}</Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeSection(section.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Content</Label>
                                <Textarea
                                    value={section.content}
                                    onChange={(e) => updateSection(section.id, { content: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            {section.items && (
                                <div className="space-y-2">
                                    <Label>Items (one per line)</Label>
                                    <Textarea
                                        value={section.items.join("\n")}
                                        onChange={(e) =>
                                            updateSection(section.id, {
                                                items: e.target.value.split("\n").filter(Boolean),
                                            })
                                        }
                                        rows={3}
                                    />
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => addSection("experience")}>
                            <Plus className="h-4 w-4 mr-2" />
                            Experience
                        </Button>
                        <Button variant="outline" onClick={() => addSection("education")}>
                            <Plus className="h-4 w-4 mr-2" />
                            Education
                        </Button>
                        <Button variant="outline" onClick={() => addSection("skills")}>
                            <Plus className="h-4 w-4 mr-2" />
                            Skills
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
                <Button onClick={() => void saveResume()} disabled={saving}>
                    {saving ? "Saving..." : "Save Resume"}
                </Button>
                <Button variant="outline" onClick={() => void downloadPdf()}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                </Button>
            </div>
        </div>
    );
}
