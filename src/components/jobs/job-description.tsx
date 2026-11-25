"use client";

import { cn } from "@/lib/utils";
import { stripHtml } from "@/services/providers/http";
import { Fragment, type ReactNode } from "react";

/**
 * Renders job descriptions that may contain:
 * - Plain text with newlines
 * - Markdown-lite syntax (**bold**, *italic*, ## headings, - bullets, [links](url), `code`)
 * - Legacy raw HTML (older ingested rows before providers stripped tags)
 *
 * No dangerouslySetInnerHTML — everything renders as React elements.
 */

const HTML_TAG_RE = /<\/?(p|div|br|li|ul|ol|h[1-6]|strong|b|em|i|a|span|section|article|blockquote|pre|code|table|tr|td|th)[^>]*>/i;

/** Convert raw HTML to structured plain text (reuses provider stripHtml — pure regex, SSR-safe). */
function htmlToText(html: string): string {
  return stripHtml(html);
}

function hasHtml(text: string): boolean {
  return HTML_TAG_RE.test(text);
}

/** Inline markdown: **bold**, *italic*, `code`, [text](url) */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Combined regex for inline elements
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(<Fragment key={`${keyPrefix}-t${i}`}>{text.slice(last, m.index)}</Fragment>);
    }
    const key = `${keyPrefix}-i${i++}`;
    if (m[2] !== undefined) {
      nodes.push(<strong key={key} className="font-semibold text-foreground">{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      nodes.push(<em key={key}>{m[3]}</em>);
    } else if (m[4] !== undefined) {
      nodes.push(
        <code key={key} className="rounded bg-muted px-1 py-0.5 text-[0.85em] font-mono">
          {m[4]}
        </code>,
      );
    } else if (m[5] !== undefined && m[6] !== undefined) {
      const href = m[6];
      const safe = /^https?:\/\//i.test(href) ? href : "#";
      nodes.push(
        <a
          key={key}
          href={safe}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          {m[5]}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    nodes.push(<Fragment key={`${keyPrefix}-end`}>{text.slice(last)}</Fragment>);
  }
  return nodes;
}

/** Strip markdown to plain text for compact previews. */
export function descriptionToPlainText(text: string): string {
  const t = hasHtml(text) ? htmlToText(text) : text;
  return t
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1")
    .replace(/^[•\-]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .trim();
}

/** Render a job description with markdown-lite formatting. */
export function JobDescription({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const normalized = hasHtml(text) ? htmlToText(text) : text;
  const blocks = normalized.split("\n");

  const elements: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushList = () => {
    if (!list) return;
    const items = list.items.map((item, i) => (
      <li key={`${key}-li${i}`} className="ml-4">
        {renderInline(item, `${key}-li${i}`)}
      </li>
    ));
    elements.push(
      list.ordered ? (
        <ol key={key++} className="list-decimal space-y-1 pl-5">
          {items}
        </ol>
      ) : (
        <ul key={key++} className="list-disc space-y-1 pl-5">
          {items}
        </ul>
      ),
    );
    list = null;
  };

  for (const rawLine of blocks) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }

    // Headings
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const cls =
        level <= 2
          ? "text-base font-semibold text-foreground mt-3 first:mt-0"
          : "text-sm font-semibold text-foreground mt-2 first:mt-0";
      elements.push(
        <p key={key++} className={cls}>
          {renderInline(heading[2], `h${key}`)}
        </p>,
      );
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      flushList();
      elements.push(<hr key={key++} className="my-3 border-border" />);
      continue;
    }

    // Bullet list
    const bullet = /^[•\-–]\s+(.*)$/.exec(line);
    if (bullet) {
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    // Numbered list
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={key++} className="leading-relaxed">
        {renderInline(line, `p${key}`)}
      </p>,
    );
  }
  flushList();

  return (
    <div className={cn("space-y-2 text-sm text-muted-foreground", className)}>
      {elements}
    </div>
  );
}
