import "server-only";
import type { Prisma } from "@prisma/client";

/** Shared include + API shape for feedback rows (used by the feedback and themes services). */
export const feedbackInclude = {
  themes: {
    include: { theme: { select: { id: true, name: true, color: true } } },
    orderBy: { confidence: "desc" },
  },
} satisfies Prisma.FeedbackInclude;

export type FeedbackWithThemes = Prisma.FeedbackGetPayload<{ include: typeof feedbackInclude }>;

export function toFeedbackDto(f: FeedbackWithThemes) {
  const { themes, workspaceId: _workspaceId, ...rest } = f;
  return {
    ...rest,
    themes: themes.map((t) => ({ id: t.theme.id, name: t.theme.name, color: t.theme.color, confidence: t.confidence })),
  };
}

export type FeedbackDto = ReturnType<typeof toFeedbackDto>;
