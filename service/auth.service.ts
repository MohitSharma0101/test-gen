import { api, ENDPOINT, deleteUserToken } from "@/lib/api";

// The session cookie is set and cleared by the server (httpOnly); the browser
// never handles the token.
async function login(values: { username: string; password: string }) {
  const res = (await api.post(ENDPOINT.login, values)).data;
  if (res?.status !== "success") throw Error("Unable to login");
  return res;
}

async function logout() {
  try {
    await api.post(ENDPOINT.logout);
  } finally {
    // Old sessions were a script-set cookie of the same name
    deleteUserToken();
  }
}

export const AuthService = {
  login,
  logout,
};
