import type { Metadata } from "next";
import Image from "next/image";
import { FilePenLineIcon, CalendarCheck2Icon, MessageCircleIcon } from "lucide-react";
import { LoginForm } from "./login-form";
import { SigninIllustration } from "./signin-illustration";

export const metadata: Metadata = {
  title: "Sign in · Education+",
};

const HIGHLIGHTS = [
  { icon: FilePenLineIcon, text: "Create and print question papers in minutes" },
  { icon: CalendarCheck2Icon, text: "Take attendance, with a photo of the class" },
  { icon: MessageCircleIcon, text: "Share results and updates with parents" },
];

const Logo = ({ className }: { className?: string }) => (
  <Image
    src="/eplus-logo-min.png"
    alt=""
    width={746}
    height={500}
    priority
    sizes="64px"
    className={className}
  />
);

// Server component: the brand panel and layout ship as HTML, only the form
// below is client JavaScript.
export default function SignInPage() {
  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Brand panel, desktop only */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand p-10 text-brand-foreground lg:flex xl:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-24 size-[28rem] rounded-full bg-black/10 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
            <Logo className="h-auto w-full" />
          </span>
          <div className="leading-tight">
            <p className="text-lg font-bold">Education+</p>
            <p className="text-sm text-brand-foreground/80">Believe in Results</p>
          </div>
        </div>

        <SigninIllustration className="relative mx-auto max-w-md motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500" />

        <div className="relative space-y-6">
          <h2 className="max-w-md text-3xl font-bold leading-tight">
            Papers, attendance and results, all in one place.
          </h2>
          <ul className="space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-brand-foreground/90">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Form side */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6">
        {/* soft brand wash behind the card on phones and tablets */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-gradient-to-b from-brand-soft via-brand-soft/40 to-transparent lg:hidden"
        />

        <div className="relative w-full max-w-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300">
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-card p-2 shadow-sm ring-1 ring-border">
              <Logo className="h-auto w-full" />
            </span>
            <div className="leading-tight">
              <p className="text-xl font-bold">Education+</p>
              <p className="text-sm font-medium text-brand">Believe in Results</p>
            </div>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Forgot your password? Ask your admin to reset it.
          </p>
        </div>
      </section>
    </main>
  );
}
