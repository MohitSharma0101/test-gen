import Header from "@/components/ui/header";
import dynamic from "next/dynamic";

const DynamicMathpixProvider = dynamic(
  () => import(
   "@/provider/MathpixProvider"),
  { ssr: false }
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <>
      <Header active="book" />
      {children}
      <DynamicMathpixProvider />
    </>
  );
}
