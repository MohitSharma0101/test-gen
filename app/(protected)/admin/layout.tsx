import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import React from "react";

const AdminLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const user = await getUser();
  if (!user || user.role != 'admin') redirect("/");
  
  return <>{children}</>;
};

export default AdminLayout;
