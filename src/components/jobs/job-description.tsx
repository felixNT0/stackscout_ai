"use client";

import { MarkdownText } from "@/components/markdown-text";
import { stripHtml } from "@/services/providers/http";

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

/** Strip markdown/HTML to plain text for compact previews. */
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
  return <MarkdownText text={normalized} className={className} />;
}
