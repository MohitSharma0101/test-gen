import { TUserWithFeeSummary } from "@/models/User";
import { Sheet, SheetContent } from "../ui/sheet";
import LabelInput from "../ui/label-input";
import { useState } from "react";
import { Button } from "../ui/button";
import { toast } from "../ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";

type Props = {
  user: TUserWithFeeSummary;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const AddFeeSheet = ({ user, open, onOpenChange, onSuccess }: Props) => {
  const [amount, setAmount] = useState<number>();
  const [loading, setLoading] = useState(false);

  const onAddPayment = async () => {
    try {
      setLoading(true);
      await api.post(ENDPOINT.fees, {
        studentId: user._id,
        amount,
      });
      toast({
        title: "Success",
        variant: "success",
        description: "Payment added successfully",
      });
      onOpenChange?.(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response.data.error ?? "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={"right"}
        className="p-0 flex flex-col gap-2 max-h-screen"
      >
        <div className="text-sm font-medium px-2 py-3 bg-slate-200">
          Fee Details for <strong>{user.name}</strong>
        </div>
        <div className="flex flex-col gap-2 px-3 flex-grow overflow-auto">
          <LabelInput
            label="Amount (₹)"
            placeholder="Enter amount"
            type="number"
            disabled={loading}
            value={amount}
            onChange={(e) => {
              const value = e.target.value;
              setAmount(Number(value));
            }}
          />
          <Button disabled={loading || !amount} onClick={onAddPayment}>
            Add Payment
          </Button>
          <div className="py-2 mt-2 border-t border-slate-200">
            <p className="text-base font-semibold">Payment History</p>
            <div className="flex flex-col my-2 bg-slate-100 rounded-md items-center justify-center">
              {user.feeSummary?.payments?.map((payment, index) => (
                <div
                  key={index}
                  className="py-2 px-3 flex items-center justify-between w-full border-b last:border-none"
                >
                  <p className="text-lg font-medium">₹{payment.amount}</p>
                  <p className="text-sm text-slate-500 font-medium">{payment.date}</p>
                </div>
              )) ?? (
                <p className="text-sm text-slate-500 my-4">No payments found</p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddFeeSheet;
