import { NextResponse } from "next/server";

export function nextError(
  message: string = "Something went wrong.",
  status: number = 500
) {
  return NextResponse.json(
    {
      status: "error",
      error: message || "Something went wrong.",
    },
    { status: status }
  );
}

export function nextSuccess(data: Object | null, status: number = 200) {
  return NextResponse.json(
    { status: "success", data: data },
    { status: status }
  );
}