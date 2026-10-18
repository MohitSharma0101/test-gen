import { NextRequest, NextResponse } from "next/server";
import { getAccount } from "@/lib/auth";
import { ALLOWED_IMAGE_TYPES, getUploadTarget, MAX_UPLOAD_BYTES } from "@/lib/storage";

// Returns signed fields so the browser can upload an image straight to storage.
export const POST = async (request: NextRequest) => {
  const account = await getAccount();
  if (!account) {
    return NextResponse.json({ error: "Please log in to upload images" }, { status: 401 });
  }

  try {
    const { contentType, size } = (await request.json()) as {
      contentType?: string;
      size?: number;
    };
    if (!contentType || !ALLOWED_IMAGE_TYPES[contentType]) {
      return NextResponse.json(
        { error: "Only PNG, JPEG, WebP and GIF images can be uploaded" },
        { status: 400 }
      );
    }
    if (typeof size === "number" && size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image is larger than 5 MB" }, { status: 400 });
    }

    const target = getUploadTarget(contentType);
    return NextResponse.json({ ...target, maxBytes: MAX_UPLOAD_BYTES }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Could not prepare the upload" },
      { status: 500 }
    );
  }
};
