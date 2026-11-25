"use client";

import { cn } from "@/lib/utils";
import { Fragment, type ReactNode } from "react";

/**
 * Renders markdown-lite text as React elements — no dangerouslySetInnerHTML.
 * Supports: **bold**, *italic*, `code`, [links](url), ## headings,
 * - / • bullets, 1. numbered lists, --- rules.
 */

/** Inline markdown: **bold**, *italic*, `code`, [text](url) */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
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

export function MarkdownText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const blocks = text.split("\n");
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

    if (/^[-*_]{3,}$/.test(line.trim())) {
      flushList();
      elements.push(<hr key={key++} className="my-3 border-border" />);
      continue;
    }

    const bullet = /^[•\-–]\s+(.*)$/.exec(line);
    if (bullet) {
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }

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
