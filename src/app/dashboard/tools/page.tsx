"use client";

import { MarkdownText } from "@/components/markdown-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
    Award,
    Briefcase,
    Calculator,
    Copy,
    FileText,
    GitBranch,
    Loader2,
    MessageSquare,
    Target,
    TrendingUp,
} from "lucide-react";
import { useState } from "react";

type ToolAction =
    | "resume-score"
    | "skill-gaps"
    | "mock-interview"
    | "evaluate-answer"
    | "salary-negotiation"
    | "predict-questions"
    | "cover-letter-variants"
    | "follow-up-email"
    | "career-path"
    | "portfolio-suggestions";

const TOOLS = [
    { id: "resume-score", name: "Resume Score", icon: Award, description: "Score your resume against a job" },
    { id: "skill-gaps", name: "Skill Gaps", icon: Target, description: "Find missing skills + resources" },
    { id: "mock-interview", name: "Mock Interview", icon: MessageSquare, description: "Practice with AI feedback" },
    { id: "evaluate-answer", name: "Evaluate Answer", icon: FileText, description: "Get feedback on your answer" },
    { id: "salary-negotiation", name: "Salary Negotiation", icon: Calculator, description: "Scripts + market data" },
    { id: "predict-questions", name: "Predict Questions", icon: TrendingUp, description: "Likely interview questions" },
    { id: "cover-letter-variants", name: "Cover Letters", icon: FileText, description: "4 different styles" },
    { id: "follow-up-email", name: "Follow-up Email", icon: MessageSquare, description: "Professional follow-ups" },
    { id: "career-path", name: "Career Path", icon: GitBranch, description: "Next steps + recommendations" },
    { id: "portfolio-suggestions", name: "Portfolio Ideas", icon: Briefcase, description: "Projects to showcase skills" },
] as const;

