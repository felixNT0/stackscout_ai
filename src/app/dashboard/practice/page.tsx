"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { CodeEvaluation, CodingProblem } from "@/lib/ai/practice";
import { Code2, Lightbulb, Play, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const TOPICS = [
  "Arrays & Hashing",
  "Two Pointers",
  "Sliding Window",
  "Stack & Queue",
  "Linked Lists",
  "Trees & Graphs",
  "Dynamic Programming",
  "Strings",
  "Sorting & Searching",
  "Greedy Algorithms",
  "Backtracking",
  "Heap / Priority Queue",
];

const LANGUAGES = ["javascript", "python", "typescript", "java", "go", "rust"];
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

type HistoryItem = {
  id: string;
  topic: string;
  difficulty: string;
  language: string;
  score: number | null;
  attempts: number;
  created_at: string;
};

export default function PracticePage() {
  const { toast } = useToast();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("medium");
  const [language, setLanguage] = useState("javascript");
  const [generating, setGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [problem, setProblem] = useState<CodingProblem | null>(null);
  const [code, setCode] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<CodeEvaluation | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/practice");
      const data = await res.json();
      if (res.ok) setHistory(data.sessions ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function generate() {
    setGenerating(true);
    setEvaluation(null);
    setProblem(null);
    setSessionId(null);
    try {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          topic: customTopic.trim() || topic,
          difficulty,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate problem");
      setSessionId(data.session_id);
      setProblem(data.problem);
      setCode(data.problem.starter_code ?? "");
      setShowHints(false);
      loadHistory();
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function evaluate() {
    if (!sessionId || !code.trim()) return;
    setEvaluating(true);
    try {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "evaluate", session_id: sessionId, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Evaluation failed");
      setEvaluation(data.evaluation);
      loadHistory();
    } catch (err) {
      toast({
        title: "Evaluation failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Code2 className="h-8 w-8" /> Coding Practice
        </h1>
        <p className="text-muted-foreground mt-1">
          AI-generated interview problems. Solve, submit, and get instant feedback.
        </p>
      </div>

      {/* Setup bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="lg:col-span-2">
              <Label>Topic</Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOPICS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Or type a custom topic…"
                className="mt-2"
              />
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d} className="capitalize">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l} className="capitalize">
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generate} disabled={generating}>
              <RefreshCw className={`h-4 w-4 mr-1 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Generating…" : "New Problem"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Problem + editor */}
      {generating ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : problem ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Problem statement */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{problem.title}</CardTitle>
                <Badge variant="outline" className="capitalize">
                  {difficulty}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm whitespace-pre-wrap">{problem.problem_statement}</p>

              {problem.examples.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Examples</h4>
                  <div className="space-y-2">
                    {problem.examples.map((ex, i) => (
                      <div key={i} className="rounded bg-muted p-2 text-xs font-mono">
                        <div><span className="text-muted-foreground">Input:</span> {ex.input}</div>
                        <div><span className="text-muted-foreground">Output:</span> {ex.output}</div>
                        {ex.explanation && (
                          <div className="text-muted-foreground mt-1">{ex.explanation}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {problem.constraints.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Constraints</h4>
                  <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                    {problem.constraints.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHints(!showHints)}
                className="text-xs"
              >
                <Lightbulb className="h-3.5 w-3.5 mr-1" />
                {showHints ? "Hide hints" : `Show ${problem.hints.length} hints`}
              </Button>
              {showHints && (
                <ul className="text-xs text-amber-600 dark:text-amber-400 list-disc list-inside space-y-1">
                  {problem.hints.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Code editor + evaluation */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Your Solution</CardTitle>
                <CardDescription className="text-xs">
                  Write your solution in {language}. AI will evaluate correctness and complexity.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="font-mono text-sm min-h-64 resize-y"
                  spellCheck={false}
                  placeholder="// Write your code here…"
                />
                <Button
                  onClick={evaluate}
                  disabled={evaluating || !code.trim()}
                  className="mt-3 w-full"
                >
                  <Send className="h-4 w-4 mr-1" />
                  {evaluating ? "Evaluating…" : "Submit for Review"}
                </Button>
              </CardContent>
            </Card>

            {/* Evaluation result */}
            {evaluation && (
              <Card className={evaluation.is_correct ? "border-green-500/50" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">AI Evaluation</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${evaluation.score >= 70 ? "text-green-600" : evaluation.score >= 40 ? "text-amber-600" : "text-red-600"}`}>
                        {evaluation.score}
                      </span>
                      <Badge variant={evaluation.is_correct ? "default" : "secondary"}>
                        {evaluation.is_correct ? "Correct" : "Needs work"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>{evaluation.feedback}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded bg-muted p-2">
                      <span className="text-muted-foreground">Time:</span>{" "}
                      <code>{evaluation.time_complexity}</code>
                    </div>
                    <div className="rounded bg-muted p-2">
                      <span className="text-muted-foreground">Space:</span>{" "}
                      <code>{evaluation.space_complexity}</code>
                    </div>
                  </div>
                  {evaluation.issues.length > 0 && (
                    <div>
                      <h5 className="font-medium text-xs text-red-600 mb-1">Issues</h5>
                      <ul className="text-xs list-disc list-inside space-y-0.5 text-muted-foreground">
                        {evaluation.issues.map((i, idx) => <li key={idx}>{i}</li>)}
                      </ul>
                    </div>
                  )}
                  {evaluation.suggestions.length > 0 && (
                    <div>
                      <h5 className="font-medium text-xs text-green-600 mb-1">Suggestions</h5>
                      <ul className="text-xs list-disc list-inside space-y-0.5 text-muted-foreground">
                        {evaluation.suggestions.map((s, idx) => <li key={idx}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Pick a topic, difficulty, and language above, then click{" "}
              <strong>New Problem</strong> to get an AI-generated coding challenge.
            </p>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Practice History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">{h.topic}</span>
                    <span className="text-muted-foreground ml-2 text-xs capitalize">
                      {h.difficulty} · {h.language} · {h.attempts} attempt{h.attempts !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {h.score !== null && (
                    <Badge variant={h.score >= 70 ? "default" : h.score >= 40 ? "secondary" : "destructive"}>
                      {h.score}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
