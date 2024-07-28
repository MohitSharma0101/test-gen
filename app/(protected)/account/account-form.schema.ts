import { TUser } from "@/models/User";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

export const generalSettingFormSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name should have at least 2 characters" })
    .max(16, { message: "Name can't have more than 16 characters" }),
  email: z.string().email(),
});

export type GeneralSettingFormSchema = z.infer<typeof generalSettingFormSchema>;

export const useGeneralSettingForm = (user: TUser | null) =>
  useForm<GeneralSettingFormSchema>({
    resolver: zodResolver(generalSettingFormSchema),
    defaultValues: {
      name: user?.name,
      email: user?.email,
    },
  });
