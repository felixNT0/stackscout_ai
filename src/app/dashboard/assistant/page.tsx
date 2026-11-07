"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  MessageSquare,
  Plus,
  Send,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

const SUGGESTED_PROMPTS = [
  "Which jobs are best for my profile?",
  "What skills am I missing?",
  "Help me prepare for interviews",
  "Rewrite my professional summary",
];

async function apiError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.error) return String(body.error);
  } catch {
    // ignore
  }
  return `Request failed (${res.status})`;
}

export default function AssistantPage() {
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[] | null>(
    null,
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/assistant");
      if (!res.ok) throw new Error(await apiError(res));
      const json = await res.json();
      const list: Conversation[] = json.data?.conversations ?? [];
      setConversations(list);
      return list;
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to load conversations",
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setConversations([]);
      return [];
    }
  }, [toast]);

  const loadMessages = useCallback(async (id: string) => {
    setMessages(null);
    try {
      const res = await fetch(`/api/ai/conversations/${id}`);
      if (!res.ok) throw new Error(await apiError(res));
      const json = await res.json();
      setMessages(json.data?.messages ?? []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to load messages",
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setMessages([]);
    }
  }, [toast]);

  useEffect(() => {
    loadConversations().then((list) => {
      if (list.length > 0) {
        setActiveId(list[0].id);
      } else {
        setMessages([]);
      }
    });
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function selectConversation(id: string) {
    if (id === activeId) return;
    setActiveId(id);
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setInput("");
  }

  async function sendMessage(text?: string) {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput("");
    setSending(true);

    // Optimistically append the user message
    const optimistic: Message = {
      id: `local-${Date.now()}`,
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...(prev ?? []), optimistic]);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          ...(activeId ? { conversation_id: activeId } : {}),
        }),
      });
      if (!res.ok) throw new Error(await apiError(res));
      const json = await res.json();
      const reply: string = json.data?.reply ?? "";
      const convId: string | undefined = json.data?.conversation_id;

      const assistantMsg: Message = {
        id: `local-reply-${Date.now()}`,
        role: "assistant",
        content: reply,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...(prev ?? []), assistantMsg]);

      if (convId && convId !== activeId) {
        setActiveId(convId);
        await loadConversations();
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Message failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const activeTitle = conversations?.find((c) => c.id === activeId)?.title;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold mb-1">AI Career Assistant</h1>
          <p className="text-muted-foreground">
            Chat with your AI assistant. It uses your confirmed profile —{" "}
            <Link href="/dashboard/resume" className="text-primary hover:underline">
              review it on the resume page
            </Link>
            .
          </p>
        </div>
        <Button variant="outline" onClick={newChat}>
          <Plus className="mr-2 h-4 w-4" />
          New chat
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Conversation list — desktop sidebar */}
        <Card className="hidden lg:flex lg:flex-col lg:w-64 shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[60vh] space-y-1">
            {conversations === null ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No conversations yet. Start a new chat.
              </p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors truncate ${
                    conv.id === activeId
                      ? "bg-accent text-accent-foreground font-medium"
                      : "hover:bg-accent/50"
                  }`}
                  title={conv.title}
                >
                  {conv.title || "Untitled chat"}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Chat area */}
        <Card className="flex-1 flex flex-col min-h-[60vh]">
          <CardHeader className="pb-3">
            {/* Mobile conversation selector */}
            <div className="lg:hidden mb-2">
              {conversations && conversations.length > 0 ? (
                <Select
                  value={activeId ?? ""}
                  onValueChange={selectConversation}
                >
                  <SelectTrigger aria-label="Select conversation">
                    <SelectValue placeholder="New conversation" />
                  </SelectTrigger>
                  <SelectContent>
                    {conversations.map((conv) => (
                      <SelectItem key={conv.id} value={conv.id}>
                        {conv.title || "Untitled chat"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {activeTitle || "New conversation"}
            </CardTitle>
            <CardDescription>
              Ask about jobs, skills, resumes, or career strategy.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[50vh] min-h-[200px]">
              {messages === null ? (
                <div className="space-y-3">
                  {[0, 1].map((i) => (
                    <Skeleton key={i} className="h-16 w-3/4" />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="py-8 text-center">
                  <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">
                    Ask me anything about your job search or career.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        disabled={sending}
                        className="text-xs px-3 py-1.5 rounded-full border hover:bg-accent transition-colors disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-xs opacity-70">
                          {msg.role === "user" ? (
                            <User className="h-3 w-3" />
                          ) : (
                            <MessageSquare className="h-3 w-3" />
                          )}
                          {msg.role === "user" ? "You" : "Assistant"}
                        </div>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="bg-card border rounded-lg px-4 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Assistant is typing…
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggested prompts when messages exist */}
            {messages !== null && messages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {SUGGESTED_PROMPTS.slice(0, 2).map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    disabled={sending}
                    className="text-xs px-3 py-1 rounded-full border hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="mt-4 space-y-2">
              <Label htmlFor="chat-input" className="sr-only">
                Message
              </Label>
              <div className="flex gap-2 items-end">
                <Textarea
                  id="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Type your message… (Enter to send, Shift+Enter for newline)"
                  rows={2}
                  disabled={sending}
                  className="resize-none"
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={sending || !input.trim()}
                  size="icon"
                  aria-label="Send message"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
