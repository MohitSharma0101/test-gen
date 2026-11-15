"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  BrainCircuitIcon,
  CalendarCheck2Icon,
  IndianRupeeIcon,
  MonitorCheckIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  TrophyIcon,
} from "lucide-react";
import AddFeeSheet from "@/components/sheets/add-fee-sheet";
import EditUserSheet from "@/components/sheets/edit-user-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state-message";
import WAButton from "@/components/ui/wa-button";
import { ColumnChart } from "@/components/charts/column-chart";
import { LineChart } from "@/components/charts/line-chart";
import { StudentInsightsCard } from "@/components/insights/student-insights";
import useStudent, { TStudentSummary } from "@/hooks/useStudent";
import { cn, formatDay, formatINR } from "@/lib/utils";
import type { TUser, TUserWithFeeSummary } from "@/models/User";

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null);
const tone = (p: number | null, good = 75) =>
  p === null ? "text-muted-foreground" : p >= good ? "text-emerald-700" : p >= good - 25 ? "text-amber-700" : "text-red-700";

const Section = ({ title, icon, action, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) => (
  <section className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm">
    <div className="mb-3 flex items-center gap-2">
      <span className="text-muted-foreground [&>svg]:size-4" aria-hidden="true">
        {icon}
      </span>
      <h2 className="flex-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const Stat = ({ label, value, hint, className }: { label: string; value: string; hint?: string; className?: string }) => (
  <div className="rounded-xl border bg-card p-3 shadow-sm">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className={cn("mt-0.5 truncate text-xl font-bold tabular-nums", className)}>{value}</p>
    {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

// Long lists show the newest few; the rest one tap away
const SHOW_FIRST = 5;
const SeeMore = ({ total, open, onToggle }: { total: number; open: boolean; onToggle: () => void }) =>
  total > SHOW_FIRST ? (
    <Button variant="ghost" className="mt-1 h-10 w-full text-brand" onClick={onToggle} aria-expanded={open}>
      {open ? "Show less" : `See all ${total}`}
    </Button>
  ) : null;

const Muted = ({ children }: { children: React.ReactNode }) => <p className="py-4 text-center text-sm text-muted-foreground">{children}</p>;

// One student's whole picture: attendance, results, online tests, fees and
// contacts, which used to be spread across five pages.
export default function StudentPage({ params }: { params: { id: string } }) {
  const { student, loading, error, refresh } = useStudent(params?.id);
  const [editOpen, setEditOpen] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);

  if (error && !student) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6">
        <ErrorState message={error} onRetry={refresh} />
      </main>
    );
  }
  if (!student) return <StudentSkeleton busy={loading} />;
  return (
    <StudentView
      s={student}
      editOpen={editOpen}
      setEditOpen={setEditOpen}
      feeOpen={feeOpen}
      setFeeOpen={setFeeOpen}
      refresh={refresh}
    />
  );
}

