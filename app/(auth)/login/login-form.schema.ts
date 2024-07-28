import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

export const loginFormSchema = z.object({
  email: z.string().min(1, { message: "Username is required" }),
  password: z
    .string()
    .min(4, { message: "Password should be at least 4 characters long" }),
});

export type LoginFormSchema = z.infer<typeof loginFormSchema>;

export const useLoginForm = () =>
  useForm<LoginFormSchema>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
