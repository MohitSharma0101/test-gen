"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { TAccount } from "@/models/Account";
import { COURSES, Role, SUBJECT_MAP } from "@/data/const";
import { Button } from "../ui/button";
import LabelInput from "../ui/label-input";
import { ResponsiveDrawer } from "../ui/responsive-drawer";
import { toast } from "../ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";
import { cn, courseLabel } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAccount?: TAccount;
  onSave?: () => void;
};

type TCourses = NonNullable<TAccount["courses"]>;

const ROLES = [
  { value: Role.TEACHER, label: "Teacher", hint: "Papers and daily work" },
  { value: Role.ADMIN, label: "Admin", hint: "Everything, incl. fees and accounts" },
];

const chip = (on: boolean) =>
  cn(
    "h-9 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
    on ? "border-brand bg-brand-soft text-brand" : "bg-background text-muted-foreground hover:bg-muted"
  );

// Name, role and which class/subjects the account works with.
// Subjects are toggled in place (one tap) instead of pick class → pick subject → Add.
export default function EditAccountSheet({ open, onOpenChange, defaultAccount, onSave }: Props) {
  const [name, setName] = useState(defaultAccount?.name ?? "");
  const [role, setRole] = useState<Role>(defaultAccount?.role ?? Role.TEACHER);
  const [courses, setCourses] = useState<TCourses>(
    (defaultAccount?.courses ?? []).filter((c) => c?.course && c.subjects?.length)
  );
  const [saving, setSaving] = useState(false);

  const has = (course: string, subject: string) => courses.some((c) => c.course === course && c.subjects.includes(subject));

  const toggle = (course: string, subject: string) =>
    setCourses((prev) => {
      const existing = prev.find((c) => c.course === course);
      if (!existing) return [...prev, { course, subjects: [subject] }];
      const subjects = existing.subjects.includes(subject)
        ? existing.subjects.filter((s) => s !== subject)
        : [...existing.subjects, subject];
      return prev.map((c) => (c.course === course ? { ...c, subjects } : c)).filter((c) => c.subjects.length > 0);
    });

  const count = courses.reduce((n, c) => n + c.subjects.length, 0);

  const onSubmit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.post(ENDPOINT.accounts, {
        accountId: defaultAccount?._id,
        name: name.trim(),
        role,
        courses,
      });
      toast({ title: "Account updated", variant: "success" });
      onSave?.();
    } catch (err) {
      // Stays open so the changes aren't lost
      toast({ title: "Couldn't update the account", description: (err as Error)?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Edit account"
      description={`@${defaultAccount?.username ?? ""}`}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="brand" className="h-11 flex-1 gap-2" onClick={onSubmit} disabled={saving}>
            {saving && <Loader2Icon className="size-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      }
    >
      <div className="space-y-5 p-4">
        <LabelInput
          label="Name"
          placeholder="Shown in the app"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          inputClassName="h-11 text-base sm:text-sm"
        />

        <fieldset>
          <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</legend>
          <div role="radiogroup" aria-label="Role" className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => {
              const active = role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setRole(r.value)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                    active ? "border-brand bg-brand-soft" : "bg-card hover:bg-muted"
                  )}
                >
                  <span className={cn("block font-bold", active && "text-brand")}>{r.label}</span>
                  <span className="block text-xs text-muted-foreground">{r.hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Classes & subjects {count ? `· ${count}` : ""}
          </legend>
          <p className="text-xs text-muted-foreground">
            {count ? "Only these show up for this account." : "None picked: this account sees every class and subject."}
          </p>
          {COURSES.map((course) => (
            <div key={course} className="space-y-1.5">
              <p className="text-sm font-semibold">{courseLabel(course)}</p>
              <div className="flex flex-wrap gap-2">
                {(SUBJECT_MAP[course] ?? []).map((subject) => {
                  const on = has(course, subject);
                  return (
                    <button
                      key={subject}
                      type="button"
                      aria-pressed={on}
                      aria-label={`${courseLabel(course)} ${subject}`}
                      onClick={() => toggle(course, subject)}
                      className={chip(on)}
                    >
                      {subject}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {count > 0 && (
            <Button variant="ghost" size="sm" className="h-8 px-2 text-brand" onClick={() => setCourses([])}>
              Clear all
            </Button>
          )}
        </fieldset>
      </div>
    </ResponsiveDrawer>
  );
}
