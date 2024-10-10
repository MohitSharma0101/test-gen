"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useForm } from "react-hook-form";
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
import { Loader2Icon } from "lucide-react";
import SelectCompact from "@/components/ui/select-compact";
import { USER_ROLES } from "@/models/UserRole";
import { TUser } from "@/models/User";

export const RegisterUserSchema = z.object({
  name: z.string().min(1).max(9999),
  email: z.string().email().min(1).max(255),
  password: z.string(),
  confirmPassword: z.string(),
  role: z.string(),
});

export type TRegisterUserSchema = z.infer<typeof RegisterUserSchema>;

type Props = {
  user?: TUser;
  onSubmit: (values: TRegisterUserSchema) => void;
};

export function RegisterUserForm({ user, onSubmit }: Props) {
  const editMode = user ? true : false;
  const form = useForm<TRegisterUserSchema>({
    resolver: zodResolver(RegisterUserSchema),
    defaultValues: {
      name: user?.name,
      email: user?.email,
      role: user?.role,
      password: "",
      confirmPassword: "",
    },
  });
  const {
    formState: { isSubmitting },
  } = form;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="" {...field} />
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
                <Input type="email" placeholder="Email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <SelectCompact
                  placeholder="Select a role"
                  options={USER_ROLES.map((role) => ({
                    label: role.toUpperCase(),
                    value: role,
                  }))}
                  onChange={field.onChange}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!editMode && (
          <>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder="" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input placeholder="" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          onClick={() => console.log("clicked")}
        >
          {isSubmitting && (
            <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
          )}
          {editMode ? "Update" : "Add"} User
        </Button>
      </form>
    </Form>
  );
}
