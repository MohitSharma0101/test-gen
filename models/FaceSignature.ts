import mongoose from "mongoose";

// One row per enrolled photo. Signatures live here rather than on User
// because User is fetched in list and fee views, and 8 signatures of 128
// floats would weigh those queries down for no reason.
export type TFaceSignature = {
  _id: string;
  user: string;
  vector: number[];
  source: "enrollment" | "correction";
  faceWidth?: number;
  createdAt: string;
  updatedAt: string;
};

const faceSignatureSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // 128 floats from SFace. ArcFace would be 512, so do not assume a length.
    vector: {
      type: [Number],
      required: true,
    },
    // "correction" rows come from a teacher fixing the review queue, which is
    // what makes accuracy improve without re-enrolling anyone.
    source: {
      type: String,
      enum: ["enrollment", "correction"],
      default: "enrollment",
    },
    faceWidth: {
      type: Number,
    },
  },
  { timestamps: true }
);

export default mongoose.models.FaceSignature ||
  mongoose.model("FaceSignature", faceSignatureSchema);
