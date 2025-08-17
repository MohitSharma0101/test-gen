import Header from "@/components/ui/header";

export default function RootBatchLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <>
      <Header />
      {children}
    </>
  );
}
