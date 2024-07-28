import dynamic from "next/dynamic";
import { Suspense } from "react";

const DynamicMathpixProvider = dynamic(
  () => import("@/provider/MathpixProvider"),
  { ssr: false }
);

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <>
      <Suspense>{children}</Suspense>
      <DynamicMathpixProvider />
    </>
  );
}
