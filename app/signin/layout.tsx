// Static: the "already signed in? go home" check lives in middleware.ts, so
// this page is plain HTML served from the CDN instead of a server function
// (which on a quiet instance meant a cold start before the form appeared).
export default function SignInLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
