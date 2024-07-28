import Header from "@/components/ui/header";
import { AuthProvider } from "@/context/auth-context";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import React from "react";

const ProtectedLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const user = await getUser();
  if (!user) redirect("/login");
  return (
    <AuthProvider user={user}>
      <Header />
      {children}
    </AuthProvider>
  );
};

export default ProtectedLayout;
