import { LoginFormSchema } from "@/app/(auth)/login/login-form.schema";
import { api, ENDPOINT, setUserToken } from "@/lib/api";

export async function login(values: LoginFormSchema) {
  const res = (await api.post(ENDPOINT.login, values)).data;
  if (res) {
    setUserToken(res?.token);
  }
  return res;
}
