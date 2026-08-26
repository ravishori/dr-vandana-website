/**
 * Minimal Markdown → safe HTML renderer.
 * Allows a small subset only. Strips raw HTML tags from input.
 */

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function inlineFormat(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
  out = out.replace(
    /\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g,
    '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>',
  );
  return out;
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
      const level = heading[1].length;
      html.push(`<h${level}>${inlineFormat(heading[2].trim())}</h${level}>`);
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
