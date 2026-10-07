import type { HandbookSection } from "./types";

const HEADING = /^## (.+?) \{#([a-z0-9-]+)\}\s*$/;
const UPDATED = /^<!-- updated: (\d{4}-\d{2}-\d{2}) by (.+?) -->\s*$/;

/**
 * Splits a handbook into sections. Each section starts with
 * "## Title {#id}" and an "updated" comment on the next line.
 */
export function parseHandbook(markdown: string): HandbookSection[] {
  const sections: HandbookSection[] = [];
  let current: HandbookSection | null = null;
  const body: string[] = [];

  const flush = () => {
    if (current) {
      current.body = body.join("\n").trim();
      sections.push(current);
    }
    body.length = 0;
  };

  for (const line of markdown.split("\n")) {
    const heading = line.match(HEADING);
    if (heading) {
      flush();
      current = { id: heading[2], title: heading[1], body: "", updatedAt: "", updatedBy: "" };
      continue;
    }
    if (!current) continue;
    const updated = line.match(UPDATED);
    if (updated && !current.updatedAt) {
      current.updatedAt = updated[1];
      current.updatedBy = updated[2];
      continue;
    }
    body.push(line);
  }
  flush();
  return sections;
}
