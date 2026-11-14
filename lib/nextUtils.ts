import { NextResponse } from "next/server";
import { toMessage } from "./errorMessage";

export function nextError(
  message: unknown = "Something went wrong.",
  status: number = 500
) {
  return NextResponse.json(
    {
      status: "error",
      // Always a string: callers sometimes pass an error object along
      error: toMessage(message, "Something went wrong."),
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