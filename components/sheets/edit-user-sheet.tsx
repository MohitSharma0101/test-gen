"use client";

import React, { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "../ui/button";
import LabelInput from "../ui/label-input";
import { ResponsiveDrawer } from "../ui/responsive-drawer";
import { TUser } from "@/models/User";
import { api, ENDPOINT } from "@/lib/api";
import { toast } from "../ui/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  defaultUser?: Partial<TUser>;
  selectedBatchIds?: string[];
  onSuccess?: () => void;
};

type TField = {
  label: string;
  key: keyof TUser;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
};

// Grouped the way the information is thought about; same fields as before
const SECTIONS: { title: string; fields: TField[] }[] = [
  {
    title: "Student",
    fields: [
      { label: "Name", key: "name", placeholder: "Full name" },
      { label: "Phone", key: "phone", type: "tel", inputMode: "tel", placeholder: "10-digit number" },
      { label: "Email", key: "email", type: "email", inputMode: "email", placeholder: "name@example.com" },
      // Free text in this format, as before: a calendar is slow for a birth year
      { label: "Date of birth", key: "dob", inputMode: "numeric", placeholder: "YYYY-MM-DD" },
    ],
  },
  {
    title: "Parents",
    fields: [
      { label: "Father's name", key: "fatherName" },
      { label: "Mother's name", key: "motherName" },
      { label: "Parent phone", key: "parentPhone", type: "tel", inputMode: "tel", placeholder: "Used for WhatsApp and calls" },
    ],
  },
  { title: "School", fields: [{ label: "School", key: "school" }] },
];

const EditUserSheet = ({ defaultUser, open, selectedBatchIds, onOpenChange, onSuccess }: Props) => {
  const [user, setUser] = useState(defaultUser);
  const [saving, setSaving] = useState(false);
  const editMode = !!defaultUser;
  const canSave = Boolean(user?.name?.trim()) && !saving;

  const onUpdateUser = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    try {
      const payload = {
        name: user.name?.trim(),
        dob: user.dob,
        parentPhone: user.parentPhone,
        phone: user.phone,
        email: user.email,
        fatherName: user.fatherName,
        motherName: user.motherName,
        school: user.school,
      };
      if (editMode) {
        await api.put(ENDPOINT.users, { _id: user._id, ...payload });
      } else {
        await api.post(ENDPOINT.users, { user: payload, batchIds: selectedBatchIds });
      }
      onSuccess?.();
      toast({ title: editMode ? "Student updated" : "Student added", variant: "success" });
      onOpenChange(false);
    } catch (err) {
      // Stays open so what was typed isn't lost
      toast({
        title: (err as Error)?.message || (editMode ? "Couldn't update the student" : "Couldn't add the student"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onUserChange = (key: keyof TUser, value: string) => setUser((prev) => ({ ...prev, [key]: value }));

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={editMode ? "Edit student" : "Add a student"}
      description={editMode ? `${defaultUser?.name ?? ""}${defaultUser?.userId ? ` · ${defaultUser.userId}` : ""}` : "Only the name is required."}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="brand" className="h-11 flex-1 gap-2" onClick={onUpdateUser} disabled={!canSave}>
            {saving && <Loader2Icon className="size-4 animate-spin" />}
            {editMode ? "Save changes" : "Add student"}
          </Button>
        </div>
      }
    >
      <form
        className="space-y-5 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          onUpdateUser();
        }}
      >
        {SECTIONS.map((section) => (
          <fieldset key={section.title} className="space-y-3">
            <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{section.title}</legend>
            {section.fields.map((field) => (
              <LabelInput
                key={field.key}
                label={field.label}
                type={field.type ?? "text"}
                inputMode={field.inputMode}
                placeholder={field.placeholder ?? ""}
                autoComplete="off"
                value={(user?.[field.key] as string) ?? ""}
                onChange={(e) => onUserChange(field.key, e.target.value)}
                inputClassName="h-11 text-base sm:text-sm"
              />
            ))}
          </fieldset>
        ))}
        {/* Enter submits from any field */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </ResponsiveDrawer>
  );
};

export default EditUserSheet;
