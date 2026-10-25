// Talks to the recognition container (see recognition/README.md).
//
// The service is stateless and holds no credentials, so the roster's stored
// signatures travel with each recognise call rather than the container
// reaching into the database itself.

// Two shapes are supported:
//   FACE_SERVICE_URL set  -> a standalone service, e.g. http://localhost:8080
//                            during development, with /embed and /recognize
//   FACE_SERVICE_URL unset -> the Python functions in this same deployment,
//                            at /api/embed and /api/recognize
const EXTERNAL_URL = process.env.FACE_SERVICE_URL?.replace(/\/$/, "");
const SELF_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
const SECRET = process.env.FACE_SERVICE_SECRET;

const BASE_URL = EXTERNAL_URL || SELF_URL;

// Functions deployed alongside the app sit under /api; a standalone service
// serves the routes at its root.
const path = (name: "embed" | "recognize") =>
  EXTERNAL_URL ? `/${name}` : `/api/${name}`;

export const FACE_SERVICE_CONFIGURED = !!BASE_URL;

// Cold starts on a scale-to-zero container include loading the models, so the
// first call after an idle period is slow. Nothing waits on this interactively
// for attendance, but enrollment does, hence a generous but finite ceiling.
const TIMEOUT_MS = 60_000;

export type EmbedResult = {
  index: number;
  ok: boolean;
  faceCount: number;
  faceWidth?: number;
  vector?: number[];
  reason?: string;
};

export type RosterEntry = {
  userId: string;
  vectors: number[][];
};

export type RecognizeResult = {
  recognised: { userId: string; confidence: number }[];
  uncertain: {
    candidates: { userId: string; confidence: number }[];
    crop: string;
    // Kept so a teacher's correction can be saved as a new signature.
    vector: number[];
  }[];
  notDetected: string[];
  stats: {
    imagesProcessed: number;
    facesDetected: number;
    facesUnmatched?: number;
  };
};

const post = async <T>(path: string, body: FormData): Promise<T> => {
  if (!BASE_URL) {
    throw new Error("Face service is not configured. Set FACE_SERVICE_URL.");
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      body,
      headers: SECRET ? { "x-face-secret": SECRET } : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err: any) {
    if (err?.name === "TimeoutError") {
      throw new Error("Face service timed out. It may be starting up — try again.");
    }
    throw new Error(`Could not reach the face service: ${err?.message ?? err}`);
  }

  if (!response.ok) {
    // FastAPI puts its message in `detail`; fall back to raw text otherwise.
    const text = await response.text();
    let detail = text;
    try {
      detail = JSON.parse(text)?.detail ?? text;
    } catch {
      // not JSON, keep the raw body
    }
    throw new Error(`Face service error (${response.status}): ${detail}`);
  }

  return response.json() as Promise<T>;
};

// Enrollment: one face per photo, anything else is reported back as rejected
// so a bystander never ends up enrolled as the student.
export const embedFaces = async (images: File[]) => {
  const form = new FormData();
  images.forEach((image, index) => {
    form.append("images", image, image.name || `shot-${index}.jpg`);
  });

  return post<{ results: EmbedResult[] }>(path("embed"), form);
};

// Attendance: class photos in, who was seen out.
export const recognizeFaces = async (images: File[], roster: RosterEntry[]) => {
  const form = new FormData();
  images.forEach((image, index) => {
    form.append("images", image, image.name || `class-${index}.jpg`);
  });
  form.append("roster", JSON.stringify(roster));

  return post<RecognizeResult>(path("recognize"), form);
};