const StudentView = ({
  s,
  editOpen,
  setEditOpen,
  feeOpen,
  setFeeOpen,
  refresh,
}: {
  s: TStudentSummary;
  editOpen: boolean;
  setEditOpen: (o: boolean) => void;
  feeOpen: boolean;
  setFeeOpen: (o: boolean) => void;
  refresh: () => void;
}) => {
  const u = s.user;
  // Header shows current batches; archived ones still count in the history
  // below (their attendance and results) and in fees, as on the Fees page
  const batches = (u.batchIds ?? []).filter(Boolean);
  const activeBatches = batches.filter((b) => !(b as { archived?: boolean }).archived);
  const days = s.attendance.days;
  const present = days.filter((d) => d.present).length;
  const attendancePct = pct(present, days.length);
  const recentDays = days.slice(0, 30).reverse(); // oldest → newest, left to right
  const absences = days.filter((d) => !d.present).slice(0, 5);

  // Attendance % per month, last 6 months that had classes
  const months = (() => {
    const map = new Map<string, { present: number; total: number }>();
    for (const d of days) {
      const k = d.date.slice(0, 7);
      const m = map.get(k) ?? { present: 0, total: 0 };
      m.total += 1;
      if (d.present) m.present += 1;
      map.set(k, m);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([k, m]) => {
        const d = new Date(`${k}-01T12:00:00Z`);
        return {
          key: k,
          label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }),
          short: d.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }),
          value: pct(m.present, m.total),
          detail: <p className="text-muted-foreground">{m.present} of {m.total} days present</p>,
        };
      });
  })();

  const taken = s.results.filter((r) => r.marks !== null && r.totalMarks > 0);
  const testPct = taken.length ? Math.round(taken.reduce((sum, r) => sum + ((r.marks as number) / r.totalMarks) * 100, 0) / taken.length) : null;
  // Last 12 tests, oldest → newest; an absence leaves a gap in the student's line
  const resultPoints = s.results.filter((r) => r.totalMarks > 0).slice(0, 12).reverse();

  const online = s.onlineTests.filter((t) => t.submitted && t.totalMarks);
  // Oldest → newest by the test's own date (sheets arrive by upload time)
  const onlineItems = [...online]
    .sort((p, q) => String(p.date ?? "").localeCompare(String(q.date ?? "")))
    .slice(-12)
    .map((t) => ({
    key: t._id,
    label: t.title,
    short: formatDay(t.date).replace(/ \d{4}$/, ""),
    value: pct(t.obtainedMarks ?? 0, t.totalMarks as number),
    detail: (
      <p className="text-muted-foreground">
        {t.obtainedMarks ?? 0}/{t.totalMarks} · {t.correct ?? 0} right, {t.incorrect ?? 0} wrong
      </p>
    ),
  }));
  const onlinePct = online.length
    ? Math.round(online.reduce((sum, t) => sum + ((t.obtainedMarks ?? 0) / (t.totalMarks as number)) * 100, 0) / online.length)
    : null;

  const feeUser = useMemo(
    () =>
      ({
        ...u,
        batchIds: batches,
        feeSummary: { ...s.fees, paid: s.fees.totalPaid, payments: s.fees.payments, _id: "", studentId: u._id },
      }) as unknown as TUserWithFeeSummary,
    [u, batches, s.fees]
  );

  const [allResults, setAllResults] = useState(false);
  const [allOnline, setAllOnline] = useState(false);

  const initials = (u.name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-4 overflow-x-clip px-4 pb-12 pt-4 sm:px-6">
      <Link href="/users" className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Users
      </Link>

      <header className="flex flex-wrap items-center gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-xl font-bold text-brand">{initials}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold">{u.name || "Student"}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {u.userId}
            {activeBatches.length ? ` · ${activeBatches.map((b) => b.name).join(", ")}` : " · No batch"}
          </p>
        </div>
        {/* On phones the parent's numbers are a long scroll away: keep them up here */}
        {u.parentPhone && (
          <div className="flex items-center gap-1 lg:hidden">
            <WAButton phone={u.parentPhone} label="WhatsApp parent" className="size-10 rounded-full hover:bg-emerald-50" />
            <a href={`tel:${u.parentPhone}`} aria-label="Call parent" className={cn(buttonVariants({ variant: "outline" }), "size-10 p-0 text-brand")}>
              <PhoneIcon className="size-4" />
            </a>
          </div>
        )}
        <Button variant="outline" className="h-10 gap-2" onClick={() => setEditOpen(true)}>
          <PencilIcon className="size-4" /> <span className="hidden sm:inline">Edit</span>
          <span className="sr-only sm:hidden">Edit student</span>
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
        <Stat
          label="Attendance"
          value={attendancePct === null ? "—" : `${attendancePct}%`}
          hint={days.length ? `${present} of ${days.length} days` : "No attendance yet"}
          className={tone(attendancePct)}
        />
        <Stat
          label="Test average"
          value={testPct === null ? "—" : `${testPct}%`}
          hint={`${taken.length} test${taken.length === 1 ? "" : "s"}`}
          className={tone(testPct, 60)}
        />
        <Stat
          label="Online tests"
          value={onlinePct === null ? "—" : `${onlinePct}%`}
          hint={`${online.length} taken`}
          className={tone(onlinePct, 60)}
        />
        <Stat
          label="Fees due"
          value={s.fees.due > 0 ? formatINR(s.fees.due) : "Nil"}
          hint={`Paid ${formatINR(s.fees.totalPaid)} of ${formatINR(s.fees.totalFee)}`}
          className={s.fees.due > 0 ? "text-red-700" : "text-emerald-700"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start [&>*]:min-w-0">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Attendance" icon={<CalendarCheck2Icon />}>
            {days.length === 0 ? (
              <Muted>No attendance marked for this student&apos;s batches yet.</Muted>
            ) : (
              <div className="space-y-4">
                {s.attendance.byBatch.length > 1 &&
                  s.attendance.byBatch.map((b) => {
                    const p = pct(b.present, b.total);
                    return (
                      <div key={b.batch} className="flex items-center gap-3 text-sm">
                        <span className="w-28 shrink-0 truncate">{b.batch}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${p ?? 0}%` }} />
                        </div>
                        <span className={cn("w-12 text-right font-semibold tabular-nums", tone(p))}>{p === null ? "—" : `${p}%`}</span>
                      </div>
                    );
                  })}
                {months.length > 1 && <ColumnChart items={months} color="var(--viz-1)" caption="Attendance per month" />}
                <div>
                  <p className="mb-1.5 text-xs text-muted-foreground">Last {recentDays.length} class days</p>
                  <div className="flex flex-wrap gap-1" role="list" aria-label="Recent attendance">
                    {recentDays.map((d, i) => (
                      <span
                        key={`${d.date}-${d.batch}-${i}`}
                        role="listitem"
                        title={`${formatDay(d.date)} · ${d.batch} · ${d.present ? "Present" : "Absent"}`}
                        aria-label={`${formatDay(d.date)} ${d.present ? "present" : "absent"}`}
                        className={cn("size-5 rounded", d.present ? "bg-emerald-500/80" : "bg-red-500")}
                      />
                    ))}
                  </div>
                </div>
                {absences.length > 0 && (
                  <p className="text-sm">
                    <span className="font-semibold text-red-700">Recent absences: </span>
                    {absences.map((d) => formatDay(d.date)).join(", ")}
                  </p>
                )}
              </div>
            )}
          </Section>

          <Section title="Results" icon={<TrophyIcon />}>
            {s.results.length === 0 ? (
              <Muted>No results for this student yet.</Muted>
            ) : (
              <>
                {resultPoints.length > 1 && (
                  <LineChart
                    className="mb-4"
                    caption="Test scores compared with the batch average"
                    points={resultPoints.map((r) => ({ label: r.name, short: formatDay(r.date).replace(/ \d{4}$/, "") }))}
                    series={[
                      { name: u.name?.split(" ")[0] || "Student", color: "var(--viz-1)", values: resultPoints.map((r) => (r.marks === null ? null : (r.marks / r.totalMarks) * 100)) },
                      { name: "Batch average", color: "var(--viz-2)", values: resultPoints.map((r) => (r.batchAverage === null ? null : (r.batchAverage / r.totalMarks) * 100)) },
                    ]}
                    detail={(i) => {
                      const r = resultPoints[i];
                      return (
                        <p className="mt-1 text-muted-foreground">
                          {r.marks === null ? "Absent" : `${r.marks}/${r.totalMarks}${r.rank ? ` · rank ${r.rank}/${r.outOf}` : ""}`}
                        </p>
                      );
                    }}
                  />
                )}
                <ul className="divide-y">
                  {(allResults ? s.results : s.results.slice(0, SHOW_FIRST)).map((r) => {
                    const p = r.marks !== null && r.totalMarks ? Math.round((r.marks / r.totalMarks) * 100) : null;
                    return (
                      <li key={r._id} className="flex items-center gap-3 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{r.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[r.subject, formatDay(r.date), r.batch].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        {r.marks === null ? (
                          <span className="text-sm font-medium text-muted-foreground">Absent</span>
                        ) : (
                          <span className="text-right">
                            <span className={cn("block text-sm font-bold tabular-nums", tone(p, 60))}>
                              {r.marks}/{r.totalMarks}
                            </span>
                            <span className="block text-[11px] tabular-nums text-muted-foreground">
                              {r.rank ? `Rank ${r.rank}/${r.outOf}` : ""}
                              {r.batchAverage !== null ? ` · avg ${r.batchAverage}` : ""}
                            </span>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <SeeMore total={s.results.length} open={allResults} onToggle={() => setAllResults((v) => !v)} />
              </>
            )}
          </Section>

          <Section title="Online tests" icon={<MonitorCheckIcon />}>
            {s.onlineTests.length === 0 ? (
              <Muted>No online tests taken yet.</Muted>
            ) : (
              <>
              {onlineItems.length > 1 && <ColumnChart className="mb-3" items={onlineItems} color="var(--viz-1)" caption="Online test scores" />}
              <ul className="divide-y">
                {(allOnline ? s.onlineTests : s.onlineTests.slice(0, SHOW_FIRST)).map((t) => (
                  <li key={t._id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{t.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {formatDay(t.date)}
                        {t.submitted && t.correct !== null ? ` · ${t.correct} right, ${t.incorrect ?? 0} wrong, ${t.skipped ?? 0} skipped` : ""}
                      </span>
                    </span>
                    {t.submitted ? (
                      <span className="text-sm font-bold tabular-nums">
                        {t.obtainedMarks ?? 0}/{t.totalMarks ?? "—"}
                      </span>
                    ) : (
                      <span className="text-sm text-amber-700">Not submitted</span>
                    )}
                  </li>
                ))}
              </ul>
              <SeeMore total={s.onlineTests.length} open={allOnline} onToggle={() => setAllOnline((v) => !v)} />
              </>
            )}
          </Section>

          {s.onlineTests.length > 0 && (
            <Section title="Online test insights" icon={<BrainCircuitIcon />}>
              <StudentInsightsCard studentId={u._id} studentName={u.name?.split(" ")[0] || "Student"} />
            </Section>
          )}
        </div>

        <div className="space-y-4">
          <Section title="Contact" icon={<PhoneIcon />}>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Parent phone</dt>
                {u.parentPhone ? (
                  <dd className="mt-1 flex items-center gap-2">
                    <span className="flex-1 font-medium tabular-nums">{u.parentPhone}</span>
                    <WAButton phone={u.parentPhone} label="WhatsApp parent" className="size-10 rounded-full hover:bg-emerald-50" />
                    <a href={`tel:${u.parentPhone}`} className={cn(buttonVariants({ variant: "outline" }), "h-10 gap-1.5 px-3 text-brand")}>
                      <PhoneIcon className="size-4" aria-hidden="true" /> Call
                    </a>
                  </dd>
                ) : (
                  <dd className="text-amber-700">Not saved</dd>
                )}
              </div>
              {[
                ["Student phone", u.phone],
                ["Father", u.fatherName],
                ["Mother", u.motherName],
                ["School", u.school],
                ["Date of birth", u.dob],
                ["Email", u.email],
                ["Joined", u.createdAt ? formatDay(u.createdAt) : ""],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="break-words font-medium">{k === "Student phone" ? <a href={`tel:${v}`} className="text-brand underline-offset-2 hover:underline">{v}</a> : v}</dd>
                  </div>
                ))}
            </dl>
          </Section>

          <Section
            title="Fees"
            icon={<IndianRupeeIcon />}
            action={
              <Button variant="outline" className="h-8 gap-1 px-2.5 text-brand" onClick={() => setFeeOpen(true)}>
                <PlusIcon className="size-4" /> Payment
              </Button>
            }
          >
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                { k: "Total", v: formatINR(s.fees.totalFee) },
                { k: "Paid", v: formatINR(s.fees.totalPaid), c: "text-emerald-700" },
                { k: "Due", v: s.fees.due > 0 ? formatINR(s.fees.due) : "Nil", c: s.fees.due > 0 ? "text-red-700" : "text-emerald-700" },
              ].map((x) => (
                <div key={x.k} className="rounded-lg bg-muted/50 px-1 py-2">
                  <dt className="text-[11px] text-muted-foreground">{x.k}</dt>
                  <dd className={cn("truncate text-sm font-bold tabular-nums", x.c)}>{x.v}</dd>
                </div>
              ))}
            </dl>
            {s.fees.payments.length > 0 && (
              <ul className="mt-3 divide-y text-sm">
                {[...s.fees.payments]
                  .reverse()
                  .slice(0, 5)
                  .map((p, i) => (
                    <li key={i} className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">
                        {formatDay(p.date)}
                        {p.mode ? ` · ${p.mode}` : ""}
                      </span>
                      <span className="font-semibold tabular-nums">{formatINR(p.amount)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      {editOpen && (
        <EditUserSheet
          defaultUser={{ ...(u as unknown as TUser), batchIds: batches.map((b) => b._id) as unknown as TUser["batchIds"] }}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={refresh}
        />
      )}
      {feeOpen && <AddFeeSheet user={feeUser} open={feeOpen} onOpenChange={setFeeOpen} onSuccess={refresh} />}
    </main>
  );
};

const StudentSkeleton = ({ busy }: { busy: boolean }) => (
  <main className="mx-auto w-full max-w-6xl space-y-4 px-4 pt-4 sm:px-6" aria-busy={busy} aria-label="Loading student">
    <Skeleton className="h-9 w-24" />
    <div className="flex items-center gap-3">
      <Skeleton className="size-14 rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  </main>
);
