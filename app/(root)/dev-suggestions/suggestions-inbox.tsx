"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  BugIcon,
  CheckCheckIcon,
  ChevronLeftIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  HeartIcon,
  ImageOffIcon,
  InboxIcon,
  LightbulbIcon,
  MessageCircleQuestionIcon,
  RotateCcwIcon,
  SendIcon,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { LIST_SWR, swrError } from "@/lib/swr";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/state-message";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TSuggestionType } from "@/models/Suggestion";
import type { TChatMessage } from "@/lib/suggestionChat";
import type { TThread } from "@/app/api/dev-suggestions/route";

const TYPE_META: Record<TSuggestionType, { label: string; Icon: typeof BugIcon; tone: string }> = {
  bug: { label: "Bug", Icon: BugIcon, tone: "text-red-700" },
  idea: { label: "Idea", Icon: LightbulbIcon, tone: "text-amber-700" },
  question: { label: "Question", Icon: MessageCircleQuestionIcon, tone: "text-sky-700" },
  appreciate: { label: "Appreciate", Icon: HeartIcon, tone: "text-pink-700" },
};

/** While the page is open, how often it looks for new messages. */
const POLL_MS = 20_000;

const IST = "Asia/Kolkata";
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" });
const dayLabel = (iso: string) => {
  const key = (d: Date) => d.toLocaleDateString("en-IN", { timeZone: IST });
  const d = new Date(iso);
  if (key(d) === key(new Date())) return "Today";
  if (key(d) === key(new Date(Date.now() - 86_400_000))) return "Yesterday";
  return d.toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short" });
};
const shortWhen = (iso: string) => (dayLabel(iso) === "Today" ? timeLabel(iso) : dayLabel(iso));

type TThreads = { threads: TThread[]; unread: number };
type TChat = { name: string; device: { ua?: string; screen?: string } | null; messages: TChatMessage[] };

