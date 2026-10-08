/**
 * The double-check that runs on every handbook answer. It doesn't judge
 * wording; it catches the failures that hurt trust: citing sources that
 * don't exist, and numbers (prices, dates, times, percentages) that don't
 * appear in any source the answer relied on.
 */

/** Numbers as plain value strings: "$1,950" becomes "1950", "9:30" becomes "9" and "30". */
export function numbers(text: string): string[] {
  return (text.match(/\d+(?:,\d{3})*(?:\.\d+)?/g) ?? [])
    .map((n) => n.replace(/,/g, ""))
    .map((n) => String(Number(n)))
    .filter((n) => Number(n) > 1);
}

export interface VerifyInput {
  answer: string;
  sourceIds: string[];
  /** Every source the model could cite, by id. */
  available: Map<string, string>;
  /** Other text the answer may repeat numbers from: the question, history, today's date. */
  context: string;
}

export function verifyAnswer({ answer, sourceIds, available, context }: VerifyInput) {
  const problems: string[] = [];
  const validIds = [...new Set(sourceIds)].filter((id) => available.has(id));
  const unknown = sourceIds.filter((id) => !available.has(id));
  if (unknown.length) problems.push(`Cited unknown sources: ${unknown.join(", ")}`);
  if (!answer.trim()) problems.push("Empty answer");

  const allowed = new Set(numbers([...validIds.map((id) => available.get(id)!), context].join("\n")));
  const invented = [...new Set(numbers(answer))].filter((n) => !allowed.has(n));
  if (invented.length) problems.push(`Numbers not found in cited sources: ${invented.join(", ")}`);
  if (!validIds.length && numbers(answer).length) problems.push("Answer has facts but no valid sources");

  return { ok: problems.length === 0, problems, validIds };
}
