"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  GeneralSettingFormSchema,
  useGeneralSettingForm,
} from "./account-form.schema";
import { useAuth } from "@/context/auth-context";
import { updateProfile } from "@/service/auth.service";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

const AccountForm = () => {
  const { user } = useAuth();
  const router = useRouter();
  const form = useGeneralSettingForm(user);
  const { isSubmitting: isLoading } = form.formState;

  const onSubmit = async (values: GeneralSettingFormSchema) => {
    try {
      await updateProfile(values);
      toast({
        title: "Profile Updated!",
        variant: "success",
      });
      router.refresh();
    } catch (er) {
      toast({
        title: (er as any)?.message || "Something went wrong!",
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your first name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Enter your email" {...field} />
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
          Update
        </Button>
      </form>
    </Form>
  );
};

export default AccountForm;
