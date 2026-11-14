import type { ReactNode } from "react";
import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "./button";

type EmptyProps = {
  icon: ReactNode;
  tone?: string;
  title: ReactNode;
  description?: ReactNode;
  // Usually one button or link that gets the person going
  action?: ReactNode;
  className?: string;
};

// "Nothing here yet" / "nothing matches": says why, and offers one way forward.
export const EmptyState = ({ icon, tone = "bg-brand-soft text-brand", title, description, action, className }: EmptyProps) => (
  <div className={cn("flex flex-col items-center gap-3 px-4 py-10 text-center", className)}>
    <span className={cn("flex size-12 items-center justify-center rounded-xl [&>svg]:size-6", tone)} aria-hidden="true">
      {icon}
    </span>
    <div>
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    {action}
  </div>
);

type ErrorProps = {
  message?: ReactNode;
  // Client components pass a handler; server components a URL to reload
  onRetry?: () => void;
  retryHref?: string;
  // Extra actions beside Try again (e.g. a Home link)
  children?: ReactNode;
  className?: string;
};

// Something failed to load: plain message plus Try again.
export const ErrorState = ({ message = "Couldn't load this.", onRetry, retryHref, children, className }: ErrorProps) => (
  <div className={cn("flex flex-col items-center gap-3 px-4 py-10 text-center", className)}>
    <TriangleAlertIcon className="size-8 text-amber-600" strokeWidth={1.5} aria-hidden="true" />
    <p className="text-sm text-muted-foreground">{message}</p>
    <div className="flex flex-wrap justify-center gap-2">
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RotateCwIcon className="size-4" aria-hidden="true" /> Try again
        </Button>
      )}
      {retryHref && (
        <a href={retryHref} className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
          <RotateCwIcon className="size-4" aria-hidden="true" /> Try again
        </a>
      )}
      {children}
    </div>
  </div>
);
