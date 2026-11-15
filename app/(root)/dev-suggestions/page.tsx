import { notFound } from "next/navigation";
import { getAccount } from "@/lib/auth";
import { Role } from "@/data/const";
import SuggestionsInbox from "./suggestions-inbox";

// Hidden page: no menu entry or tile. Non-admins get the ordinary 404, so the
// page doesn't reveal that it exists.
export default async function DevSuggestionsPage() {
  const account = await getAccount();
  if (account?.role !== Role.ADMIN) notFound();
  return <SuggestionsInbox />;
}
