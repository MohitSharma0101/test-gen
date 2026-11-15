import MathpixProvider from "@/provider/MathpixProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  // Math-heavy pages only: starts the math library download as soon as the
  // page opens, before the first question needs it. Other pages load it on
  // demand via <Markdown> (the app shell no longer mounts this).
  return (
    <>
      {children}
      <MathpixProvider />
    </>
  );
}
