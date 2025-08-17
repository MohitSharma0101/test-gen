import mongoose from "mongoose";

// Counter schema for incremental IDs
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "userId"
  seq: { type: Number, default: 0 },
});

export default mongoose.models.Counter ||
  mongoose.model("Counter", CounterSchema);
