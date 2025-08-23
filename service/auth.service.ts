import { api, ENDPOINT, setUserToken, deleteUserToken } from "@/lib/api";

async function login(values: { username: string; password: string }) {
  const res = (await api.post(ENDPOINT.login, values)).data;
  console.log(res);
  if (res?.data?.token) {
    setUserToken(res?.data?.token);
    return res;
  } else {
    throw Error("Unable to login");
  }
}

async function logout() {
  deleteUserToken();
}

export const AuthService = {
  login,
  logout,
};
