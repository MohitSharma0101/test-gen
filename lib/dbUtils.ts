import mongoose from "mongoose";
import { attachDatabasePool } from "@vercel/functions";
import "@/models/Batch";
import "@/models/Paper";

const { DB_PASSWORD, DB_USER } = process.env;

const dbURL = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@cluster0.nfwacai.mongodb.net/?retryWrites=true&w=majority`;

// One connection per warm serverless instance. The promise lives on
// globalThis so it survives module re-evaluation (dev hot reload) and so
// requests that arrive while the first handshake is still running wait for
// that one instead of each starting their own. Before, every request called
// mongoose.connect (and logged "connected to db").
type TCache = { promise: Promise<typeof mongoose> | null };
const globalForDb = globalThis as unknown as { __mongoose?: TCache };
const cached: TCache = globalForDb.__mongoose ?? (globalForDb.__mongoose = { promise: null });

export const dbConnect = async () => {
  // 1 = connected; 2 = connecting (the cached promise covers that)
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(dbURL, {
        // Small pool: each serverless instance handles few requests at once
        maxPoolSize: 10,
        // Fail fast instead of hanging when Atlas is unreachable; the next
        // request dials again
        serverSelectionTimeoutMS: 5_000,
        // Drop connections idle for a minute: an instance paused by Fluid
        // compute otherwise wakes up holding sockets the network has dropped
        maxIdleTimeMS: 60_000,
      })
      .then((m) => {
        // Vercel Fluid compute: release idle pool connections before the
        // instance is suspended, so a resumed instance never waits on a dead
        // socket (the "stuck for seconds after a few idle minutes" requests).
        attachDatabasePool(m.connection.getClient());
        return m;
      })
      .catch((err) => {
        // Let the next request try again rather than reuse a failed promise
        cached.promise = null;
        console.error("MongoDB connection failed:", err?.message ?? err);
        throw err;
      });
  }
  return cached.promise;
};
