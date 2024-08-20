"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { resetPassword } from "@/service/auth.service";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import {
  TResetPasswordFormSchema,
  useResetPasswordForm,
} from "./reset-password-form.schema";
import PasswordInput from "@/components/ui/password-input";

const ResetPasswordForm = () => {
  const { user } = useAuth();
  const router = useRouter();
  const form = useResetPasswordForm();
  const { isSubmitting: isLoading } = form.formState;

  const onSubmit = async (values: TResetPasswordFormSchema) => {
    try {
      await resetPassword(values);
      toast({
        title: "Password Reset!",
        variant: "success",
      });
      router.refresh();
    } catch (err: any) {
      console.log("err: ", err);
      toast({
        title: err?.message || "Something went wrong!",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4 max-w-[600px]"
      >
        <div className="outline-primary w-[100px] h-[100px] text-3xl mx-auto mb-8 rounded-full bg-slate-400 flex items-center justify-center text-white">
          {user?.name.slice(0, 1)}
        </div>
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <PasswordInput
                  label="Current Password"
                  placeholder="Enter your first name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <PasswordInput
                  label="New Password"
                  placeholder="Enter your first name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmNewPassword"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <PasswordInput
                  label="Confirm Password"
                  placeholder="Enter your first name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          disabled={isLoading}
          className="w-fit mt-2 ml-auto flex gap-2 col-span-2"
          type="submit"
        >
          {isLoading && <Loader2 className="animate-spin w-4 h-4" />}
          Reset
        </Button>
      </form>
    </Form>
  );
};

export default ResetPasswordForm;
