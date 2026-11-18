import ConfirmationModal from "@/components/ui/confirmation-model";
import Header from "@/components/ui/header";
import { AuthProvider } from "@/context/auth-context";
import { getAccount } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { VisitTracker } from "@/components/visit-tracker";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAccount();
  // `?session=1`: middleware skips its "already signed in" redirect, or a valid
  // token whose account can't be loaded (deleted, or the database briefly
  // unreachable) would bounce between / and /signin forever.
  if (!user) redirect("/signin?session=1");
  
  return (
    <AuthProvider account={user}>
      <Header />
      <Suspense>{children}</Suspense>
      <ConfirmationModal />
      <VisitTracker />
    </AuthProvider>
  );
}
