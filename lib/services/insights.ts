import "server-only";
import { answerFromFeedback } from "../ai";
import { embedQuery, searchSimilarFeedback } from "../search";
import type { AskInput, AskResponse } from "../validators/insights";

const NO_EVIDENCE_ANSWER =
  "I couldn't find feedback in this workspace that addresses that question. Try rephrasing it, or import more feedback first.";

/**
 * Ask LOOP: retrieve then answer.
 * 1. Embed the question and pull the 12 nearest feedback items in this workspace (weak matches dropped).
 * 2. Nothing relevant → insufficientEvidence without calling Claude.
 * 3. Otherwise Claude answers only from items labelled [F1]..[Fn]; we keep only labels we actually supplied.
 */
export async function askLoop(workspaceId: string, input: AskInput): Promise<AskResponse> {
  const queryVector = await embedQuery(input.question);
  const matches = await searchSimilarFeedback(workspaceId, queryVector);

  if (matches.length === 0) {
    return { answer: NO_EVIDENCE_ANSWER, citations: [], insufficientEvidence: true };
  }

  const labelled = matches.map((m, i) => ({ ...m, label: `F${i + 1}` }));
  const byLabel = new Map(labelled.map((m) => [m.label, m]));

  const output = await answerFromFeedback(input.question, labelled);

  // Keep only real labels, in the order Claude cited them, once each.
  const cited: string[] = [];
  for (const raw of output.citedLabels) {
    const label = raw.replace(/[\[\]\s]/g, "").toUpperCase();
    if (byLabel.has(label) && !cited.includes(label)) cited.push(label);
  }
  // Models sometimes group citations ("[F1, F5]"); normalise to "[F1][F5]" so each label is checked.
  const normalised = output.answer.replace(/\[(F\d+(?:\s*,\s*F\d+)+)\]/g, (_m, group: string) =>
    group
      .split(/\s*,\s*/)
      .map((label) => `[${label}]`)
      .join(""),
  );
  // Also pick up inline [F3] citations the model forgot to list, and strip any invented labels from the text.
  const answer = normalised.replace(/\[F(\d+)\]/g, (match, n: string) => {
    const label = `F${n}`;
    if (!byLabel.has(label)) return "";
    if (!cited.includes(label)) cited.push(label);
    return match;
  });

  const citations = cited.map((label) => {
    const m = byLabel.get(label)!;
    return {
      id: m.id,
      content: m.content,
      channel: m.channel,
      customerLabel: m.customerLabel,
      createdAt: m.createdAt.toISOString(),
      similarity: Math.round(m.similarity * 1000) / 1000,
    };
  });

  return {
    answer: answer.replace(/[ \t]{2,}/g, " ").replace(/ +([.,;:])/g, "$1").trim(),
    citations,
    insufficientEvidence: output.insufficientEvidence || citations.length === 0,
  };
}