function ThreadRow({ t, active, onOpen }: { t: TThread; active: boolean; onOpen: () => void }) {
  const meta = t.lastType ? TYPE_META[t.lastType] : undefined;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
        active ? "bg-brand-soft" : "hover:bg-muted/60 active:bg-muted"
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[15px] font-bold text-brand">
        {t.name.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={cn("truncate text-[15px]", t.unread ? "font-bold" : "font-semibold")}>{t.name}</span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">{shortWhen(t.lastAt)}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          {t.lastFrom === "staff" ? (
            <span className="shrink-0 text-xs text-muted-foreground">You:</span>
          ) : (
            meta && <meta.Icon className={cn("size-3.5 shrink-0", meta.tone)} aria-label={meta.label} />
          )}
          <span className={cn("truncate text-sm", t.unread ? "font-medium text-foreground" : "text-muted-foreground")}>
            {t.lastMessage}
          </span>
          {t.unread > 0 && (
            <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-brand-foreground">
              {t.unread}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

const Bubble = memo(function Bubble({
  m,
  first,
  last,
  pending,
  animate,
  onRetry,
}: {
  m: TChatMessage;
  first: boolean;
  last: boolean;
  pending?: "sending" | "failed";
  animate: boolean;
  onRetry: (id: string) => void;
}) {
  // Here the staff side is "mine", on the right.
  const mine = m.from === "staff";
  const meta = m.type ? TYPE_META[m.type] : undefined;
  const heartOnly = m.message === "💜" && !m.images.length;
  return (
    <li
      className={cn(
        "flex flex-col",
        mine ? "items-end" : "items-start",
        first ? "mt-3" : "mt-1",
        animate && (mine ? "animate-bubble-in-right" : "animate-bubble-in-left")
      )}
    >
      {heartOnly ? (
        <span className="text-[40px] leading-none" aria-label="Sent a heart">💜</span>
      ) : (
        <div
          className={cn(
            "max-w-[80%] rounded-[20px] px-3.5 py-2 text-[15px] leading-snug shadow-sm",
            mine ? "bg-brand text-brand-foreground" : "border bg-background",
            first && (mine ? "rounded-tr-md" : "rounded-tl-md"),
            pending === "failed" && "opacity-70"
          )}
        >
          {meta && first && (
            <span className={cn("mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide", meta.tone)}>
              <meta.Icon className="size-3" strokeWidth={2.5} /> {meta.label}
            </span>
          )}
          {m.images.length > 0 && (
            <div className="-mx-1 mb-1.5 mt-0.5 flex flex-wrap gap-1.5">
              {m.images.map((img) => (
                <a key={img.publicId} href={img.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="Screenshot from the student" className="size-24 rounded-xl object-cover" loading="lazy" />
                </a>
              ))}
            </div>
          )}
          <p className="whitespace-pre-wrap break-words">{m.message}</p>
        </div>
      )}
      {(last || pending) && (
        <span className="mt-1 flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
          {pending === "sending" ? (
            <>
              <ClockIcon className="size-3" /> Sending…
            </>
          ) : pending === "failed" ? (
            <button type="button" onClick={() => onRetry(m._id)} className="flex min-h-8 items-center gap-1 font-semibold text-destructive">
              <RotateCcwIcon className="size-3" /> Not sent. Retry
            </button>
          ) : (
            <>
              {timeLabel(m.createdAt)}
              {mine && m.seen && (
                <span className="flex items-center gap-0.5 text-brand">
                  <CheckCheckIcon className="size-3.5" /> Seen
                </span>
              )}
            </>
          )}
        </span>
      )}
    </li>
  );
});

/** One student's chat: messages and the reply box. */
function ChatPane({ userId, onBack }: { userId: string; onBack: () => void }) {
  const key = ["dev-suggestions", userId] as const;
  const { data, error, isLoading, mutate } = useSWR(
    key,
    async () => (await api.get(`dev-suggestions/${userId}`))?.data?.data as TChat,
    { ...LIST_SWR, refreshInterval: POLL_MS }
  );
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Record<string, "sending" | "failed">>({});
  const bodies = useRef<Record<string, string>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const seenIds = useRef<Set<string> | null>(null);
  const messages = useMemo(() => data?.messages ?? [], [data]);
  if (seenIds.current === null && data) seenIds.current = new Set(messages.map((m) => m._id));

  // Reading a chat marks the student's messages read.
  useEffect(() => {
    api.patch(`dev-suggestions/${userId}`).catch(() => {});
  }, [userId]);

  const lastId = messages[messages.length - 1]?._id;
  const firstScroll = useRef(true);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || !lastId) return;
    el.scrollTo({ top: el.scrollHeight, behavior: firstScroll.current ? "auto" : "smooth" });
    firstScroll.current = false;
  }, [lastId]);

  const deliver = async (id: string, message: string) => {
    bodies.current[id] = message;
    setPending((p) => ({ ...p, [id]: "sending" }));
    try {
      const saved = (await api.post(`dev-suggestions/${userId}`, { message }))?.data?.data as TChatMessage;
      seenIds.current?.add(saved._id);
      await mutate(
        (prev) => prev && { ...prev, messages: [...prev.messages.filter((m) => m._id !== id), saved] },
        { revalidate: false }
      );
      setPending((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    } catch {
      setPending((p) => ({ ...p, [id]: "failed" }));
    }
  };

  const send = () => {
    const message = text.trim();
    if (!message) return;
    const id = `tmp-${Date.now()}`;
    mutate(
      (prev) =>
        prev && {
          ...prev,
          messages: [...prev.messages, { _id: id, from: "staff", message, images: [], createdAt: new Date().toISOString(), seen: false }],
        },
      { revalidate: false }
    );
    setText("");
    if (inputRef.current) inputRef.current.style.height = "";
    deliver(id, message);
  };

  const groups = useMemo(() => {
    const out: { day: string; items: TChatMessage[] }[] = [];
    for (const m of messages) {
      const day = dayLabel(m.createdAt);
      if (out[out.length - 1]?.day !== day) out.push({ day, items: [] });
      out[out.length - 1].items.push(m);
    }
    return out;
  }, [messages]);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b px-2 py-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to chats" className="size-11 shrink-0 md:hidden">
          <ChevronLeftIcon className="size-5" />
        </Button>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 font-bold text-brand">
          {(data?.name ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold">{data?.name ?? " "}</h2>
          {data?.device && (
            <p className="truncate text-xs text-muted-foreground" title={data.device.ua}>
              Last bug from {data.device.screen} · {data.device.ua}
            </p>
          )}
        </div>
      </header>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/30 px-3 pb-3">
        {error ? (
          <ErrorState message={swrError(error, "Couldn't load this chat")} onRetry={() => mutate()} />
        ) : isLoading ? (
          <div className="space-y-3 pt-4">
            <Skeleton className="h-12 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
            <Skeleton className="h-16 w-3/4 rounded-2xl" />
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.day}>
              <div className="sticky top-0 z-10 flex justify-center pt-3">
                <span className="rounded-full bg-background/90 px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur">
                  {g.day}
                </span>
              </div>
              <ul>
                {g.items.map((m, i) => {
                  const prev = g.items[i - 1];
                  const next = g.items[i + 1];
                  return (
                    <Bubble
                      key={m._id}
                      m={m}
                      first={!prev || prev.from !== m.from || prev.type !== m.type}
                      last={!next || next.from !== m.from}
                      pending={pending[m._id]}
                      animate={!!seenIds.current && !seenIds.current.has(m._id)}
                      onRetry={(id) => bodies.current[id] && deliver(id, bodies.current[id])}
                    />
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      <div className="flex shrink-0 items-end gap-2 border-t bg-background p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <textarea
          ref={inputRef}
          value={text}
          rows={1}
          maxLength={2000}
          placeholder="Write a reply"
          aria-label="Reply"
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
          }}
          onKeyDown={(e) => {
            // Enter sends on a keyboard; Shift+Enter is a new line. Phones keep
            // Enter as a new line (their keyboards have no Shift habit).
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
              e.preventDefault();
              send();
            }
          }}
          className="max-h-[140px] min-h-11 flex-1 resize-none rounded-[22px] border bg-muted/40 px-4 py-2.5 text-[15px] leading-snug outline-none transition-colors focus:border-brand/40 focus:bg-background"
        />
        <Button
          variant="brand"
          size="icon"
          aria-label="Send reply"
          disabled={!text.trim()}
          onClick={send}
          className="size-11 shrink-0 rounded-full transition-transform active:scale-90"
        >
          <SendIcon className="size-5" />
        </Button>
      </div>
    </section>
  );
}

/**
 * The Suggestion box from the developer's side: one chat per student who has
 * written in. Phones show the list, then a chat; wider screens show both.
 */
export default function SuggestionsInbox() {
  const [active, setActive] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const { data, error, isLoading, mutate } = useSWR(
    ["dev-suggestions"],
    async () => (await api.get("dev-suggestions"))?.data?.data as TThreads,
    { ...LIST_SWR, refreshInterval: POLL_MS }
  );

  // Opening a chat clears its badge here without waiting for the next poll.
  const open = (userId: string) => {
    setActive(userId);
    mutate(
      (prev) => prev && { ...prev, threads: prev.threads.map((t) => (t.userId === userId ? { ...t, unread: 0 } : t)) },
      { revalidate: false }
    );
  };

  const clearImages = async () => {
    if (!window.confirm("Delete every image students attached, from Cloudinary? The messages stay.")) return;
    setClearing(true);
    try {
      const res = (await api.post("dev-suggestions"))?.data?.data;
      toast.success(`Cleared ${res?.cleared ?? 0} images`);
    } catch (err) {
      toast.error((err as Error)?.message || "Couldn't clear images");
    } finally {
      setClearing(false);
    }
  };

  const threads = data?.threads ?? [];

  return (
    <main className={cn("mx-auto flex h-[calc(100dvh-4rem)] w-full min-w-0 max-w-6xl flex-col px-0 sm:px-6 md:pb-6 md:pt-3", !active && "pt-3")}>
      {/* No max-md: variants here: the custom `short` screen in the Tailwind
          config turns them off, so phone-only hiding is hidden + md:… */}
      <div className={cn("px-4 sm:px-0", active && "hidden md:block")}>
        <PageHeader
          icon={<InboxIcon />}
          title="Suggestions"
          description={data ? (data.unread ? `${data.unread} unread from students` : "All caught up") : "Chats from the student app"}
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More actions" disabled={clearing}>
                  <EllipsisVerticalIcon className="size-5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={clearImages} className="gap-2 text-destructive focus:text-destructive">
                  <ImageOffIcon className="size-4" aria-hidden="true" /> Clear images
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      </div>

      <div className={cn("flex min-h-0 flex-1 overflow-hidden border-y bg-background md:mt-3 md:rounded-2xl md:border", !active && "mt-3")}>
        <aside className={cn("min-h-0 w-full flex-col md:flex md:w-80 md:shrink-0 md:border-r", active ? "hidden" : "flex")}>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {error ? (
              <ErrorState message={swrError(error, "Couldn't load chats")} onRetry={() => mutate()} />
            ) : isLoading ? (
              Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="mb-2 h-16 rounded-xl" />)
            ) : threads.length === 0 ? (
              <EmptyState icon={<InboxIcon />} title="No messages yet" description="Students' messages from the Suggestion box will show here." />
            ) : (
              threads.map((t) => <ThreadRow key={t.userId} t={t} active={t.userId === active} onOpen={() => open(t.userId)} />)
            )}
          </div>
        </aside>
        <div className={cn("min-h-0 flex-1", active ? "block" : "hidden md:block")}>
          {active ? (
            <ChatPane key={active} userId={active} onBack={() => setActive(null)} />
          ) : (
            <div className="hidden h-full items-center justify-center text-sm text-muted-foreground md:flex">
              Pick a chat to read and reply
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
