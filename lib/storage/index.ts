import crypto from "crypto";

// Server-only: reads storage secrets. Image storage plug-in. Pick the provider with IMAGE_STORAGE=cloudinary|s3.
// The browser uploads the file straight to the provider using the signed
// fields returned here, so large images never pass through our API
// (Vercel caps request bodies at 4.5 MB).

export type UploadTarget = {
  provider: "cloudinary" | "s3";
  // URL the browser POSTs a multipart form to
  uploadUrl: string;
  // Form fields to send before the file
  fields: Record<string, string>;
  // Name of the form field that carries the file
  fileField: string;
  // Final public URL when known up front (S3)
  publicUrl?: string;
  // JSON key holding the final URL in the provider's response (Cloudinary)
  responseUrlKey?: string;
};

type TargetInput = {
  contentType: string;
  extension: string;
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const FOLDER = process.env.IMAGE_STORAGE_FOLDER || "question-images";

const requireEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Image storage is not configured: ${name} is missing`);
  return value;
};

const cloudinaryTarget = (): UploadTarget => {
  const cloudName = requireEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requireEnv("CLOUDINARY_API_KEY");
  const apiSecret = requireEnv("CLOUDINARY_API_SECRET");
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Cloudinary signs the alphabetically sorted params plus the secret
  const signed: Record<string, string> = { folder: FOLDER, timestamp };
  const toSign = Object.keys(signed)
    .sort()
    .map((key) => `${key}=${signed[key]}`)
    .join("&");
  const signature = crypto
    .createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");

  return {
    provider: "cloudinary",
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    fields: { ...signed, api_key: apiKey, signature },
    fileField: "file",
    responseUrlKey: "secure_url",
  };
};

const hmac = (key: Buffer | string, data: string) =>
  crypto.createHmac("sha256", key).update(data).digest();

// S3 browser upload via a signed POST policy (AWS Signature V4).
const s3Target = ({ contentType, extension }: TargetInput): UploadTarget => {
  const bucket = requireEnv("S3_BUCKET");
  const region = requireEnv("S3_REGION");
  const accessKeyId = requireEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("S3_SECRET_ACCESS_KEY");
  const publicBase =
    process.env.S3_PUBLIC_URL_BASE || `https://${bucket}.s3.${region}.amazonaws.com`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); // 20261018T120000Z
  const dateStamp = amzDate.slice(0, 8);
  const credential = `${accessKeyId}/${dateStamp}/${region}/s3/aws4_request`;
  const key = `${FOLDER}/${dateStamp}/${crypto.randomUUID()}.${extension}`;

  const policy = {
    expiration: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    conditions: [
      { bucket },
      { key },
      { "Content-Type": contentType },
      ["content-length-range", 1, MAX_UPLOAD_BYTES],
      { "x-amz-algorithm": "AWS4-HMAC-SHA256" },
      { "x-amz-credential": credential },
      { "x-amz-date": amzDate },
    ],
  };
  const policyBase64 = Buffer.from(JSON.stringify(policy)).toString("base64");

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), "s3"),
    "aws4_request"
  );
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(policyBase64)
    .digest("hex");

  return {
    provider: "s3",
    uploadUrl: `https://${bucket}.s3.${region}.amazonaws.com`,
    fields: {
      key,
      "Content-Type": contentType,
      "x-amz-algorithm": "AWS4-HMAC-SHA256",
      "x-amz-credential": credential,
      "x-amz-date": amzDate,
      policy: policyBase64,
      "x-amz-signature": signature,
    },
    fileField: "file",
    publicUrl: `${publicBase}/${key}`,
  };
};

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const getUploadTarget = (contentType: string): UploadTarget => {
  const extension = ALLOWED_IMAGE_TYPES[contentType];
  if (!extension) throw new Error("Only PNG, JPEG, WebP and GIF images can be uploaded");

  const provider = (process.env.IMAGE_STORAGE || "cloudinary").toLowerCase();
  if (provider === "cloudinary") return cloudinaryTarget();
  if (provider === "s3") return s3Target({ contentType, extension });
  throw new Error(`Unknown IMAGE_STORAGE "${provider}". Use "cloudinary" or "s3".`);
};
