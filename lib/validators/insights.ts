import { z } from "zod";

export const askSchema = z.object({
  question: z.string().trim().min(3, "must be at least 3 characters").max(500, "must be 500 characters or fewer"),
});
export type AskInput = z.infer<typeof askSchema>;

export type AskCitation = {
  id: string;
  content: string;
  channel: string;
  customerLabel: string | null;
  createdAt: string;
  similarity: number;
};

export type AskResponse = {
  answer: string;
  citations: AskCitation[];
  insufficientEvidence: boolean;
};
