import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  icon: ReactNode;
  // Tile colours, e.g. ROUTE_GROUPS[group].tile
  tone?: string;
  title: ReactNode;
  description?: ReactNode;
  // Right-aligned buttons; keep to one primary action
  actions?: ReactNode;
  className?: string;
};

// Title block at the top of a page: icon tile, <h1>, one line of context and
// the page's actions. Works in server and client components.
export const PageHeader = ({ icon, tone = "bg-brand-soft text-brand", title, description, actions, className }: Props) => (
  <header className={cn("flex items-center gap-3", className)}>
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl [&>svg]:size-5", tone)} aria-hidden="true">
      {icon}
    </span>
    <div className="min-w-0 flex-1">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </header>
);
