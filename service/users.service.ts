import { api, ENDPOINT } from "@/lib/api";
import { TUser } from "@/models/User";
import { TApiResponse } from "@/types/TApiResponse";

export async function fetchUsers() {
  return await api.get<TApiResponse<{ users: TUser[] }>>(ENDPOINT.users);
}

export async function deleteUser(id: string) {
  if (!id) return;
  await api.delete(ENDPOINT.users, {
    params: {
      id: id,
    },
  });
}
