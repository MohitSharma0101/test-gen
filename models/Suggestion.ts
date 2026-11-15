import { Schema, model, models } from "mongoose";

// Suggestion box messages written by students in the student app (crack-it,
// models/Suggestion.ts there; keep the two in step). Read and answered here
// on the hidden /dev-suggestions page. Images are Cloudinary links under
// "suggestions/", cleared from that page when no longer needed.
export const SUGGESTION_TYPES = ["bug", "idea", "question", "appreciate"] as const;
export type TSuggestionType = (typeof SUGGESTION_TYPES)[number];

export type TSuggestion = {
  _id: string;
  userId: string;
  name: string;
  type: TSuggestionType;
  message: string;
  images: { url: string; publicId: string }[];
  context?: { ua?: string; screen?: string };
  status: "new" | "done";
  reply?: { text: string; at: string } | null;
  replySeen?: boolean;
  createdAt: string;
};

const suggestionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, default: "" },
    type: { type: String, enum: SUGGESTION_TYPES, required: true },
    message: { type: String, required: true, maxlength: 2000 },
    images: { type: [{ _id: false, url: String, publicId: String }], default: [] },
    context: { type: { _id: false, ua: String, screen: String }, default: undefined },
    status: { type: String, enum: ["new", "done"], default: "new" },
    reply: { type: { _id: false, text: String, at: Date }, default: null },
    replySeen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

suggestionSchema.index({ userId: 1, createdAt: -1 });
suggestionSchema.index({ createdAt: -1 });

export default models.Suggestion || model("Suggestion", suggestionSchema);
