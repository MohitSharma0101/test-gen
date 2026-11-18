import { nextSuccess } from "@/lib/nextUtils";
import { clearSessionCookie } from "@/lib/session";

// The session cookie is httpOnly, so only the server can remove it.
export const POST = async () => clearSessionCookie(nextSuccess(null));
