"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";
import { LoginFormSchema, useLoginForm } from "./login-form.schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import PasswordInput from "@/components/ui/password-input";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { Loader2Icon } from "lucide-react";
import { login } from "@/service/auth.service";

type Props = {};

const LoginForm = (props: Props) => {
  const form = useLoginForm();
  const {
    formState: { isSubmitting },
  } = form;
  const router = useRouter();
  async function onSubmit(values: LoginFormSchema) {
    const body = {
      email: values.email,
      password: values.password,
    };
    try {
      const res = await login(body);
      if (res) {
        toast({
          title: "Logged In!",
          variant: "success",
          description: "Successfully logged in.",
        });
        router.refresh();
      }
    } catch (e: any) {
      toast({
        title: "Oops!",
        variant: "destructive",
        description: e?.message ?? "Something went wrong!",
      });
    }
  }

  return (
    <>
      <Form {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your email or mobile number"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <PasswordInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button disabled={isSubmitting} type="submit" className="w-full">
            {isSubmitting && (
              <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
            )}
            Login
          </Button>
        </form>
      </Form>
    </>
  );
};

export default LoginForm;
