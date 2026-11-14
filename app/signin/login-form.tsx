"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  LockIcon,
  UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthService } from "@/service/auth.service";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "success";

// What the person can do about it, not what the server said.
// 401 and 404 read the same so the page doesn't reveal which usernames exist.
const messageFor = (err: unknown) => {
  const { status, message } = (err ?? {}) as { status?: number; message?: string };
  if (status === 401 || status === 404) return "Wrong username or password.";
  if (status === 400) return "Enter your username and password.";
  if (!status) return "Can't reach the server. Check your internet connection.";
  return message && message !== "Something went wrong!"
    ? message
    : "Something went wrong. Please try again.";
};

const fieldIcon = "pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground";
// 48px tall, 16px text so iOS doesn't zoom in on focus
const fieldInput = "h-12 rounded-lg bg-card pl-11 text-base focus-visible:ring-brand";

export const LoginForm = () => {
  const router = useRouter();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  // Bumped on every failure so the shake replays even for the same message
  const [attempt, setAttempt] = useState(0);

  const busy = status !== "idle";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setStatus("submitting");
    setError("");

    try {
      await AuthService.login({ username: username.trim(), password });
      setStatus("success");
      // The signin layout sees the new cookie and redirects to "/"
      router.refresh();
    } catch (err) {
      setError(messageFor(err));
      setAttempt((n) => n + 1);
      setStatus("idle");
      requestAnimationFrame(() => passwordRef.current?.select());
    }
  };

  const clearError = () => error && setError("");

  const trackCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(e.getModifierState?.("CapsLock") ?? false);

  return (
    <div
      key={attempt}
      className={cn(
        "rounded-2xl border bg-card p-6 shadow-sm sm:p-8",
        attempt > 0 && "motion-safe:animate-shake"
      )}
    >
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to Education+</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium">
            Username
          </label>
          <div className="relative">
            <UserIcon className={fieldIcon} aria-hidden="true" />
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              required
              disabled={busy}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                clearError();
              }}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? "login-error" : undefined}
              className={fieldInput}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <LockIcon className={fieldIcon} aria-hidden="true" />
            <Input
              ref={passwordRef}
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              enterKeyHint="go"
              required
              disabled={busy}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError();
              }}
              onKeyDown={trackCapsLock}
              onKeyUp={trackCapsLock}
              onBlur={() => setCapsLock(false)}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={
                [error && "login-error", capsLock && "caps-lock"].filter(Boolean).join(" ") || undefined
              }
              className={cn(fieldInput, "pr-12")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {showPassword ? (
                <EyeOffIcon className="size-5" aria-hidden="true" />
              ) : (
                <EyeIcon className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
          {capsLock && (
            <p id="caps-lock" className="text-xs font-medium text-amber-700">
              Caps Lock is on
            </p>
          )}
        </div>

        {error && (
          <div
            id="login-error"
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-red-700 motion-safe:animate-in motion-safe:fade-in"
          >
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={busy}
          aria-live="polite"
          className="h-12 w-full gap-2 rounded-lg bg-brand text-base font-bold text-brand-foreground hover:bg-brand/90 focus-visible:ring-brand active:scale-[0.99] disabled:opacity-90 motion-safe:transition-transform"
        >
          {status === "submitting" && (
            <>
              <Loader2Icon className="size-5 animate-spin" aria-hidden="true" />
              Signing in…
            </>
          )}
          {status === "success" && (
            <>
              <CheckIcon className="size-5 motion-safe:animate-in motion-safe:zoom-in-50" aria-hidden="true" />
              Signed in
            </>
          )}
          {status === "idle" && "Sign in"}
        </Button>
      </form>
    </div>
  );
};
