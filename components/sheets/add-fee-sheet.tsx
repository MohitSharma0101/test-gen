"use client";

import { useState } from "react";
import { Loader2Icon, ReceiptIcon } from "lucide-react";
import { TUserWithFeeSummary } from "@/models/User";
import { Button } from "../ui/button";
import LabelInput from "../ui/label-input";
import { ResponsiveDrawer } from "../ui/responsive-drawer";
import { EmptyState } from "../ui/state-message";
import { toast } from "../ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";
import { cn, formatINR } from "@/lib/utils";

type Props = {
  user: TUserWithFeeSummary;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const num = (v?: number) => (Number.isFinite(v) ? (v as number) : 0);

// "2026-11-14" → "14 Nov 2026"; anything unparseable is shown as stored
const formatDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

// One student's fee: where it stands, record a payment, past payments
const AddFeeSheet = ({ user, open = false, onOpenChange, onSuccess }: Props) => {
  // Kept as typed (digits only) so the field can be empty
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const total = num(user.feeSummary?.totalFee);
  const paid = num(user.feeSummary?.totalPaid);
  const due = num(user.feeSummary?.due);
  const payments = [...(user.feeSummary?.payments ?? [])].reverse(); // newest first

  const value = Number(amount);
  const canSave = amount !== "" && value > 0 && !saving;

  const onAddPayment = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await api.post(ENDPOINT.fees, { studentId: user._id, amount: value });
      toast({ title: `${formatINR(value)} recorded`, description: user.name, variant: "success" });
      onSuccess?.();
      onOpenChange?.(false);
    } catch (err) {
      // Stays open with the amount kept
      toast({ title: "Couldn't record the payment", description: (err as Error)?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={(o) => onOpenChange?.(o)}
      title={user.name || "Fees"}
      description={user.fatherName ? `Father: ${user.fatherName}` : "Fee details"}
      footer={
        <Button variant="brand" className="h-11 w-full gap-2" onClick={onAddPayment} disabled={!canSave}>
          {saving && <Loader2Icon className="size-4 animate-spin" />}
          {value > 0 ? `Record ${formatINR(value)}` : "Record payment"}
        </Button>
      }
    >
      <div className="space-y-5 p-4">
        <dl className="grid grid-cols-3 divide-x rounded-xl border bg-card text-center shadow-sm">
          {[
            { label: "Total", value: formatINR(total) },
            { label: "Paid", value: formatINR(paid), className: "text-emerald-700" },
            { label: "Due", value: due > 0 ? formatINR(due) : "Nil", className: due > 0 ? "text-red-700" : "text-emerald-700" },
          ].map((s) => (
            <div key={s.label} className="px-2 py-3">
              <dt className="text-xs font-medium text-muted-foreground">{s.label}</dt>
              <dd className={cn("mt-0.5 truncate font-bold tabular-nums", s.className)}>{s.value}</dd>
            </div>
          ))}
        </dl>

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            onAddPayment();
          }}
        >
          <LabelInput
            label="Amount received (₹)"
            placeholder="0"
            inputMode="numeric"
            autoComplete="off"
            value={amount}
            disabled={saving}
            // Digits only: no negatives, decimals or letters reach the API
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").replace(/^0+/, ""))}
            inputClassName="h-12 text-lg font-bold tabular-nums"
          />
          {due > 0 && (
            <button
              type="button"
              onClick={() => setAmount(String(due))}
              className="h-9 rounded-full border px-3 text-sm font-medium text-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Full due · {formatINR(due)}
            </button>
          )}
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>

        <section aria-labelledby="fee-history" className="space-y-2">
          <h3 id="fee-history" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Payments {payments.length ? `· ${payments.length}` : ""}
          </h3>
          {payments.length === 0 ? (
            <EmptyState className="py-6" icon={<ReceiptIcon />} title="No payments yet" />
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {payments.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="text-sm text-muted-foreground">
                    {formatDate(p.date)}
                    {p.mode ? ` · ${p.mode}` : ""}
                  </span>
                  <span className="font-bold tabular-nums">{formatINR(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ResponsiveDrawer>
  );
};

export default AddFeeSheet;
