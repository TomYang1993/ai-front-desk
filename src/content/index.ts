import { centers } from "./centers";
import { families } from "./families";
import { parseHandbook } from "./handbook-parse";
import { handbookMarkdown } from "./handbooks/index.generated";
import type { CenterId, HandbookSection } from "./types";

export { centers, families };
export * from "./types";

/** Seed handbooks, parsed from the Markdown files. */
export function seedHandbook(centerId: CenterId): HandbookSection[] {
  const md = handbookMarkdown[centerId];
  if (!md) throw new Error(`No handbook for ${centerId}`);
  return parseHandbook(md);
}
