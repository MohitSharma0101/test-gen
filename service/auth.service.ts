import { LoginFormSchema } from "@/app/(auth)/login/login-form.schema";
import type { TGeneralSettingFormSchema } from "@/app/(protected)/account/account-form.schema";
import type { TResetPasswordFormSchema } from "@/app/(protected)/reset-password/reset-password-form.schema";
import { api, ENDPOINT, setUserToken } from "@/lib/api";

export async function login(values: LoginFormSchema) {
  const res = (await api.post(ENDPOINT.login, values)).data;
  if (res) {
    setUserToken(res?.token);
  }
  return res;
}

export async function updateProfile(values: TGeneralSettingFormSchema) {
  return (await api.put(ENDPOINT.user, values)).data;
}

export async function resetPassword(values: TResetPasswordFormSchema) {
  return (await api.put(ENDPOINT.resetPassword, values)).data;
}