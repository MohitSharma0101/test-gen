import { NextResponse } from "next/server";

export function nextError(
  message: string = "Something went wrong.",
  status: number = 500
) {
  return NextResponse.json(
    {
      status: "error",
      error: message,
    },
    { status: status }
  );
}
