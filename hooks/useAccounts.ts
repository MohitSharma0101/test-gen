import useSWR from "swr";
import { api, ENDPOINT } from "@/lib/api";
import { LIST_SWR, swrError, swrLoading } from "@/lib/swr";
import { TAccount } from "@/models/Account";

export const useAccounts = () => {
  const swr = useSWR(
    ["accounts"],
    async () => ((await api.get(ENDPOINT.accounts))?.data?.data?.accounts ?? []) as TAccount[],
    LIST_SWR
  );
  return {
    accounts: swr.data ?? [],
    loading: swrLoading(swr),
    error: swrError(swr.error, "Couldn't load accounts"),
    refreshAccounts: () => swr.mutate(),
  };
};