export default function AIToolsPage() {
    const { toast } = useToast();
    const [selectedTool, setSelectedTool] = useState<ToolAction | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<Record<string, unknown> | null>(null);
    const [jobId, setJobId] = useState("");
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [context, setContext] = useState<"application" | "interview" | "offer" | "rejection">("application");
    const [interviewerName, setInterviewerName] = useState("");
    const [daysSinceContact, setDaysSinceContact] = useState("7");
    const [currentSalary, setCurrentSalary] = useState("");
    const [targetSalary, setTargetSalary] = useState("");
    const [questionType, setQuestionType] = useState<"technical" | "behavioral" | "mixed">("mixed");
    const [targetRoles, setTargetRoles] = useState("");
    const [existingProjects, setExistingProjects] = useState("");

    async function runTool() {
        if (!selectedTool) return;
        setLoading(true);
        setResult(null);

        try {
            const body: Record<string, unknown> = { action: selectedTool };
            if (jobId) body.job_id = jobId;
            if (question) body.question = question;
            if (answer) body.answer = answer;
            if (context) body.context = context;
            if (interviewerName) body.interviewer_name = interviewerName;
            if (daysSinceContact) body.days_since_contact = parseInt(daysSinceContact);
            if (currentSalary) body.current_salary = parseInt(currentSalary);
            if (targetSalary) body.target_salary = parseInt(targetSalary);
            if (questionType) body.question_type = questionType;
            if (targetRoles) body.target_roles = targetRoles.split(",").map((r) => r.trim());
            if (existingProjects) body.existing_projects = existingProjects.split(",").map((p) => p.trim());

            // AI calls can take 30-60s on large structured outputs — allow up to 120s
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 120_000);
            let res: Response;
            try {
                res = await fetch("/api/ai/tools", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });
            } finally {
                clearTimeout(timer);
            }

            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Failed");

            setResult(data.data.result);
        } catch (err) {
            const isTimeout = err instanceof DOMException && err.name === "AbortError";
            toast({
                title: isTimeout ? "Request timed out" : "Tool failed",
                description: isTimeout
                    ? "The AI took too long to respond. Try again — simpler inputs are faster."
                    : err instanceof Error ? err.message : "Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard" });
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">AI Career Tools</h1>
                <p className="text-muted-foreground text-sm">
                    Powered by AI to help you land your dream job
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {TOOLS.map((tool) => (
                    <Card
                        key={tool.id}
                        className={`cursor-pointer transition-colors hover:border-primary ${selectedTool === tool.id ? "border-primary" : ""}`}
                        onClick={() => setSelectedTool(tool.id as ToolAction)}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <tool.icon className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">{tool.name}</CardTitle>
                            </div>
                            <CardDescription>{tool.description}</CardDescription>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            {selectedTool && (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {TOOLS.find((t) => t.id === selectedTool)?.name}
                        </CardTitle>
                        <CardDescription>
                            {TOOLS.find((t) => t.id === selectedTool)?.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Job ID input for job-specific tools */}
                        {[
                            "resume-score", "skill-gaps", "mock-interview", "salary-negotiation",
                            "predict-questions", "cover-letter-variants", "follow-up-email",
                        ].includes(selectedTool) && (
                            <div className="space-y-2">
                                <Label htmlFor="jobId">Job ID (optional)</Label>
                                <Input
                                    id="jobId"
                                    placeholder="Paste job ID for job-specific analysis"
                                    value={jobId}
                                    onChange={(e) => setJobId(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Evaluate answer specific fields */}
                        {selectedTool === "evaluate-answer" && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="question">Interview Question</Label>
                                    <Textarea
                                        id="question"
                                        placeholder="What was the question?"
                                        value={question}
                                        onChange={(e) => setQuestion(e.target.value)}
                                        rows={2}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="answer">Your Answer</Label>
                                    <Textarea
                                        id="answer"
                                        placeholder="What did you answer?"
                                        value={answer}
                                        onChange={(e) => setAnswer(e.target.value)}
                                        rows={4}
                                    />
                                </div>
                            </>
                        )}

                        {/* Salary negotiation fields */}
                        {selectedTool === "salary-negotiation" && (
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="currentSalary">Current Salary</Label>
                                    <Input
                                        id="currentSalary"
                                        type="number"
                                        placeholder="e.g. 80000"
                                        value={currentSalary}
                                        onChange={(e) => setCurrentSalary(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="targetSalary">Target Salary</Label>
                                    <Input
                                        id="targetSalary"
                                        type="number"
                                        placeholder="e.g. 100000"
                                        value={targetSalary}
                                        onChange={(e) => setTargetSalary(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Follow-up email fields */}
                        {selectedTool === "follow-up-email" && (
                            <>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="context">Context</Label>
                                        <Select value={context} onValueChange={(v) => setContext(v as typeof context)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="application">Application Follow-up</SelectItem>
                                                <SelectItem value="interview">Post-Interview Thank You</SelectItem>
                                                <SelectItem value="offer">Offer Negotiation</SelectItem>
                                                <SelectItem value="rejection">Rejection Response</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="interviewerName">Interviewer Name</Label>
                                        <Input
                                            id="interviewerName"
                                            placeholder="e.g. John Smith"
                                            value={interviewerName}
                                            onChange={(e) => setInterviewerName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="daysSince">Days Since Contact</Label>
                                    <Input
                                        id="daysSince"
                                        type="number"
                                        value={daysSinceContact}
                                        onChange={(e) => setDaysSinceContact(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        {/* Mock interview question type */}
                        {selectedTool === "mock-interview" && (
                            <div className="space-y-2">
                                <Label htmlFor="questionType">Question Type</Label>
                                <Select value={questionType} onValueChange={(v) => setQuestionType(v as typeof questionType)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mixed">Mixed (Technical + Behavioral)</SelectItem>
                                        <SelectItem value="technical">Technical Only</SelectItem>
                                        <SelectItem value="behavioral">Behavioral Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Career path fields */}
                        {selectedTool === "career-path" && (
                            <div className="space-y-2">
                                <Label htmlFor="targetRoles">Target Industry/Role (optional)</Label>
                                <Input
                                    id="targetRoles"
                                    placeholder="e.g. fintech, healthcare"
                                    value={targetRoles}
                                    onChange={(e) => setTargetRoles(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Portfolio fields */}
                        {selectedTool === "portfolio-suggestions" && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="targetRoles">Target Roles</Label>
                                    <Input
                                        id="targetRoles"
                                        placeholder="e.g. frontend developer, full stack"
                                        value={targetRoles}
                                        onChange={(e) => setTargetRoles(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="existingProjects">Existing Projects</Label>
                                    <Input
                                        id="existingProjects"
                                        placeholder="e.g. personal blog, open source"
                                        value={existingProjects}
                                        onChange={(e) => setExistingProjects(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        <Button onClick={() => void runTool()} disabled={loading} className="w-full">
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    AI is thinking… (can take up to a minute)
                                </>
                            ) : (
                                "Run Analysis"
                            )}
                        </Button>

                        {result && (
                            <div className="mt-4 space-y-4">
                                <ResultDisplay result={result} onCopy={copyToClipboard} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function ResultDisplay({
    result,
    onCopy,
}: {
    result: Record<string, unknown>;
    onCopy: (text: string) => void;
}) {
    const entries = Object.entries(result);

    return (
        <div className="space-y-4">
            {entries.map(([key, value]) => {
                const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

                if (typeof value === "string") {
                    return (
                        <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="font-semibold">{label}</Label>
                                <Button variant="ghost" size="sm" onClick={() => onCopy(value)}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                            <div className="rounded-lg bg-muted p-4 text-sm">
                                <MarkdownText text={value} />
                            </div>
                        </div>
                    );
                }

                if (typeof value === "number" || typeof value === "boolean") {
                    return (
                        <div key={key} className="space-y-1">
                            <Label className="font-semibold">{label}</Label>
                            <div className="rounded-lg bg-muted px-4 py-3">
                                {typeof value === "boolean" ? (
                                    <span className={value ? "text-green-600 font-medium" : "text-muted-foreground"}>
                                        {value ? "Yes" : "No"}
                                    </span>
                                ) : Number.isInteger(value) && value <= 100 && value >= 0 ? (
                                    <span className={`text-3xl font-bold ${
                                        value >= 70 ? "text-green-600" : value >= 40 ? "text-amber-600" : "text-red-600"
                                    }`}>
                                        {value}
                                        <span className="text-sm font-normal text-muted-foreground">/100</span>
                                    </span>
                                ) : (
                                    <span className="text-lg font-semibold">{value}</span>
                                )}
                            </div>
                        </div>
                    );
                }

                if (Array.isArray(value)) {
                    return (
                        <div key={key} className="space-y-2">
                            <Label className="font-semibold">{label}</Label>
                            <div className="space-y-2">
                                {value.map((item, i) => (
                                    <div key={i} className="rounded-lg bg-muted p-3 text-sm">
                                        {typeof item === "string" ? item : JSON.stringify(item)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                }

                if (typeof value === "object" && value !== null) {
                    const obj = value as Record<string, unknown>;
                    const isFlat = Object.values(obj).every(
                        (v) => v === null || ["string", "number", "boolean"].includes(typeof v),
                    );
                    return (
                        <div key={key} className="space-y-2">
                            <Label className="font-semibold">{label}</Label>
                            {isFlat ? (
                                <div className="rounded-lg bg-muted divide-y">
                                    {Object.entries(obj).map(([k, v]) => (
                                        <div key={k} className="flex items-center justify-between px-4 py-2 text-sm">
                                            <span className="text-muted-foreground capitalize">
                                                {k.replace(/_/g, " ")}
                                            </span>
                                            <span className="font-medium">
                                                {typeof v === "number" && Number.isInteger(v) && v <= 100 && v >= 0 ? (
                                                    <span className={v >= 70 ? "text-green-600" : v >= 40 ? "text-amber-600" : "text-red-600"}>
                                                        {v}/100
                                                    </span>
                                                ) : String(v ?? "—")}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-lg bg-muted p-4 text-sm">
                                    <pre className="whitespace-pre-wrap">
                                        {JSON.stringify(value, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}
