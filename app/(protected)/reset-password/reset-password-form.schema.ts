import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

export const ResetPasswordFormSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: z
      .string()
      .min(6, { message: "Password should have at least 6 characters" })
      .max(16, { message: "Password can't have more than 16 characters" }),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ["confirmNewPassword"],
  });

export type TResetPasswordFormSchema = z.infer<typeof ResetPasswordFormSchema>;

export const useResetPasswordForm = () =>
  useForm<TResetPasswordFormSchema>({
    resolver: zodResolver(ResetPasswordFormSchema),
  });
