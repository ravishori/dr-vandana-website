/**
 * Minimal Markdown → safe HTML renderer.
 * Allows a small subset only. Strips raw HTML tags from input.
 */

import { isSafeHttpsUrl } from "@/lib/cms/urls";

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Allow only safe same-origin relative paths (leading slash, no schemes).
 */
export function isSafeRelativeMarkdownPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) {
    return false;
  }
  if (trimmed.startsWith("//")) {
    return false;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return false;
  }
  if (/[\\<>"'\s]/.test(trimmed)) {
    return false;
  }
  if (trimmed.includes("..")) {
    return false;
  }
  return /^\/[A-Za-z0-9/_?-]*$/.test(trimmed);
}

function encodeHref(url: string): string {
  return escapeHtml(url);
}

function inlineFormat(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Work from escaped text — relative paths and https URLs appear as literal text.
  out = out.replace(
    /\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g,
    (_match, label: string, href: string) => {
      if (!isSafeHttpsUrl(href)) {
        return _match;
      }
      return `<a href="${encodeHref(href)}" rel="noopener noreferrer" target="_blank">${label}</a>`;
    },
  );

  out = out.replace(
    /\[([^\]]+)\]\((\/[^)\s]*)\)/g,
    (_match, label: string, href: string) => {
      if (!isSafeRelativeMarkdownPath(href)) {
        return _match;
      }
      return `<a href="${encodeHref(href)}">${label}</a>`;
    },
  );

  return out;
}

/**
 * Map Markdown heading depth to page-safe HTML heading levels.
 * Page already owns <h1>, so body starts at <h2>.
 */
export function markdownHeadingTag(hashCount: number): "h2" | "h3" | "h4" {
  if (hashCount <= 1) {
    return "h2";
  }
  if (hashCount === 2) {
    return "h3";
  }
  return "h4";
}

/**
 * Render a constrained Markdown subset to sanitized HTML.
 * Raw HTML in the source is escaped, not executed.
 */
export function renderSafeMarkdown(markdown: string): string {
  const stripped = markdown.replace(/<\/?[a-zA-Z][^>]*>/g, "");
  const lines = stripped.replaceAll("\r\n", "\n").split("\n");
  const html: string[] = [];
  let inUl = false;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      html.push(`<p>${inlineFormat(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  const closeUl = () => {
    if (inUl) {
      html.push("</ul>");
      inUl = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      closeUl();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeUl();
      const tag = markdownHeadingTag(heading[1].length);
      html.push(
        `<${tag}>${inlineFormat(heading[2].trim())}</${tag}>`,
      );
      continue;
    }

    const listItem = line.match(/^[-*]\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      if (!inUl) {
        html.push("<ul>");
        inUl = true;
      }
      html.push(`<li>${inlineFormat(listItem[1].trim())}</li>`);
      continue;
    }

    closeUl();
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeUl();
  return html.join("\n");
}

/** Strip tags for plain-text excerpts / XSS payload tests. */
export function stripTags(input: string): string {
  return input.replace(/<\/?[^>]+>/g, "");
}
