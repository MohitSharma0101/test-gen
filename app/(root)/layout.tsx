import ConfirmationModal from "@/components/ui/confirmation-model";
import Header from "@/components/ui/header";
import { AuthProvider } from "@/context/auth-context";
import { getAccount } from "@/lib/auth";
import MathpixProvider from "@/provider/MathpixProvider";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAccount();
  if (!user) redirect("/signin");
  return (
    <AuthProvider account={user}>
      <Header />
      <Suspense>{children}</Suspense>
      <MathpixProvider />
      <ConfirmationModal />
    </AuthProvider>
  );
}
