import type { TSuggestionType } from "@/models/Suggestion";

type TSuggestionImage = { url: string; publicId: string };

/**
 * One bubble in a Suggestion box chat. Mirrors the student app
 * (types/suggestion.ts and lib/server/suggestions.ts there); keep in step.
 */
export type TChatMessage = {
  _id: string;
  from: "student" | "staff";
  /** Student messages only: Bug, Idea, Question or Appreciate. */
  type?: TSuggestionType;
  message: string;
  images: TSuggestionImage[];
  createdAt: string;
  staffName?: string;
  /** Staff messages: the student has read it. Student messages: the developer has. */
  seen: boolean;
};

export type TSuggestionDoc = {
  _id: unknown;
  from?: "student" | "staff";
  type?: TSuggestionType;
  message: string;
  images?: TSuggestionImage[];
  createdAt: Date | string;
  status?: "new" | "done";
  staffName?: string;
  reply?: { text?: string; at?: Date | string } | null;
  replySeen?: boolean;
};

const iso = (d: Date | string | undefined) => new Date(d ?? 0).toISOString();

/**
 * Documents (any order) to chat bubbles, oldest first. A document from before
 * the chat holds its reply embedded; that reply becomes a staff bubble right
 * after it, so old conversations read as a chat without migrating anything.
 */
export const toChatMessages = (docs: TSuggestionDoc[]): TChatMessage[] => {
  const out: TChatMessage[] = [];
  for (const d of docs) {
    const id = String(d._id);
    const staff = d.from === "staff";
    out.push({
      _id: id,
      from: staff ? "staff" : "student",
      type: staff ? undefined : d.type,
      message: d.message,
      images: (d.images ?? []).map(({ url, publicId }) => ({ url, publicId })),
      createdAt: iso(d.createdAt),
      staffName: staff ? d.staffName : undefined,
      seen: staff ? !!d.replySeen : d.status === "done",
    });
    if (!staff && d.reply?.text) {
      out.push({
        _id: `${id}-reply`,
        from: "staff",
        message: d.reply.text,
        images: [],
        createdAt: iso(d.reply.at ?? d.createdAt),
        seen: !!d.replySeen,
      });
    }
  }
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};
