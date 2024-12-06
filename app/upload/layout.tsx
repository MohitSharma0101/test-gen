import Header from "@/components/ui/header";
import MathpixProvider from "@/provider/MathpixProvider";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header active="upload" />
      {children}
      <MathpixProvider />
    </>
  );
}
