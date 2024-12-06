import Header from "@/components/ui/header";
import MathpixProvider from "@/provider/MathpixProvider";
import { Suspense } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header active="create" />
      <Suspense>{children}</Suspense>
      <MathpixProvider />
    </>
  );
}
